const pool = require("../config/database");

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

// Create NOAA weather data table if it doesn't exist
async function initializeNoaaDatabase() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bike_ped.ABH_weather_data (
        id SERIAL PRIMARY KEY,
        station VARCHAR(50),
        date TIMESTAMP,
        latitude DECIMAL(10, 6),
        longitude DECIMAL(10, 6),
        elevation DECIMAL(10, 2),
        name VARCHAR(100),
        tmp DECIMAL(7, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(station, date)
      )
    `;

    await pool.query(createTableQuery);
    console.log("NOAA weather data table initialized successfully");

    // Create weather_stations table
    const createStationsTableQuery = `
      CREATE TABLE IF NOT EXISTS bike_ped.ABH_weather_stations (
        id SERIAL PRIMARY KEY,
        station_id VARCHAR(50) UNIQUE,
        latitude DECIMAL(10, 6),
        longitude DECIMAL(10, 6),
        station_name VARCHAR(100),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await pool.query(createStationsTableQuery);
    console.log("Weather stations table initialized successfully");
  } catch (err) {
    console.error("Error initializing NOAA database:", err);
  }
}

// Initialize both databases
async function initializeAllDatabases() {
  await initializeDatabase();
  await initializeNoaaDatabase();
}

module.exports = {
  initializeAllDatabases,
};
