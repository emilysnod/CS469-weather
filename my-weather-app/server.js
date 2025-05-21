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
  user: "",
  host: "",
  database: "",
  password: "",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.post("/weather", async (req, res) => {
  const weatherData = req.body;

  try {
    for (const item of weatherData) {
      await pool.query(
        "INSERT INTO bike_ped.weather_api_data (date, city, zipcode, datatype, value, unit, temp_f) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [item.date, item.city, item.zip, item.datatype, item.value, item.unit, item.temp_f]
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
