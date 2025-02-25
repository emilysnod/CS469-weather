document.addEventListener("DOMContentLoaded", function () {
    fetch('data.JSON') 
        .then(response => response.json())
        .then(jsonData => {
            const container = document.createElement("div");
            container.innerHTML = "<h2>Weather Data</h2>";
            
            const list = document.createElement("ul");
            jsonData.results.forEach(entry => {
                const listItem = document.createElement("li");
                listItem.textContent = `Date: ${entry.date.split('T')[0]}, Value: ${entry.value}`;
                list.appendChild(listItem);
            });
            
            container.appendChild(list);
            document.body.appendChild(container);
        })
        .catch(error => console.error('Error loading JSON:', error));
});
