const { Pool } = require("pg");
require("dotenv").config();

// Override Node's strict SSL handling before creating the pool
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Database connection with SSL enabled
const pool = new Pool({
  connectionString: process.env.BIKEPED_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.stack);
  } else {
    console.log("Database connected successfully:", res.rows[0]);
  }
});

module.exports = pool;
