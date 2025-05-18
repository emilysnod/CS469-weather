// Function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Function to calculate bounding box
function calculateBoundingBox(lat, lon, miles) {
  const milesToDegrees = miles / 69; // Approximate conversion factor
  return {
    north: lat + milesToDegrees,
    south: lat - milesToDegrees,
    east: lon + milesToDegrees,
    west: lon - milesToDegrees,
  };
}

module.exports = {
  calculateDistance,
  calculateBoundingBox,
};
