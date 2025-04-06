require("dotenv").config();
const { Client } = require("pg");

// Your credentials
const credentials = {
  user: "cap_abh2",
  password: "TSrfu0bAa54CYeg",
  host: "portaldb.its.pdx.edu",
  port: 5432,
  database: "bikeped_capstone",
};

// Different connection configurations to try
const connectionConfigs = [
  {
    name: "SSL with sslmode=require",
    config: {
      ...credentials,
      ssl: {
        rejectUnauthorized: false,
        sslmode: "require",
      },
    },
  },
  {
    name: "Plain SSL enabled",
    config: {
      ...credentials,
      ssl: true,
    },
  },
  {
    name: "SSL enabled with verify-ca",
    config: {
      ...credentials,
      ssl: {
        rejectUnauthorized: false,
        sslmode: "verify-ca",
      },
    },
  },
  {
    name: "SSL enabled with prefer",
    config: {
      ...credentials,
      ssl: {
        rejectUnauthorized: false,
        sslmode: "prefer",
      },
    },
  },
  {
    name: "Connection string with SSL",
    config: {
      connectionString: `postgresql://${credentials.user}:${encodeURIComponent(
        credentials.password
      )}@${credentials.host}:${credentials.port}/${
        credentials.database
      }?sslmode=require`,
      ssl: {
        rejectUnauthorized: false,
      },
    },
  },
];

// Test each configuration
async function testAllConfigurations() {
  console.log("Starting comprehensive connection tests...\n");

  for (const [index, connectionConfig] of connectionConfigs.entries()) {
    console.log(
      `\n[${index + 1}/${connectionConfigs.length}] Testing: ${
        connectionConfig.name
      }`
    );

    const client = new Client(connectionConfig.config);

    try {
      await client.connect();
      console.log("✅ CONNECTION SUCCESSFUL!");

      // Test a simple query
      const result = await client.query("SELECT NOW() as current_time");
      console.log("Query result:", result.rows[0].current_time);

      // Test schema access if connection works
      try {
        const schemaResult = await client.query(
          "SELECT COUNT(*) FROM bike_ped.weather_data"
        );
        console.log("✅ Successfully queried bike_ped.weather_data table!");
        console.log(`   Table has ${schemaResult.rows[0].count} rows`);
      } catch (schemaErr) {
        console.error(
          "❌ Error accessing bike_ped.weather_data:",
          schemaErr.message
        );
      }

      await client.end();

      // If we get here, we've found a working configuration
      console.log("\n✅✅✅ FOUND WORKING CONFIGURATION! ✅✅✅");
      console.log("Use these settings in your application:");
      console.log(JSON.stringify(connectionConfig.config, null, 2));

      // Return the working configuration
      return {
        success: true,
        workingConfig: connectionConfig,
      };
    } catch (err) {
      console.error(`❌ Connection failed: ${err.message}`);
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // If we get here, none of the configurations worked
  console.log(
    "\n❌ None of the configurations worked. Additional troubleshooting needed."
  );
  return { success: false };
}

// Run the tests
testAllConfigurations()
  .then((result) => {
    if (!result.success) {
      console.log("\nTroubleshooting tips:");
      console.log("1. Check your network (VPN might be required)");
      console.log("2. Verify the exact username and password from DBeaver");
      console.log(
        "3. The database might restrict access based on connection method"
      );
      console.log(
        "4. Check with your database administrator for specific connection requirements"
      );
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
