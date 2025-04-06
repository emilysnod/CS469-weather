// Haversine formula example with sample coordinates

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

// Portland landmarks (source points)
const sourcePoints = [
  { id: 1, name: "Portland State University", lat: 45.5109, lon: -122.6833 },
  { id: 2, name: "Powell's Books", lat: 45.5231, lon: -122.6813 },
  { id: 3, name: "Portland Art Museum", lat: 45.5162, lon: -122.683 },
];

// Bike racks (target points)
const targetPoints = [
  { id: 101, name: "Bike Rack A", lat: 45.512, lon: -122.6825 },
  { id: 102, name: "Bike Rack B", lat: 45.5265, lon: -122.6839 },
  { id: 103, name: "Bike Rack C", lat: 45.5139, lon: -122.6721 },
];

console.log(
  "Calculating distances between Portland landmarks and bike racks...\n"
);

// For each source point, find the closest target point
for (const source of sourcePoints) {
  console.log(
    `Finding closest bike rack to ${source.name} (${source.lat}, ${source.lon}):`
  );

  let closestTarget = null;
  let minDistance = Infinity;

  // Calculate distance to each target point
  for (const target of targetPoints) {
    const distance = haversineDistance(
      source.lat,
      source.lon,
      target.lat,
      target.lon
    );
    console.log(
      `  Distance to ${target.name} (${target.lat}, ${
        target.lon
      }): ${distance.toFixed(3)} km / ${(distance * 0.621371).toFixed(3)} miles`
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestTarget = target;
    }
  }

  console.log(
    `✅ Closest bike rack to ${source.name} is ${
      closestTarget.name
    } at ${minDistance.toFixed(3)} km / ${(minDistance * 0.621371).toFixed(
      3
    )} miles\n`
  );
}

// Step-by-step calculation for one pair
console.log("Step-by-step calculation example:");
const sourceExample = sourcePoints[0]; // PSU
const targetExample = targetPoints[0]; // Bike Rack A

console.log(
  `\nCalculating distance between ${sourceExample.name} and ${targetExample.name}:`
);
console.log(`Source: (${sourceExample.lat}, ${sourceExample.lon})`);
console.log(`Target: (${targetExample.lat}, ${targetExample.lon})`);

// Detailed step-by-step calculation
const toRad = (value) => (value * Math.PI) / 180;
const R = 6371; // Earth's radius in kilometers

const lat1 = sourceExample.lat;
const lon1 = sourceExample.lon;
const lat2 = targetExample.lat;
const lon2 = targetExample.lon;

console.log("\nStep 1: Convert latitude and longitude to radians");
const lat1Rad = toRad(lat1);
const lon1Rad = toRad(lon1);
const lat2Rad = toRad(lat2);
const lon2Rad = toRad(lon2);
console.log(`lat1 in radians: ${lat1Rad}`);
console.log(`lon1 in radians: ${lon1Rad}`);
console.log(`lat2 in radians: ${lat2Rad}`);
console.log(`lon2 in radians: ${lon2Rad}`);

console.log("\nStep 2: Calculate differences in coordinates");
const dLat = toRad(lat2 - lat1);
const dLon = toRad(lon2 - lon1);
console.log(`dLat in radians: ${dLat}`);
console.log(`dLon in radians: ${dLon}`);

console.log("\nStep 3: Calculate 'a' component of haversine formula");
const aCalc1 = Math.sin(dLat / 2) * Math.sin(dLat / 2);
const aCalc2 =
  Math.cos(lat1Rad) *
  Math.cos(lat2Rad) *
  Math.sin(dLon / 2) *
  Math.sin(dLon / 2);
const a = aCalc1 + aCalc2;
console.log(`a value: ${a}`);

console.log("\nStep 4: Calculate 'c' component of haversine formula");
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
console.log(`c value: ${c}`);

console.log("\nStep 5: Calculate final distance");
const distance = R * c;
console.log(
  `Final distance: ${distance.toFixed(3)} km / ${(distance * 0.621371).toFixed(
    3
  )} miles`
);

// Compare with direct function call
const distanceDirect = haversineDistance(
  sourceExample.lat,
  sourceExample.lon,
  targetExample.lat,
  targetExample.lon
);
console.log(`\nVerify with function call: ${distanceDirect.toFixed(3)} km`);
