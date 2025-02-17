Highcharts.chart('container', {
    title: {
        text: 'Weather'
    },
    subtitle: {
        text: 'Source: ' +
            '<a href="https://new.portal.its.pdx.edu/stations/#" ' +
            'target="_blank">new.portal.its.pdx.com</a>'
    },
    xAxis: {
        type: 'datetime', // Use datetime axis
        
        formatter: function() {
            // Create a Date object from the tick value
            var date = new Date(this.value);
            // Check if the hour is even
            if (date.getHours() % 2 === 0) {
                return Highcharts.dateFormat('%H:%M', this.value);
            } else {
                return ''; // Return an empty string for odd hours
            }
},
        },
    yAxis: [{
        title: {
            text: 'Temperature',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        labels: {
            format: '{value}°',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }, {
        title: {
            text: 'Precipitation',
            style: {
              color: Highcharts.getOptions().colors[1]
            }
          },
          labels: {
            format: '{value}',
            style: {
              color: Highcharts.getOptions().colors[1]
            }
          },
                opposite: true // Puts this yAxis on the right side
        }],
    tooltip: {
        crosshairs: true,
        shared: true
    },
    plotOptions: {
        series: {
            label: {
                enabled: false
            }
        },
        spline: {
            marker: {
                radius: 4,
                lineColor: '#666666',
                lineWidth: 1
            }
        }
    },
        series: [{
        name: 'Temperature (F)',
        type: 'line', 
        marker: {
            symbol: 'diamond'
        },
        pointStart: Date.UTC(2025, 1, 16, 0, 0),
        pointInterval: 3600 * 1000,
        data: [39, 39, 39.9, 39.9, 39.9,39.9,39.9,39.9,39.9,41, 42.1, 43, 44.1, 44.1, 43],
    }, {
        name: 'Precipitation',
        type: 'column', 
        yAxis: 1, 
        pointStart: Date.UTC(2025, 1, 16, 0, 0),
        pointInterval: 3600 * 1000,    
        data: [1, 3, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 4, 0],
    }]
});
