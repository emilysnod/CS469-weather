require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const axios = require("axios");

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
  connectionString: process.env.DATABASE_URL,
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
    const { city } = req.body;

    // Visual Crossing API call
    const apiKey = process.env.VISUAL_CROSSING_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Visual Crossing API key not found in environment variables"
      );
    }

    const encodedCity = encodeURIComponent(city);
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedCity}?unitGroup=us&key=${apiKey}`;

    const response = await axios.get(url);
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

// Historical Weather Routes
app.get("/historical-weather", (req, res) => {
  res.render("historical-weather", {
    message: null,
    weatherData: null,
    searchDate: req.query.date || "",
    location: req.query.location || "Portland,OR",
  });
});

app.post("/historical-weather", async (req, res) => {
  try {
    const { date, location } = req.body;

    // Here you would add your logic to fetch historical weather data
    // For now, just sending back the form data
    res.render("historical-weather", {
      message: {
        type: "success",
        text: "Historical weather data retrieved successfully!",
      },
      weatherData: [], // Replace with actual weather data
      searchDate: date,
      location: location,
    });
  } catch (err) {
    res.render("historical-weather", {
      message: {
        type: "error",
        text: `Error retrieving historical weather data: ${err.message}`,
      },
      weatherData: null,
      searchDate: req.body.date || "",
      location: req.body.location || "Portland,OR",
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

// Start the server
app.listen(appPort, () => {
  console.log(`Server running at http://localhost:${appPort}`);
});
