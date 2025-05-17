// const express = require("express");
// const router = express.Router();
// const { ghcndToWmo, wmoToGhcnd } = require("../utils/station-utils");

// Add a route for ID conversion
// router.get("/convert-station-id", (req, res) => {
//   res.render("convert-station-id", {
//     result: null,
//     error: null,
//   });
// });

// router.post("/convert-station-id", (req, res) => {
//   const { id, type } = req.body;
//   let result = null;
//   let error = null;

//   try {
//     if (type === "ghcnd") {
//       // Converting from GHCND to WMO
//       result = {
//         original: id,
//         originalType: "GHCND ID",
//         converted: ghcndToWmo(id),
//         convertedType: "WMO ID",
//       };
//       if (!result.converted) {
//         error = "Could not find corresponding WMO ID";
//       }
//     } else if (type === "wmo") {
//       // Converting from WMO to GHCND
//       result = {
//         original: id,
//         originalType: "WMO ID",
//         converted: wmoToGhcnd(id),
//         convertedType: "GHCND ID",
//       };
//       if (!result.converted) {
//         error = "Could not convert to GHCND ID";
//       }
//     }
//   } catch (err) {
//     error = `Error converting ID: ${err.message}`;
//   }

//   res.render("convert-station-id", { result, error });
// });

// module.exports = router;
