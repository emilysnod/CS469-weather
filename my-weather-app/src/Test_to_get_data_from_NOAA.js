import React, { useState, useEffect } from "react";

const Card = ({ children }) => <div className="border p-4 rounded">{children}</div>;
const CardContent = ({ children }) => <div>{children}</div>;

const NOAA_API_URL = "https://www.ncdc.noaa.gov/cdo-web/api/v2/data";
const TOKEN = "DSMKjBYfHJWySltevdzyvdgKGkdIFmOl"; 
const STATION_ID = "GHCND:USW00013739"; 
const DATA_TYPES = ["TMAX", "TMIN", "PRCP"];
const REPORT_DATE = "2024-03-30"; 

const WeatherReport = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const dataTypeParams = DATA_TYPES.map((type) => `&datatypeid=${type}`).join("");
        const weatherUrl = `${NOAA_API_URL}?datasetid=GHCND&stationid=${STATION_ID}&startdate=${REPORT_DATE}&enddate=${REPORT_DATE}&limit=5${dataTypeParams}`;
        console.log("Fetching weather data from:", weatherUrl);

        const weatherResponse = await fetch(weatherUrl, { headers: { token: TOKEN } });
        if (!weatherResponse.ok) {
          throw new Error("Failed to fetch weather data");
        }
        const data = await weatherResponse.json();
        console.log("Weather Data:", data);
        if (!data.results || data.results.length === 0) {
          throw new Error("No weather data available for the selected date");
        }
        const formattedData = data.results.map((entry) => {
          let convertedValue;
          let unit;
          if (entry.datatype === "PRCP") {
            convertedValue = entry.value / 25.4;
            unit = "in";
          } else {
            const celsius = entry.value / 10;
            convertedValue = (celsius * 9) / 5 + 32;
            unit = "°F";
          }
          let datatypeFormatted = entry.datatype;
          if (datatypeFormatted === "TMAX") {
            datatypeFormatted = "MAXTemp";
          } else if (datatypeFormatted === "TMIN") {
            datatypeFormatted = "MINTemp";
          }
          return {
            date: entry.date.split("T")[0],
            city: "Washington, DC", 
            station: entry.station,
            datatype: datatypeFormatted,
            value: Math.round(convertedValue * 100) / 100,
            unit,
          };
        });

        setWeatherData(formattedData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    };
    fetchWeatherData();
  }, []);

  return (
    <Card className="p-4">
      <CardContent>
        <h2 className="text-xl font-bold">Weather Report for {REPORT_DATE}</h2>
        {error ? (
          <pre className="text-red-500 bg-gray-200 p-2 rounded">Error: {error}</pre>
        ) : weatherData ? (
          <>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherReport;
