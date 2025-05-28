/**
 * @fileoverview Geographic utility functions for calculating distances and bounding boxes
 */

/**
 * Calculates the distance between two geographic points using the Haversine formula
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance between points in kilometers
 */
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

/**
 * Calculates a bounding box around a geographic point
 * @param {number} lat - Center latitude in degrees
 * @param {number} lon - Center longitude in degrees
 * @param {number} miles - Radius of the bounding box in miles
 * @returns {Object} Bounding box coordinates
 * @returns {number} returns.north - Northern boundary latitude
 * @returns {number} returns.south - Southern boundary latitude
 * @returns {number} returns.east - Eastern boundary longitude
 * @returns {number} returns.west - Western boundary longitude
 */
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
