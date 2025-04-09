const fetch = require("node-fetch");
const { Client } = require("pg"); 

// This format is theoretically adaptable to other APIs
const apiKey = "ATMF3Y8MWR5XUA3HPNQFP7U5Q";
const city = "Alexandria";
const state = "VA";
const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city},${state}?unitGroup=us&include=hours&key=${apiKey}&contentType=json`;

const client = new Client({
    user: "",
    host: "",
    database: "",
    password: "",
    port: 5432, 
});

async function insertWeatherData() {
    try {
        await client.connect();
        const res = await fetch(url);
        const data = await res.json();

        for (const day of data.days) { // Cycle through collecting mult days of data
            const date = day.datetime.replace(/-/g, "/");
            for (const hour of day.hours) {
                const time = `${hour.datetime}:00`; // 24-hr
                const precip = hour.precip || 0;
                const temp = hour.temp || 0;

                await client.query(
                    `INSERT INTO Alexandria_VA (date, time, "precip (in)", "temp (F)")
                     VALUES ($1, $2, $3, $4)`,
                    [date, time, precip, temp]
                );
            }
        }

        console.log("Weather data inserted into Alexandria_VA");
    } catch (err) {
        console.error("Error inserting data:", err);
    } finally {
        await client.end();
    }
}

insertWeatherData();
