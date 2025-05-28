/**
 * @fileoverview Main application entry point for the BikePed Weather Data Management System
 * @requires dotenv
 * @requires express
 * @requires path
 * @requires ./models/database-init
 * @requires ./routes/weather-data
 * @requires ./routes/weather-stations
 * @requires ./routes/weather-import
 */

require("dotenv").config();
const express = require("express");
const path = require("path");
const { initializeAllDatabases } = require("./models/database-init");
const weatherDataRouter = require("./routes/weather-data");
const weatherStationsRouter = require("./routes/weather-stations");
const weatherImportRouter = require("./routes/weather-import");
// const stationConversionRouter = require("./routes/station-conversion");

/**
 * Express application instance
 * @type {import('express').Application}
 */
const app = express();
const appPort = process.env.PORT || 3000;

// Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Set up templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Initialize database
initializeAllDatabases();

/**
 * Home route handler
 * @route GET /
 * @returns {void} Renders the index page
 */
app.get("/", (req, res) => {
  res.render("index", { message: null });
});

// Use route modules
app.use("/api", weatherDataRouter);
app.use("/", weatherStationsRouter);
app.use("/", weatherImportRouter);

/**
 * Import page route handler
 * @route GET /import
 * @returns {void} Serves the import-csv.html page
 */
app.get("/import", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "import-csv.html"));
});

/**
 * Visualization page route handler
 * @route GET /visualize
 * @returns {void} Serves the visualize-data.html page
 */
app.get("/visualize", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "visualize-data.html"));
});

/**
 * Start the Express server
 * @listens {number} appPort - The port number to listen on
 */
app.listen(appPort, () => {
  console.log(`Server running at http://localhost:${appPort}`);
  console.log("Debugger can be attached");

  // Log masked database URL on startup
  const maskedUrl = process.env.BIKEPED_DATABASE_URL
    ? process.env.BIKEPED_DATABASE_URL.replace(/:([^:@]+)@/, ":****@")
    : "No BIKEPED_DATABASE_URL set";
  console.log("Using database URL:", maskedUrl);
});
