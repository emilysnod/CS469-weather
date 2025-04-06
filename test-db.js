require("dotenv").config();
const { Pool } = require("pg");

async function testConnection() {
  // Connection parameters
  const connectionString = process.env.DATABASE_URL;
  console.log(
    "Testing connection with:",
    connectionString.replace(/:[^:]*@/, ":****@")
  );

  try {
    // Create a new pool
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Test the connection
    const result = await pool.query("SELECT NOW() as current_time");
    console.log("Connection successful!");
    console.log("Current time from database:", result.rows[0].current_time);

    // Test schema access
    try {
      const schemaResult = await pool.query(
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

    // Close the pool
    await pool.end();

    return true;
  } catch (err) {
    console.error("Connection failed:", err.message);
    if (err.code === "28P01") {
      console.error(
        "This is an authentication error. Double check your username and password."
      );
    } else if (err.code === "3D000") {
      console.error("Database does not exist.");
    }
    return false;
  }
}

// Run the test
testConnection()
  .then((success) => {
    if (!success) {
      console.log("\nTroubleshooting tips:");
      console.log(
        "1. Check if your password has special characters that need URL encoding"
      );
      console.log("2. Make sure you have access to the bike_ped schema");
      console.log(
        "3. Try connecting with a tool like psql or DBeaver with the same credentials"
      );
    }
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
