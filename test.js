
function getYesterday() {
    const date = new Date();
    const yesterday = new Date(date);
    yesterday.setDate(date.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() +1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const API_KEY = '38b39ab3cc3d428c915204616250104';
// trial ends 4/15/2025, may need new key

const ZIP = '97214';
const DATE = getYesterday();
const URL = `https://api.weatherapi.com/v1/history.json?q=${ZIP}&dt=${DATE}&key=${API_KEY}`;

document.addEventListener("DOMContentLoaded", function () {
    fetch(URL) 
        .then(response => response.json())
        .then(data => {
            createTable(data);
        })
        .catch(error => console.error('Error loading JSON:', error));
});

const createTable = (data) => {
    const location = data.location.name + ', ' + data.location.region + ', ' + data.location.country;
    const hourly = data.forecast.forecastday[0].hour;
    const date = data.forecast.forecastday[0].date;
    const container = document.createElement("div");
    const header = document.createElement("h2");
    header.innerText = `${location}, ${date}`;
    container.appendChild(header);

    const table = document.createElement("table");
    const headingRow = document.createElement("tr");
    headingRow.innerHTML= `
        <th>Time - 24 Hour</th>
        <th>Temperature - F</th>
        <th>Precepitation - in</th>
    `
    table.appendChild(headingRow);

    hourly.forEach(hour => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${hour.time.split(" ")[1]}</td>
            <td>${hour.temp_f}</td>
            <td>${hour.precip_in}</td>
        `;
        table.appendChild(row);
    })
    container.appendChild(table);
    document.body.appendChild(container);
};
