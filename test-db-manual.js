require("dotenv").config();
const { Client } = require("pg");

// Manually configure connection parameters
const config = {
  user: "cap_abh2",
  password: "JrUNx2x3Q89V818rtu", // Your latest password
  host: "portaldb.its.pdx.edu",
  port: 5432,
  database: "bikeped_capstone",
  ssl: {
    rejectUnauthorized: false,
    sslmode: "require",
  },
};

console.log("Testing connection with manual configuration...");
console.log("Host:", config.host);
console.log("Database:", config.database);
console.log("User:", config.user);
console.log("SSL Mode:", config.ssl ? "Enabled" : "Disabled");

async function testConnection() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log("Connection successful!");

    const result = await client.query("SELECT NOW() as current_time");
    console.log("Current time from database:", result.rows[0].current_time);

    // Test schema access
    try {
      const schemaResult = await client.query(
        "SELECT * FROM bike_ped.weather_data LIMIT 1"
      );
      console.log("Successfully queried bike_ped.weather_data table!");
      console.log("First row:", schemaResult.rows[0]);
    } catch (schemaErr) {
      console.error(
        "Error accessing bike_ped.weather_data:",
        schemaErr.message
      );
    }

    await client.end();
    return true;
  } catch (err) {
    console.error("Connection failed:", err.message);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

testConnection().then((success) => {
  if (!success) {
    console.log("\nTroubleshooting tips:");
    console.log(
      "1. Check DBeaver connection settings and compare with the settings in this file"
    );
    console.log(
      "2. Try adding SSL mode settings (verify-full, verify-ca, or require)"
    );
    console.log(
      "3. Check if the database requires specific connection parameters"
    );
  }
  process.exit(success ? 0 : 1);
});
