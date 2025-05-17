const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

// Database connection with SSL enabled
const pool = new Pool({
  connectionString: process.env.BIKEPED_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

router.get("/weather-data", async (req, res) => {
  const startYear = req.query.startYear;
  const endYear = req.query.endYear;

  if (!startYear || !endYear) {
    return res
      .status(400)
      .json({ error: "Start year and end year are required" });
  }

  // Sample data by taking one reading per day to reduce data points
  // Filter out temperatures above 80°C (176°F) and below -50°C (-58°F)
  const query = `
    WITH valid_temps AS (
      SELECT date, tmp
      FROM bike_ped.ABH_weather_data
      WHERE tmp IS NOT NULL
        AND (tmp / 10.0) <= 176  -- Filter out temps above 80°C (176°F)
        AND (tmp / 10.0) >= -58  -- Filter out temps below -50°C (-58°F)
    ),
    daily_temps AS (
      SELECT 
        date_trunc('day', date) as day,
        AVG(tmp / 10.0) as avg_tmp  -- Convert from deci-fahrenheit to fahrenheit and average
      FROM valid_temps 
      WHERE date >= $1 AND date < $2
      GROUP BY date_trunc('day', date)
      ORDER BY day ASC
    )
    SELECT 
      to_char(day, 'YYYY-MM-DD') as date,
      round(avg_tmp::numeric, 1) as tmp
    FROM daily_temps
  `;

  const startDate = `${startYear}-01-01`;
  const endDate = `${parseInt(endYear) + 1}-01-01`; // Add 1 to include the entire end year

  try {
    console.log("Executing query with dates:", { startDate, endDate });
    const result = await pool.query(query, [startDate, endDate]);
    console.log("Query results count:", result.rows.length);
    console.log("Sample of results:", result.rows.slice(0, 3));

    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

module.exports = router;
