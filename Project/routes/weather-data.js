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

async function getDailyTemperatureData(startYear, endYear) {
  if (!startYear || !endYear) {
    throw new Error("Start year and end year are required");
  }

  const startDate = `${startYear}-01-01`;
  const endDate = `${parseInt(endYear) + 1}-01-01`; // Add 1 to include the entire end year

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

  try {
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

router.get("/weather-data", async (req, res) => {
  try {
    const startYear = req.query.startYear;
    const endYear = req.query.endYear;

    const data = await getDailyTemperatureData(startYear, endYear);
    console.log("Query results count:", data.length);
    console.log("Sample of results:", data.slice(0, 3));

    res.json(data);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/daily-temperatures", async (req, res) => {
  try {
    const startYear = req.query.startYear;
    const endYear = req.query.endYear;

    const data = await getDailyTemperatureData(startYear, endYear);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
