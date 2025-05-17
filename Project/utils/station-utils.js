// const fs = require("fs");
// const { parse } = require("csv-parse");

// // Load and parse the ISD station history file
// let stationMappings = {};
// try {
//   const isdHistoryFile = fs.readFileSync("isd-history.csv", "utf-8");
//   const records = parse(isdHistoryFile, {
//     columns: true,
//     skip_empty_lines: true,
//   });

//   // Create mappings from WBAN to WMO ID (USAF)
//   records.forEach((record) => {
//     if (record.WBAN !== "99999" && record.USAF !== "999999") {
//       stationMappings[record.WBAN] = {
//         wmoId: record.USAF,
//         icao: record.ICAO,
//         name: record.STATION_NAME,
//       };
//     }
//   });
//   console.log("Loaded station mappings from ISD history file");
// } catch (err) {
//   console.error("Error loading ISD history file:", err);
//   stationMappings = {};
// }

// function getStationInfo(wban) {
//   return stationMappings[wban] || {};
// }

// // function ghcndToWmo(ghcndId) {
// //   const wban = ghcndId.split("USW00")[1];
// //   const stationInfo = getStationInfo(wban);
// //   return stationInfo.wmoId
// //     ? `${stationInfo.wmoId}${wban.padStart(6, "0")}`
// //     : null;
// // }

// // function wmoToGhcnd(wmoId) {
// //   // Implementation would go here
// //   // This is a placeholder as the actual implementation would depend on your specific needs
// //   return null;
// // }

// module.exports = {
//   getStationInfo,
//   ghcndToWmo,
//   wmoToGhcnd,
//   stationMappings,
// };
