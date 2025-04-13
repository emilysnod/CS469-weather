import React, { useState, useEffect } from "react";

const Card = ({ children }) => <div className="border p-4 rounded">{children}</div>;
const CardContent = ({ children }) => <div>{children}</div>;

const NOAA_API_URL = "https://www.ncdc.noaa.gov/cdo-web/api/v2/data";
const TOKEN = "DSMKjBYfHJWySltevdzyvdgKGkdIFmOl";
const ZIP_CODE = "20002"; 
const DATA_TYPES = ["TMAX", "TMIN", "PRCP"];
const REPORT_DATE = "2022-03-30";

const WeatherReport = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const dataTypeParams = DATA_TYPES.map((type) => `&datatypeid=${type}`).join("");
        const weatherUrl = `${NOAA_API_URL}?datasetid=GHCND&locationid=ZIP:${ZIP_CODE}&startdate=${REPORT_DATE}&enddate=${REPORT_DATE}&limit=100${dataTypeParams}`;
        console.log("Fetching weather data from:", weatherUrl);

        const response = await fetch(weatherUrl, {
          headers: { token: TOKEN },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();
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
            zip: ZIP_CODE,
            datatype: datatypeFormatted,
            value: Math.round(convertedValue * 100) / 100,
            unit,
          };
        });

        setWeatherData(formattedData);
        await fetch("http://localhost:3001/weather", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData),
        });
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
        <h2 className="text-xl font-bold">Weather Report for ZIP {ZIP_CODE} on {REPORT_DATE}</h2>
        {error ? (
          <pre className="text-red-500 bg-gray-200 p-2 rounded">Error: {error}</pre>
        ) : weatherData ? (
          <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(weatherData, null, 2)}</pre>
        ) : (
          <p>Loading...</p>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherReport;
