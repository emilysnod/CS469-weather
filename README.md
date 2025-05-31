# BikePed Weather Data Management System

This tool supports the collection and management of weather data to be used in conjuction with the broader BikePed Portal. 

## Overview 

This project has two main componenets - a frontend for use by the BikePed admin and a backend which manages the data. Additionally, there are ancillary tools that were used for testing and may be useful in the future.

## Components

- **Front End**
    - This is to be used by a BikePed admin, not public users of BikePed Portal. It is only necessary to use this frontend data is added to the Portal in a new location, or when the current set of tracked weather is not precise enough.
        - Scenario 1: 
        BikePed receives data from a city not current within the Weather_Stations table. A BikePed admin would use the frontend client to locate and add the nearby weather station to track, along with the historical data.
        - Scenario 2: 
        Since BikePed's data tend to be clustered to certain cities and their suburbs, tracking the data for a station in that city tends to be sufficient. As new data is added and new clusters are formed, admins may decide to track the weather from a different station to improve accuracy.

- **Back End/Scheduled Updates**
    - When an admin adds a new weather station to track via the front end, the backend immediately fetches relevant historical weather data for that station and stores it in the database.

    -A scheduled background task runs at regular intervals (e.g. daily or hourly), automatically fetching the latest weather data for all stations listed in the Weather_Stations table. This ensures the database stays up-to-date without manual intervention.

- **Ancillary tools**
    - **NCEI Weather Data Downloader**
    A python script to download all of the CSV files that store hourly data that the NCEI stores. This serves as a back up of the NCEI data in case it stopped being publicly available in the future.
    - **plotweather.py** 
    A python script developed to demonstrate plotting data from the NCEI CSV files. It currently hard codes the name of the file and specific dates to plot from that file.

## Best Practices
- **Weather Station Selection**
    - **Enter a location on the main page.** 
    A city works best, and it does not need to be exact: 'New York', 'New york City', and 'NYC' all get good results for weather stations near New York, NY. Likewise, if the city name is ambiguous and you are looking for the less populous one, use the state name or abbreviation to find stations for that city (e.g. 'Portland' gives results for Portland, Oregon. Search 'Portland, ME' if that's the one you want).
    - **Choose Reliable Weather Stations**
    Not every weather station has hourly data. Since there is not an API for accessing this data, the only way to tell is to just attempt to download the data for that station ID and see if it can be parsed. Sometimes one location will have multiple station IDs. That said, international airports pretty reliably have weather stations that keep this hourly data. So it is usually best to choose one of these in the results that get shown. 
    
## Getting Started

### Prerequisites

- Node.js (version 14.x or higher)
- PostgreSQL database
- Python 3.x (for data visualization scripts)
    - Only necessary for the data plotting script

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory with the following variables:

   ```
   BIKEPED_DATABASE_URL=postgresql://<username>:<password>@portaldb.its.pdx.edu:5432/bikeped_capstone?sslmode=require
   PORT=3000
   ```

4. **Set up Python dependencies** (for visualization, generally not necessary for the main project.)
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Debug Mode

```bash
npm run debug
```

The application will be available at `http://localhost:3000`

## Project Structure

```
Project/
├── app.js              # Main application entry point
├── routes/             # API route handlers
├── views/             # EJS templates
├── public/            # Static assets
├── models/            # Database models
├── utils/             # Utility functions
├── cron/              # Scheduled tasks
├── config/            # Configuration files
└── templates/         # Additional templates
```

## 🔧 Available Endpoints

- `/` - Dashboard home
- `/visualize` - Data visualization tools
- `/api/weather` - Weather data API endpoints

## Technology Stack

- **Backend**

  - Node.js & Express
  - PostgreSQL
  - node-cron for scheduled tasks

- **Frontend**

  - EJS templating
  - JavaScript
  - Data visualization libraries

- **Data Processing**
  - CSV parsing utilities
  - Weather data processing tools

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. **SSL Configuration**

   ```env
   BIKEPED_DATABASE_URL=postgresql://username:password@host:port/database?ssl=true
   ```

2. **Network Access**

   - Ensure you are connected the the MCECS network, either directly or via VPN

3. **Connection Testing**
   ```bash
   psql "postgresql://username:password@host:port/database?ssl=true"
   ```

## License

TBD

## Contact

TBD