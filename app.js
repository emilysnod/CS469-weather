require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

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
  // SSL is already in the connection string, don't need additional config
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.stack);
  } else {
    console.log("Database connected successfully:", res.rows[0]);
  }
});

// Routes
app.get("/", (req, res) => {
  res.render("index", { message: null });
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
