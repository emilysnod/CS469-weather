const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/database");
const path = require("path");

// Route to display the form to add weather data
router.get("/add-weather", (req, res) => {
  res.render("add-weather", {
    message: null,
    data: null,
  });
});

// Route to handle the form submission
router.post("/add-weather", async (req, res) => {
  try {
    // Get values from the form
    const {
      station_id,
      temp,
      precip,
      w_speed,
      w_direction,
      visibility,
      timestamp,
    } = req.body;

    const query = `
      INSERT INTO bike_ped.weather_data
      (station_id, record_time, "temp", precip, w_speed, w_direction, visibility, "timestamp")
      VALUES($1, NOW(), $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      station_id,
      temp,
      precip,
      w_speed,
      w_direction,
      visibility,
      timestamp,
    ]);

    res.render("add-weather", {
      message: {
        type: "success",
        text: "Weather data added successfully!",
      },
      data: req.body,
    });
  } catch (err) {
    console.error("Error executing query", err.stack);
    res.render("add-weather", {
      message: {
        type: "error",
        text: `Error adding weather data: ${err.message}`,
      },
      data: req.body,
    });
  }
});

// NOAA CSV Import Routes
router.get("/import-csv", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "import-csv.html"));
});

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
    const fieldNames = columns.map((col) => col.toLowerCase());
    const placeholders = columns.map((_, index) => `$${index + 1}`);

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
      (station_id, latitude)
      VALUES ($1, $2)
      ON CONFLICT (station_id)
      DO NOTHING
    `;

    let rowsImported = 0;
    // If lineLimit is 0, import all rows (except header)
    const maxRows =
      lineLimit === 0 ? rows.length - 1 : Math.min(lineLimit, rows.length - 1);

    // Process each row (skip header)
    for (let i = 1; i <= maxRows; i++) {
      const row = rows[i];
      const values = columns.map((col) => {
        const value = row[headers.indexOf(col)];
        if (col === "DATE") {
          // NOAA date format is ISO 8601: "YYYY-MM-DDTHH:mm:ss"
          // Remove quotes if present and convert to PostgreSQL timestamp format
          return value.replace(/^"|"$/g, "").replace("T", " ");
        }
        // Try to parse numbers, but keep as string if not a valid number
        const numValue = parseFloat(value);
        return isNaN(numValue) ? value : numValue;
      });

      await pool.query(insertQuery, values);
      rowsImported++;

      // If this is the first row, also update the station information
      if (i === 1) {
        const stationValues = [
          values[headers.indexOf("STATION")],
          values[headers.indexOf("LATITUDE")],
        ];
        console.log(stationValues);
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
