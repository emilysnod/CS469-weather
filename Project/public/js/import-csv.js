async function downloadCSVData(
  stationId,
  startYear,
  endYear,
  lineLimit,
  csvColumns
) {
  const statusDiv = document.getElementById("status");
  const progressDiv = document.getElementById("progress");

  if (startYear > endYear) {
    statusDiv.innerHTML = `<div class="alert alert-danger">Start year must be less than or equal to end year</div>`;
    return;
  }

  if (csvColumns.length === 0) {
    statusDiv.innerHTML = `<div class="alert alert-danger">Please specify at least one column to import</div>`;
    return;
  }

  try {
    statusDiv.innerHTML =
      '<div class="alert alert-info">Starting import process...</div>';
    progressDiv.innerHTML = "";

    let totalRowsImported = 0;
    let yearsProcessed = 0;
    const totalYears = endYear - startYear + 1;

    for (let year = startYear; year <= endYear; year++) {
      const csvUrl = `https://www.ncei.noaa.gov/data/global-hourly/access/${year}/${stationId}.csv`;

      progressDiv.innerHTML = `<div class="alert alert-info">Processing year ${year} (${
        yearsProcessed + 1
      }/${totalYears})...</div>`;

      const response = await fetch("/api/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvUrl,
          columns: csvColumns,
          lineLimit,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        totalRowsImported += result.rowsImported;
        yearsProcessed++;
        progressDiv.innerHTML = `<div class="alert alert-info">Processed year ${year} (${yearsProcessed}/${totalYears}) - Imported ${result.rowsImported} rows</div>`;
      } else {
        throw new Error(`Error processing year ${year}: ${result.error}`);
      }
    }

    statusDiv.innerHTML = `<div class="alert alert-success">Successfully imported ${totalRowsImported} rows from ${totalYears} years!</div>`;
    progressDiv.innerHTML = "";
  } catch (error) {
    statusDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    progressDiv.innerHTML = "";
  }
}

document
  .getElementById("csvImportForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const stationId = document.getElementById("stationId").value;
    const startYear = parseInt(document.getElementById("startYear").value);
    const endYear = parseInt(document.getElementById("endYear").value);
    const lineLimit = parseInt(document.getElementById("lineLimit").value);
    const csvColumns = Array.from(
      document.querySelectorAll('input[type="checkbox"]:checked')
    ).map((checkbox) => checkbox.value);

    await downloadCSVData(stationId, startYear, endYear, lineLimit, csvColumns);
  });

// Function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Set the station ID from URL parameter when page loads
document.addEventListener("DOMContentLoaded", function () {
  const stationId = getUrlParameter("stationId");
  if (stationId) {
    document.getElementById("stationId").value = stationId;
  }
});
