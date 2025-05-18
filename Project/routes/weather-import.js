const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/database");
const path = require("path");

// Route to display the form to add weather data

// NOAA CSV Import Routes
router.get("/import-csv", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "import-csv.html"));
});

// Function to get location details from coordinates using Nominatim
async function getLocationFromCoordinates(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&layer=address`,
      {
        headers: {
          "User-Agent": "WeatherStationImport/1.0",
        },
      }
    );

    const data = response.data;
    console.log("Full Nominatim response:", JSON.stringify(data, null, 2));
    console.log("Address details:", JSON.stringify(data.address, null, 2));

    const address = data.address;
    const isoCode = address["ISO3166-2-lvl4"]
      ? address["ISO3166-2-lvl4"].split("-")[1]
      : null;

    return {
      city: address.city || address.town || address.village || null,
      state: isoCode || address.state_code || null,
      country: data.address.country_code
        ? data.address.country_code.toUpperCase()
        : null,
    };
  } catch (error) {
    console.error("Error in reverse geocoding:", error.message);
    return { city: null, state: null, country: null };
  }
}

router.post("/api/import-csv", async (req, res) => {
  try {
    const { csvUrl, columns, lineLimit } = req.body;

    // Fetch the CSV file
    const response = await axios.get(csvUrl);
    const csvData = response.data;

    // Parse CSV data
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let inQuotes = false;

    for (let i = 0; i < csvData.length; i++) {
      const char = csvData[i];

      if (char === '"') {
        if (inQuotes && i + 1 < csvData.length && csvData[i + 1] === '"') {
          // Handle escaped quote
          currentCell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // End of cell
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\n" && !inQuotes) {
        // End of row
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }

    // Add the last row if there's any remaining data
    if (currentCell.trim() || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
    }

    const headers = rows[0];

    // Always include NAME in the columns if it exists in the CSV
    if (headers.includes("NAME") && !columns.includes("NAME")) {
      columns.push("NAME");
    }
    // Always include LATITUDE and LONGITUDE if they exist in the CSV
    if (headers.includes("LATITUDE") && !columns.includes("LATITUDE")) {
      columns.push("LATITUDE");
    }
    if (headers.includes("LONGITUDE") && !columns.includes("LONGITUDE")) {
      columns.push("LONGITUDE");
    }
    // Always include AA1 if it exists in the CSV
    if (headers.includes("AA1") && !columns.includes("AA1")) {
      columns.push("AA1");
    }

    // Validate that all requested columns exist in the CSV
    const missingColumns = columns.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(
        `The following columns were not found in the CSV: ${missingColumns.join(
          ", "
        )}`
      );
    }

    // Build the insert query dynamically based on selected columns
    // Exclude NAME, LATITUDE, and LONGITUDE from weather_data table
    const fieldNames = columns
      .filter((col) => !["NAME", "LATITUDE", "LONGITUDE"].includes(col))
      .map((col) => (col === "AA1" ? "precip" : col.toLowerCase()));
    const placeholders = fieldNames.map((_, index) => `$${index + 1}`);

    const insertQuery = `
      INSERT INTO bike_ped.ABH_weather_data 
      (${fieldNames.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (station, date) 
      DO UPDATE SET 
        ${fieldNames
          .map((field, index) => `${field} = EXCLUDED.${field}`)
          .join(", ")}
    `;

    const stationInsertQuery = `
      INSERT INTO bike_ped.ABH_weather_stations 
      (station_id, latitude, longitude, station_name, city, state, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (station_id)
      DO UPDATE SET 
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        station_name = EXCLUDED.station_name,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country
    `;

    let rowsImported = 0;
    // If lineLimit is 0, import all rows (except header)
    const maxRows =
      lineLimit === 0 ? rows.length - 1 : Math.min(lineLimit, rows.length - 1);

    // Process each row (skip header)
    for (let i = 1; i <= maxRows; i++) {
      const row = rows[i];
      const values = columns
        .filter((col) => !["NAME", "LATITUDE", "LONGITUDE"].includes(col))
        .map((col) => {
          const value = row[headers.indexOf(col)];
          if (col === "DATE") {
            // NOAA date format is ISO 8601: "YYYY-MM-DDTHH:mm:ss"
            // Remove quotes if present and convert to PostgreSQL timestamp format
            return value.replace(/^"|"$/g, "").replace("T", " ");
          }
          if (col === "AA1") {
            // Store raw AA1 value
            return value;
          }
          // Try to parse numbers, but keep as string if not a valid number
          const numValue = parseFloat(value);
          return isNaN(numValue) ? value : numValue;
        });

      await pool.query(insertQuery, values);
      rowsImported++;

      // If this is the first row, also update the station information
      if (i === 1) {
        const latitude = parseFloat(row[headers.indexOf("LATITUDE")]);
        const longitude = parseFloat(row[headers.indexOf("LONGITUDE")]);

        // Get location details from coordinates
        const locationDetails = await getLocationFromCoordinates(
          latitude,
          longitude
        );
        console.log("Location details from coordinates:", locationDetails);

        const stationValues = [
          values[headers.indexOf("STATION")],
          latitude,
          longitude,
          row[headers.indexOf("NAME")], // Keep original station name
          locationDetails.city,
          locationDetails.state,
          locationDetails.country,
        ];

        console.log("Final station values:", stationValues);
        await pool.query(stationInsertQuery, stationValues);
      }
    }

    res.json({ success: true, rowsImported });
  } catch (error) {
    console.error("Error importing CSV:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
