import fs from 'fs';
import fetch from 'node-fetch';

const API_URL = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/portland%20oregon?unitGroup=us&key=ATMF3Y8MWR5XUA3HPNQFP7U5Q&contentType=json";

fetch(API_URL)
  .then(response => response.json()) 
  .then(data => {
    fs.writeFileSync("VCdata.JSON", JSON.stringify(data, null, 2));
    console.log("Pulled data successfully");
  })
  .catch(err => {
    console.error("Error fetching weather data:", err);
  });
