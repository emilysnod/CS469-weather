import React, { useState } from "react";

const App = () => {
  const [zip, setZip] = useState("97222");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");

  const fetchWeather = async (zip) => {
    const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${zip}&days=1`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Weather API error:", errorData);
        throw new Error("Failed to fetch weather data.");
      }

      const data = await response.json();
      console.log("Weather data:", data);

      setWeather({
        city: data.location.name,
        state: data.location.region,
        temp: data.current.temp_f,
        precip: data.forecast.forecastday[0].day.totalprecip_in,
        time: data.current.last_updated,
      });
            setError("");
    } catch (error) {
      console.error("Fetch failed:", error);
      setError("Failed to fetch weather data.");
      setWeather(null);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Weather Lookup</h1>
      <input
        type="text"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="Enter ZIP Code"
      />
      <button onClick={() => fetchWeather(zip)}>Get Weather</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {weather && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>City:</strong> {weather.city}</p>
          <p><strong>State:</strong> {weather.state}</p>
          <p><strong>Temperature:</strong> {weather.temp} °F</p>
          <p><strong>Precipitation:</strong> {weather.precip} in</p>
          <p><strong>Data Time:</strong> {weather.time}</p>
        </div>
      )}
    </div>
  );
};

export default App;
