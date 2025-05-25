const fs = require("fs");
const { Client } = require("pg");
const readline = require("readline");

const latitude = 45.6387;
const longitude = -122.6615;
const start_date = "2015-05-18";
const end_date = "2020-04-04";
const apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${start_date}&end_date=${end_date}&hourly=temperature_2m,precipitation&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America/Los_Angeles`;

// Helper to prompt the user (with optional hidden input)
function prompt(query, hide = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    //to hide password
    if (hide) {
      process.stdin.on("data", (char) => {
        char = char + "";
        switch (char) {
          case "\n":
          case "\r":
          case "\u0004":
            process.stdin.pause();
            break;
          default:
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(query + "*".repeat(rl.line.length));
            break;
        }
      });
    }
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const fetchData = (apiUrl) => {
  let weather_data = {
    time: [],
    temperature: [],
    precipitation: [],
  };
  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Weather data:", data);
      const jsonFileName = "weather_dataVancouverJS.json";

      // Loop through each hourly data point.
      for (let i = 0; i < data.hourly.time.length; i++) {
        weather_data.time.push(data.hourly.time[i]);
        weather_data.temperature.push(data.hourly.temperature_2m[i]);
        weather_data.precipitation.push(data.hourly.precipitation[i]);
        /*console.log(
          `Date&Time: ${weather_data.time[i]}, Temperature: ${weather_data.temperature[i]} °F, Precipitation: ${weather_data.precipitation[i]} IN`
        );*/
      }
      fs.writeFile(`${jsonFileName}`, JSON.stringify(data, null, 2), (err) => {
        if (err) throw err;
        console.log(`Data saved to ${jsonFileName}`);
      });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
  return weather_data;
};

(async () => {
  const weather_data = fetchData(apiUrl);

  let sendDatatoDataBase = false;
  while (true) {
    let answer = (
      await prompt(
        "Do you wish to send this data to the database? (Y)es/(N)o: "
      )
    ).trim();
    if (answer.startsWith("Y") || answer.startsWith("y")) {
      sendDatatoDataBase = true;
      break;
    } else if (answer.startsWith("N") || answer.startsWith("n")) {
      break;
    } else {
      console.log("Invalid input, please try again.");
    }
  }

  if (sendDatatoDataBase) {
    const username = await prompt("Enter username: ");
    const password = await prompt("Enter password: ", true);
    console.log(); // newline after password

    const client = new Client({
      user: username,
      password: password,
      host: "portaldb.its.pdx.edu",
      database: "bikeped_capstone",
      port: 5432,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      await client.connect();
      console.log("Connected to database");

      const tableName = "bike_ped.Weather_Data_Vancouver_WA";
      const createTableQuery = `
				CREATE TABLE IF NOT EXISTS ${tableName} (
				id SERIAL PRIMARY KEY,
				time TIMESTAMP NOT NULL UNIQUE,
				temperature FLOAT(32),
				precipitation FLOAT(32)
				);
			`;
      await client.query(createTableQuery);
      console.log("Table created (if not existed)");

      let insertText = `
				INSERT INTO ${tableName} (time, temperature, precipitation)
				VALUES ($1, $2, $3)
			`;
      let time;
      let temp;
      let prep;
      for (let i = 0; i < weather_data.time.length; i++) {
        time = weather_data.time[i];
        temp = parseFloat(weather_data.temperature[i]);
        prep = parseFloat(weather_data.precipitation[i]);

        await client.query(insertText, [time, temp, prep]);
      }

      console.log("Data inserted successfully");
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      await client.end();
      console.log("Connection closed");
    }
  } else {
    console.log("Skipped sending data to the database.");
  }

  console.log("\nEnd of program");
  return;
})();

/*
Below are the cititions that Open Meteo requirments for the used of there API. They are in APA format:
Zippenfenig, P. (2023). Open-Meteo.com Weather API [Computer software]. Zenodo. https://doi.org/10.5281/ZENODO.7970649

Hersbach, H., Bell, B., Berrisford, P., Biavati, G., Horányi, A., Muñoz Sabater, J., Nicolas, J., Peubey, C., Radu, R., Rozum, I., Schepers, D., Simmons, A., Soci, C., Dee, D., Thépaut, J-N. (2023). ERA5 hourly data on single levels from 1940 to present [Data set]. ECMWF. https://doi.org/10.24381/cds.adbb2d47

Muñoz Sabater, J. (2019). ERA5-Land hourly data from 2001 to present [Data set]. ECMWF. https://doi.org/10.24381/CDS.E2161BAC

Schimanke S., Ridal M., Le Moigne P., Berggren L., Undén P., Randriamampianina R., Andrea U., Bazile E., Bertelsen A., Brousseau P., Dahlgren P., Edvinsson L., El Said A., Glinton M., Hopsch S., Isaksson L., Mladek R., Olsson E., Verrelle A., Wang Z.Q. (2021). CERRA sub-daily regional reanalysis data for Europe on single levels from 1984 to present [Data set]. ECMWF. https://doi.org/10.24381/CDS.622A565A
*/
