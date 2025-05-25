const express = require("express");
const router = express.Router();
const axios = require("axios");
const {
  calculateDistance,
  calculateBoundingBox,
} = require("../utils/geo-utils");
const pool = require("../config/database");
const fs = require("fs");
const { parse } = require("csv-parse");

// Route to display the form to find weather stations
router.get("/find-weather-stations", (req, res) => {
  res.render("find-weather-stations", { stations: null, message: null });
});

// Route to handle the form submission
router.post("/find-weather-stations", async (req, res) => {
  const city = req.body.city;
  try {
    // Geocode city using OpenStreetMap
    const geoResp = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: { q: city, format: "json", limit: 1 },
      }
    );
    if (!geoResp.data.length) throw new Error("Could not geocode city.");
    const { lat, lon } = geoResp.data[0];

    // Calculate bounding box
    const bbox = calculateBoundingBox(lat, lon, 10);

    // Query NOAA API for stations within bounding box
    const noaaToken = process.env.NOAA_API_TOKEN;
    const noaaResp = await axios.get(
      "https://www.ncei.noaa.gov/cdo-web/api/v2/stations",
      {
        params: {
          extent: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
          limit: 10,
          sortfield: "datacoverage",
          sortorder: "asc",
        },
        headers: {
          token: noaaToken,
        },
      }
    );

    const stations = noaaResp.data.results.map((station) => ({
      name: station.name,
      location: `${station.latitude}, ${station.longitude}`,
      hasHourlyData: station.datacoverage > 0.9,
    }));

    res.render("find-weather-stations", { stations, message: null });
  } catch (err) {
    console.error(err);
    res.render("find-weather-stations", {
      stations: null,
      message: "Could not find stations. Please check your city and try again.",
    });
  }
});

// Route to display the NOAA stations page
router.get("/noaa-stations", (req, res) => {
  res.render("index");
});

// Route to display station details
router.get("/station-details", async (req, res) => {
  const { usaf, wban } = req.query;

  try {
    // Read the ISD history file to find the station
    const isdHistoryFile = fs.readFileSync("isd-history.csv", "utf-8");
    const records = parse(isdHistoryFile, {
      columns: true,
      skip_empty_lines: true,
    });

    // Find the matching station
    const station = records.find(
      (record) => record.USAF === usaf && record.WBAN === wban
    );

    if (station) {
      res.render("station-details", { station, error: null });
    } else {
      res.render("station-details", {
        station: null,
        error: "Station not found",
      });
    }
  } catch (err) {
    console.error("Error finding station details:", err);
    res.render("station-details", {
      station: null,
      error: "Error retrieving station details",
    });
  }
});

// Route to find closest stations
router.post("/find-closest-stations", async (req, res) => {
  const city = req.body.city;
  const radius = parseFloat(req.body.radius) || 10; // Default to 10 miles if not specified

  try {
    // 1. Geocode the city using OpenStreetMap
    const geoResponse = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: city,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "Weather Station Finder",
        },
      }
    );

    if (!geoResponse.data.length) {
      throw new Error("City not found");
    }

    const { lat, lon } = geoResponse.data[0];

    // Calculate bounding box based on radius
    const bbox = calculateBoundingBox(lat, lon, radius);

    // 2. Read and process the ISD history file
    const stations = [];
    const fileStream = fs
      .createReadStream("isd-history.csv")
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
        })
      )
      .on("data", (row) => {
        if (
          row.LAT &&
          row.LON &&
          row.USAF !== "999999" &&
          row.WBAN !== "99999"
        ) {
          const stationLat = parseFloat(row.LAT);
          const stationLon = parseFloat(row.LON);

          // Check if station is within bounding box
          if (
            stationLat > bbox.north ||
            stationLat < bbox.south ||
            stationLon > bbox.east ||
            stationLon < bbox.west
          ) {
            return; // Skip stations outside bounding box
          }

          // Calculate distance to this station
          const distance = calculateDistance(
            parseFloat(lat),
            parseFloat(lon),
            stationLat,
            stationLon
          );

          stations.push({
            ...row,
            distance,
          });
        }
      })
      .on("end", () => {
        // Sort by distance and get top 10
        stations.sort((a, b) => a.distance - b.distance);
        const closest = stations.slice(0, 10);

        res.render("closest-stations", {
          stations: closest,
          city,
          radius,
          error: null,
        });
      });
  } catch (err) {
    console.error("Error finding stations:", err);
    res.render("closest-stations", {
      stations: null,
      city,
      radius,
      error: `Error finding stations: ${err.message}`,
    });
  }
});

module.exports = router;
