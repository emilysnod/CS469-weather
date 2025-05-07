require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const axios = require("axios");
const dayjs = require("dayjs");
const weatherDataRouter = require("./routes/weather-data");
const fs = require("fs");
const { parse } = require("csv-parse");

// Initialize Express app
const app = express();
const appPort = process.env.PORT || 3000;

// Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Set up templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Override Node's strict SSL handling before creating the pool
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Database connection with SSL enabled
const pool = new Pool({
  connectionString: process.env.BIKEPED_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.stack);
  } else {
    console.log("Database connected successfully:", res.rows[0]);
  }
});

// Create cities table if it doesn't exist
async function initializeDatabase() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bike_ped.cities (
        id SERIAL PRIMARY KEY,
        city_name VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        country VARCHAR(100) NOT NULL,
        latitude DECIMAL(10, 6) NOT NULL,
        longitude DECIMAL(10, 6) NOT NULL,
        timezone VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(createTableQuery);
    console.log("Cities table initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

// Initialize database when app starts
initializeDatabase();

// Create NOAA weather data table if it doesn't exist
async function initializeNoaaDatabase() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bike_ped.noaa_weather_data (
        id SERIAL PRIMARY KEY,
        station VARCHAR(50),
        date TIMESTAMP,
        latitude DECIMAL(10, 6),
        longitude DECIMAL(10, 6),
        elevation DECIMAL(10, 2),
        name VARCHAR(100),
        tmp DECIMAL(7, 2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await pool.query(createTableQuery);
    console.log("NOAA weather data table initialized successfully");
  } catch (err) {
    console.error("Error initializing NOAA database:", err);
  }
}

// Initialize NOAA database when app starts
initializeNoaaDatabase();

// Load and parse the ISD station history file
let stationMappings = {};
try {
  const isdHistoryFile = fs.readFileSync("isd-history.csv", "utf-8");
  const records = parse(isdHistoryFile, {
    columns: true,
    skip_empty_lines: true,
  });

  // Create mappings from WBAN to WMO ID (USAF)
  records.forEach((record) => {
    if (record.WBAN !== "99999" && record.USAF !== "999999") {
      stationMappings[record.WBAN] = {
        wmoId: record.USAF,
        icao: record.ICAO,
        name: record.STATION_NAME,
      };
    }
  });
  console.log("Loaded station mappings from ISD history file");
} catch (err) {
  console.error("Error loading ISD history file:", err);
  stationMappings = {};
}

// Routes
app.get("/", (req, res) => {
  res.render("index", { message: null });
});

// Add City Routes
app.get("/add-city", (req, res) => {
  res.render("add-city", {
    message: null,
    cityData: null,
  });
});

app.post("/add-city", async (req, res) => {
  try {
    debugger; // Break point 1: When route is hit
    const { city } = req.body;

    // Visual Crossing API call
    const apiKey = process.env.VISUAL_CROSSING_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Visual Crossing API key not found in environment variables"
      );
    }

    debugger; // Break point 2: Before API call
    const encodedCity = encodeURIComponent(city);
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedCity}?unitGroup=us&key=${apiKey}`;

    const response = await axios.get(url);
    debugger; // Break point 3: After API response
    const locationData = response.data;

    // Parse all parts from resolvedAddress
    const resolvedParts = locationData.resolvedAddress
      .split(",")
      .map((part) => part.trim());

    // Extract location information
    // For addresses like "Portland, OR, United States"
    const cityData = {
      city_name: resolvedParts[0], // First part is always the city
      state: resolvedParts.length > 1 ? resolvedParts[1] : null, // Second part is state/region if it exists
      country: resolvedParts[resolvedParts.length - 1], // Last part is typically the country
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timezone: locationData.timezone,
    };

    console.log("Resolved address parts:", resolvedParts);
    console.log("About to insert city data:", cityData);

    // Insert the city into the database
    const insertQuery = `
      INSERT INTO bike_ped.cities 
      (city_name, state, country, latitude, longitude, timezone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      cityData.city_name,
      cityData.state,
      cityData.country,
      cityData.latitude,
      cityData.longitude,
      cityData.timezone,
    ]);

    console.log("Database insert result:", result.rows[0]);

    // For display purposes, we'll still show the resolved address in the UI
    const displayData = {
      ...result.rows[0],
      resolvedAddress: locationData.resolvedAddress,
    };

    // Send back the data
    res.render("add-city", {
      message: {
        type: "success",
        text: "City added successfully to the database!",
      },
      cityData: displayData,
    });
  } catch (err) {
    console.error("Error adding city:", err);
    res.render("add-city", {
      message: {
        type: "error",
        text: `Error adding city: ${err.message}`,
      },
      cityData: null,
    });
  }
});

// Bulk Weather Import Routes
app.get("/bulk-weather-import", (req, res) => {
  res.render("bulk-weather-import", {
    message: null,
    importData: null,
    location: req.query.location || "Portland,OR",
    date: req.query.date || "",
    weatherData: null,
  });
});

app.post("/bulk-weather-import", async (req, res) => {
  try {
    const { location, date } = req.body;

    // Visual Crossing API call
    const apiKey = process.env.VISUAL_CROSSING_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Visual Crossing API key not found in environment variables"
      );
    }

    const encodedLocation = encodeURIComponent(location);
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedLocation}/${date}?unitGroup=us&key=${apiKey}`;

    const response = await axios.get(url);
    const weatherData = response.data;

    // Insert each hour's weather data into the database
    const insertQuery = `
      INSERT INTO bike_ped.weather_data
      (record_time, "temp", precip, "timestamp")
      VALUES (NOW(), $1, $2, $3)
    `;

    // Process each hour's data
    for (const hour of weatherData.days[0].hours) {
      const timestamp = `${date} ${hour.datetime}`; // Combine date and time

      await pool.query(insertQuery, [hour.temp, hour.precip, timestamp]);
    }

    res.render("bulk-weather-import", {
      message: {
        type: "success",
        text: "Weather data successfully imported and saved to database!",
      },
      importData: req.body,
      location: location || "Portland,OR",
      date: date || "",
      weatherData: weatherData,
    });
  } catch (err) {
    console.error("Error processing weather data:", err);
    res.render("bulk-weather-import", {
      message: {
        type: "error",
        text: `Error importing weather data: ${err.message}`,
      },
      importData: req.body,
      location: req.body.location || "Portland,OR",
      date: req.body.date || "",
      weatherData: null,
    });
  }
});

// Route to display the form to add weather data
app.get("/add-weather", (req, res) => {
  res.render("add-weather", {
    message: null,
    data: null,
  });
});

// Route to handle the form submission
app.post("/add-weather", async (req, res) => {
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

// GET route to show the form
app.get("/find-stations", (req, res) => {
  res.render("find-stations", { stations: null, city: "", error: null });
});

// POST route to process the form
app.post("/find-stations", async (req, res) => {
  const city = req.body.city;
  try {
    // 2. Query NOAA API for closest stations
    const noaaToken = process.env.NOAA_API_TOKEN;
    const south = 45.36;
    const west = -122.825;
    const north = 45.65;
    const east = -122.525;

    // Use the params object in the axios request
    // const noaaResp = await axios.get(
    //   "https://www.ncei.noaa.gov/cdo-web/api/v2/stations",
    //   {
    //     params: {
    //       extent: `${south},${west},${north},${east}`,
    //       limit: 10,
    //     },
    //     headers: {
    //       token: noaaToken,
    //     },
    //   }
    // );

    const bbox = calculateBoundingBox(lat, lon, 10);
    console.log(bbox);
    // Query NOAA API for stations within bounding box
    const noaaResp = await axios.get(
      "https://www.ncei.noaa.gov/cdo-web/api/v2/stations",
      {
        params: {
          extent: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
          limit: 10,
          sortfield: "datacoverage",
          sortorder: "asc",
        },
        headers: {
          token: noaaToken,
        },
      }
    );

    const stations = noaaResp.data.results || [];
    res.render("find-stations", { stations, city, error: null });
  } catch (err) {
    console.error(err);
    res.render("find-stations", {
      stations: null,
      city,
      error: "Could not find stations. Please check your city and try again.",
    });
  }
});

// GET route to show the form
app.get("/week-ago-noon", (req, res) => {
  res.render("six-hour-noaa", {
    city: "",
    weather: null,
    error: null,
    stationName: "",
  });
});

// POST route to process the form

// Route to display the form to find weather stations
app.get("/find-weather-stations", (req, res) => {
  res.render("find-weather-stations", { stations: null, message: null });
});

// Function to calculate bounding box
function calculateBoundingBox(lat, lon, miles) {
  const milesToDegrees = miles / 69; // Approximate conversion factor
  return {
    north: lat + milesToDegrees,
    south: lat - milesToDegrees,
    east: lon + milesToDegrees,
    west: lon - milesToDegrees,
  };
}

// Route to handle the form submission
app.post("/find-weather-stations", async (req, res) => {
  const city = req.body.city;
  console.log(city);
  try {
    // Geocode city using a free geocoding service (e.g., Nominatim OpenStreetMap)
    const geoResp = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: { q: city, format: "json", limit: 1 },
      }
    );
    if (!geoResp.data.length) throw new Error("Could not geocode city.");
    const { lat, lon } = geoResp.data[0];

    // Calculate bounding box
    const bbox = calculateBoundingBox(lat, lon, 10);
    console.log(bbox);
    // Query NOAA API for stations within bounding box
    const noaaToken = process.env.NOAA_API_TOKEN;
    const noaaResp = await axios.get(
      "https://www.ncei.noaa.gov/cdo-web/api/v2/stations",
      {
        params: {
          extent: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
          limit: 10,
          sortfield: "datacoverage",
          sortorder: "asc",
        },
        headers: {
          token: noaaToken,
        },
      }
    );

    const stations = noaaResp.data.results.map((station) => ({
      name: station.name,
      location: `${station.latitude}, ${station.longitude}`,
      hasHourlyData: station.datacoverage > 0.9, // Example condition for hourly data
    }));

    res.render("find-weather-stations", { stations, message: null });
  } catch (err) {
    console.error(err);
    res.render("find-weather-stations", {
      stations: null,
      message: "Could not find stations. Please check your city and try again.",
    });
  }
});

// Route to display the NOAA stations page
app.get("/noaa-stations", (req, res) => {
  res.render("index"); // Change 'index' to 'noaa-stations' if you rename the file
});

// NOAA CSV Import Routes
app.get("/import-csv", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "import-csv.html"));
});

app.post("/api/import-csv", async (req, res) => {
  try {
    const { csvUrl, columns, lineLimit } = req.body;

    // Fetch the CSV file
    const response = await axios.get(csvUrl);
    const csvData = response.data;

    // Parse CSV data using a more robust approach
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
      INSERT INTO bike_ped.noaa_weather_data 
      (${fieldNames.join(", ")})
      VALUES (${placeholders.join(", ")})
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
    }

    res.json({ success: true, rowsImported });
  } catch (error) {
    console.error("Error importing CSV:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes
app.use("/api", weatherDataRouter);

// Serve the import page
app.get("/import", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "import-csv.html"));
});

// Serve the visualization page
app.get("/visualize", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "visualize-data.html"));
});

// Connection tester routes
app.get("/connection-tester", async (req, res) => {
  try {
    // Mask sensitive information from connection string
    const connectionString = process.env.BIKEPED_DATABASE_URL || "";
    const maskedConnection = connectionString.replace(/:([^:@]+)@/, ":****@");
    console.log(connectionString);

    res.render("connection-tester", {
      connectionInfo: maskedConnection,
      message: null,
      queryResult: null,
    });
  } catch (err) {
    res.render("connection-tester", {
      connectionInfo: "Error retrieving connection info",
      message: {
        type: "error",
        text: err.message,
      },
      queryResult: null,
    });
  }
});

app.post("/connection-tester", async (req, res) => {
  const testType = req.body.test;
  const connectionString = process.env.BIKEPED_DATABASE_URL || "";
  const maskedConnection = connectionString.replace(/:([^:@]+)@/, ":****@");

  try {
    let queryResult;
    let query;

    if (testType === "simple") {
      query = "SELECT NOW() as current_time";
    } else if (testType === "tables") {
      query = `
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'bike_ped' 
        ORDER BY table_schema, table_name
      `;
    }

    const result = await pool.query(query);
    queryResult = result.rows;

    res.render("connection-tester", {
      connectionInfo: maskedConnection,
      message: {
        type: "success",
        text: "Database connection successful!",
      },
      queryResult: queryResult,
    });
  } catch (err) {
    res.render("connection-tester", {
      connectionInfo: maskedConnection,
      message: {
        type: "error",
        text: `Connection error: ${err.message}`,
      },
      queryResult: null,
    });
  }
});

// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// NOAA Station Finder Routes
app.get("/find-noaa-stations", (req, res) => {
  res.render("find-noaa-stations", {
    stations: null,
    city: "",
    error: null,
  });
});

app.post("/find-noaa-stations", async (req, res) => {
  const city = req.body.city;
  try {
    // 1. Geocode the city using OpenStreetMap
    const geoResponse = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: city,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "BikePed Weather Station Finder",
        },
      }
    );

    if (!geoResponse.data.length) {
      throw new Error("City not found");
    }

    const { lat, lon } = geoResponse.data[0];

    // 2. Calculate bounding box (20km radius)
    const radius = 20; // km
    const latDeg = radius / 111.32; // approx degrees per km
    const lonDeg = radius / (111.32 * Math.cos((lat * Math.PI) / 180));

    const bbox = {
      north: parseFloat(lat) + latDeg,
      south: parseFloat(lat) - latDeg,
      east: parseFloat(lon) + lonDeg,
      west: parseFloat(lon) - lonDeg,
    };

    // 3. Query NOAA API for stations
    const noaaResponse = await axios.get(
      "https://www.ncei.noaa.gov/cdo-web/api/v2/stations",
      {
        params: {
          extent: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
          limit: 25,
          datasetid: "GHCND", // Global Historical Climatology Network Daily
          sortfield: "datacoverage",
          sortorder: "desc",
        },
        headers: {
          token: process.env.NOAA_API_TOKEN,
        },
      }
    );

    let stations = noaaResponse.data.results || [];

    // 4. Fetch additional metadata for each station
    const stationsWithMetadata = await Promise.all(
      stations.map(async (station) => {
        try {
          // Extract WBAN from GHCND:USW00024229 format
          const wban = station.id.split("USW00")[1];

          // Look up station info from our mappings
          const stationInfo = stationMappings[wban] || {};
          const fullWmoId = stationInfo.wmoId
            ? `${stationInfo.wmoId}${wban.padStart(6, "0")}`
            : "N/A";

          console.log(`Processing station: ${station.name}`);
          console.log(
            `WBAN: ${wban}, ICAO: ${
              stationInfo.icao || "N/A"
            }, Full WMO ID: ${fullWmoId}`
          );

          return {
            ...station,
            distance: calculateDistance(
              parseFloat(lat),
              parseFloat(lon),
              station.latitude,
              station.longitude
            ),
            wban: wban || "N/A",
            icao: stationInfo.icao || "N/A",
            wmoId: fullWmoId,
          };
        } catch (err) {
          console.error(`Error processing station ${station.id}:`, err.message);
          return {
            ...station,
            distance: calculateDistance(
              parseFloat(lat),
              parseFloat(lon),
              station.latitude,
              station.longitude
            ),
            wban: station.id.split("USW00")[1] || "N/A",
            icao: "N/A",
            wmoId: "N/A",
          };
        }
      })
    );

    // 5. Sort by distance
    stationsWithMetadata.sort((a, b) => a.distance - b.distance);

    res.render("find-noaa-stations", {
      stations: stationsWithMetadata,
      city,
      error: null,
    });
  } catch (err) {
    console.error("Error finding stations:", err);
    res.render("find-noaa-stations", {
      stations: null,
      city,
      error: `Error finding stations: ${err.message}`,
    });
  }
});

// Add a route for ID conversion
app.get("/convert-station-id", (req, res) => {
  res.render("convert-station-id", {
    result: null,
    error: null,
  });
});

app.post("/convert-station-id", (req, res) => {
  const { id, type } = req.body;
  let result = null;
  let error = null;

  try {
    if (type === "ghcnd") {
      // Converting from GHCND to WMO
      result = {
        original: id,
        originalType: "GHCND ID",
        converted: ghcndToWmo(id),
        convertedType: "WMO ID",
      };
      if (!result.converted) {
        error = "Could not find corresponding WMO ID";
      }
    } else if (type === "wmo") {
      // Converting from WMO to GHCND
      result = {
        original: id,
        originalType: "WMO ID",
        converted: wmoToGhcnd(id),
        convertedType: "GHCND ID",
      };
      if (!result.converted) {
        error = "Could not convert to GHCND ID";
      }
    }
  } catch (err) {
    error = `Error converting ID: ${err.message}`;
  }

  res.render("convert-station-id", { result, error });
});

// Start the server
app.listen(appPort, () => {
  console.log(`Server running at http://localhost:${appPort}`);
  console.log("Debugger can be attached");

  // Log masked database URL on startup
  const maskedUrl = process.env.BIKEPED_DATABASE_URL
    ? process.env.BIKEPED_DATABASE_URL.replace(/:([^:@]+)@/, ":****@")
    : "No BIKEPED_DATABASE_URL set";
  console.log("Using database URL:", maskedUrl);
});

app.post("/find-closest-stations", async (req, res) => {
  const city = req.body.city;
  try {
    // 1. Geocode the city using OpenStreetMap
    const geoResponse = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: city,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "Weather Station Finder",
        },
      }
    );

    if (!geoResponse.data.length) {
      throw new Error("City not found");
    }

    const { lat, lon } = geoResponse.data[0];
    // console.log(`City coordinates: ${lat}, ${lon}`);

    // 2. Read and process the ISD history file
    const stations = [];
    const fileStream = fs
      .createReadStream("isd-history.csv")
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
        })
      )
      .on("data", (row) => {
        if (row.LAT && row.LON) {
          // Calculate distance to this station
          const distance = calculateDistance(
            parseFloat(lat),
            parseFloat(lon),
            parseFloat(row.LAT),
            parseFloat(row.LON)
          );

          stations.push({
            ...row,
            distance,
          });
        }
      })
      .on("end", () => {
        // Sort by distance and get top 10
        stations.sort((a, b) => a.distance - b.distance);
        const closest = stations.slice(0, 10);
        console.log("Closest 10 stations:");
        closest.forEach((station, i) => {
          console.log(
            `${i + 1}. ${station["STATION NAME"]}: ${station.distance.toFixed(
              2
            )}km`
          );
        });

        res.render("closest-stations", {
          stations: closest,
          city,
          error: null,
        });
      });
  } catch (err) {
    console.error("Error finding stations:", err);
    res.render("closest-stations", {
      stations: null,
      city,
      error: `Error finding stations: ${err.message}`,
    });
  }
});
