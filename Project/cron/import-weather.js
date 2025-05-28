const cron = require("node-cron");
const { importCSVData } = require("../routes/weather-import");

// Schedule the import to run every day at 1 AM

console.log("Weather data import cronjob scheduled");
