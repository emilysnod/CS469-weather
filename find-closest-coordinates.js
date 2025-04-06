require("dotenv").config();
const { Pool } = require("pg");

// Override Node's strict SSL handling for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Haversine formula to calculate distance between two coordinates in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
  // Convert latitude and longitude from degrees to radians
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// Function to find closest coordinate from table2 for each coordinate in table1
async function findClosestCoordinates(
  table1,
  latCol1,
  lonCol1,
  table2,
  latCol2,
  lonCol2,
  schema = "bike_ped"
) {
  try {
    // Get coordinates from table1
    const table1Query = `SELECT id, ${latCol1} as lat, ${lonCol1} as lon FROM ${schema}.${table1}`;
    const table1Result = await pool.query(table1Query);

    if (table1Result.rows.length === 0) {
      console.log(`No coordinates found in ${schema}.${table1}`);
      return;
    }

    // Get coordinates from table2
    const table2Query = `SELECT id, ${latCol2} as lat, ${lonCol2} as lon FROM ${schema}.${table2}`;
    const table2Result = await pool.query(table2Query);

    if (table2Result.rows.length === 0) {
      console.log(`No coordinates found in ${schema}.${table2}`);
      return;
    }

    console.log(
      `Found ${table1Result.rows.length} coordinates in ${table1} and ${table2Result.rows.length} in ${table2}`
    );

    // For each coordinate in table1, find the closest in table2
    const results = [];

    for (const point1 of table1Result.rows) {
      let closestPoint = null;
      let minDistance = Infinity;

      // Check against all points in table2
      for (const point2 of table2Result.rows) {
        // Skip if missing lat/lon
        if (!point1.lat || !point1.lon || !point2.lat || !point2.lon) continue;

        const distance = haversineDistance(
          parseFloat(point1.lat),
          parseFloat(point1.lon),
          parseFloat(point2.lat),
          parseFloat(point2.lon)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point2;
        }
      }

      if (closestPoint) {
        results.push({
          source_id: point1.id,
          source_lat: point1.lat,
          source_lon: point1.lon,
          closest_id: closestPoint.id,
          closest_lat: closestPoint.lat,
          closest_lon: closestPoint.lon,
          distance_km: minDistance.toFixed(4),
          distance_miles: (minDistance * 0.621371).toFixed(4),
        });
      }
    }

    // Print results
    console.log("\nResults:");
    console.table(results);

    // Save results to database if needed
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${schema}.closest_coordinates (
        id SERIAL PRIMARY KEY,
        source_table VARCHAR(100),
        source_id INTEGER,
        source_lat NUMERIC,
        source_lon NUMERIC,
        target_table VARCHAR(100),
        target_id INTEGER,
        target_lat NUMERIC,
        target_lon NUMERIC,
        distance_km NUMERIC,
        distance_miles NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await pool.query(createTableQuery);

    // Insert results
    for (const result of results) {
      const insertQuery = `
        INSERT INTO ${schema}.closest_coordinates 
        (source_table, source_id, source_lat, source_lon, 
         target_table, target_id, target_lat, target_lon, 
         distance_km, distance_miles)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await pool.query(insertQuery, [
        table1,
        result.source_id,
        result.source_lat,
        result.source_lon,
        table2,
        result.closest_id,
        result.closest_lat,
        result.closest_lon,
        result.distance_km,
        result.distance_miles,
      ]);
    }

    console.log(`\nResults saved to ${schema}.closest_coordinates table`);

    return results;
  } catch (error) {
    console.error("Error finding closest coordinates:", error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Example usage - replace these with your actual table and column names
async function main() {
  // Get table/column names from command line arguments or use defaults
  const args = process.argv.slice(2);

  // Default values - replace with your actual table and column names
  const table1 = args[0] || "intersections";
  const latCol1 = args[1] || "latitude";
  const lonCol1 = args[2] || "longitude";
  const table2 = args[3] || "bike_counters";
  const latCol2 = args[4] || "latitude";
  const lonCol2 = args[5] || "longitude";
  const schema = args[6] || "bike_ped";

  console.log(
    `Finding closest coordinates from ${schema}.${table2} for each point in ${schema}.${table1}...`
  );
  await findClosestCoordinates(
    table1,
    latCol1,
    lonCol1,
    table2,
    latCol2,
    lonCol2,
    schema
  );
}

// Run the script
main().catch(console.error);
