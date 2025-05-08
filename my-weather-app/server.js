const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "weather_db",
  password: "admin", 
  port: 5432,
});

app.post("/weather", async (req, res) => {
  const weatherData = req.body;

  try {
    for (const item of weatherData) {
      await pool.query(
        "INSERT INTO weather_data (date, city, zipcode, precipitation_in) VALUES ($1, $2, $3, $4)",
        [
          item.date,
          item.city,
          item.zip,
          item.value  
        ]
      );
    }

    res.status(200).send("Weather data saved to DB");
  } catch (err) {
    console.error("Error inserting weather data:", err);
    res.status(500).send("Error saving weather data");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
