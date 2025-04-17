import pkg from "pg"
import 'dotenv/config'
import fetch from "node-fetch";

const { Pool } = pkg;

const pool = new Pool({
    user: "cap_degraham",
    host: "portaldb.its.pdx.edu",
    database: "bikeped_capstone",
    password: process.env.DB_PW,
    port: 5432, // Default PostgreSQL port
    ssl: {
      rejectUnauthorized: false,
      sslmode: "require",
    },
  });

  function getYesterday() {
    const date = new Date();
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() +1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const ZIP = '97214';
const DATE = getYesterday();
const API_KEY = process.env.API_KEY;
const URL = `https://api.weatherapi.com/v1/history.json?q=${ZIP}&dt=${DATE}&key=${API_KEY}`;

async function insertWeatherData() {
  try {
    const res = await fetch(URL);
    if (!res.ok) {
      throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    const hourly = data.forecast.forecastday[0].hour;

    const client = await pool.connect();
    console.log("Connected to PostgreSQL!");

    // Optional: Create a table if it doesn’t exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS bike_ped.portland_or_weather_data (
        id SERIAL PRIMARY KEY,
        time TIMESTAMP,
        temp_f VARCHAR(10),
        precip_in VARCHAR(10)
      );
    `);

    for (const hour of hourly) {
      const time = hour.time;
      const temp_f = hour.temp_f;
      const precip_in = hour.precip_in;

      await client.query(
        `INSERT INTO bike_ped.portland_or_weather_data (time, temp_f, precip_in) VALUES ($1, $2, $3)`,
        [time, temp_f, precip_in]
      );
    }

    console.log(`Inserted ${hourly.length} rows for ${ZIP} on ${DATE}.`);
    client.release();
    pool.end(); // close the pool once you're done

  } catch (error) {
    console.error("Error during data fetch or insert:", error);
  }
}

insertWeatherData();