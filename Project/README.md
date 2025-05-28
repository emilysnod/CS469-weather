# BikePed Weather Data Management System

This is a tool for collecting weather data to be used in conjunction with the wealth of
other data that BikePed Portal collects.

There are two main components to this project, as well as some ancillary tools that were used for testing and may be useful in the future.

## Components

- **Front End**
    - This is intended to be used by a BikePed admin, not the general users of BikePed Portal. It is only necessary to use this frontend when trackers are being added to a completely new area, or when the current set of tracked weather is not precise enough.
        - Scenario 1: BikePed gets trackers in a city where it has never had trackers before. A BikePed admin would want to use the front end to add that city and its historical data as a location whose weather data to track.
        - Scenario 2: Since BikePed's Trackers tend to be clustered to certain cities and sometimes their suburbs, tracking the data for a station in that city tends to be sufficient. However, as new trackers are added and perhaps new clusters are formed, it may make sense to track the weather for a new station to get better data for that new cluster. This front end can be used to do that as well.
- **Back End/Scheduled Updates**
    - The functionality responsible for fetching the data when an admin chooses to add a station to track can also be scheduled, ensuring that the BikePed weather database is always up to date for the tracked stations.
    When the schedule task is run, it gets the latest weather data for all of the stations in the Weather_Stations table.
- **Ancillary tools**
    - NCEI Weather Data Downloader: This is a python script to download all of the CSV files that store hourly data that the NCEI stores. This was developed as a precaution to get the NCEI data backed up in case it stopped being publicly available for any reason at some point in the future
    - plotweather.py: This was developed to demonstrate plotting data from the NCEI CSV files. It currently hard codes the name of the file and specific dates to plot from that file.


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
   BIKEPED_DATABASE_URL=postgresql://username:password@host:port/database
   NODE_ENV=development
   PORT=3000
   ```

4. **Set up Python dependencies** (for visualization)
   ```bash
   pip install -r requirements.txt
   ```

## 🏃‍♂️ Running the Application

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

## 📁 Project Structure

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
- `/add-weather` - Weather data input interface
- `/visualize` - Data visualization tools
- `/api/weather` - Weather data API endpoints

## Technology Stack

- **Backend**

  - Node.js & Express
  - PostgreSQL
  - node-cron for scheduled tasks

- **Frontend**

  - EJS templating
  - Modern JavaScript
  - Data visualization libraries

- **Data Processing**
  - Python scripts for data analysis
  - CSV parsing utilities
  - Weather data processing tools

## 🔍 Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. **SSL Configuration**

   ```env
   BIKEPED_DATABASE_URL=postgresql://username:password@host:port/database?ssl=true
   ```

2. **Network Access**

   - Ensure VPN connection if required
   - Verify IP whitelist in database configuration
   - Check firewall settings

3. **Connection Testing**
   ```bash
   psql "postgresql://username:password@host:port/database?ssl=true"
   ```

### Common Issues

1. **Module not found errors**

   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version compatibility

2. **Database migration issues**
   - Verify database schema matches application requirements
   - Check database user permissions

## 📝 License

???

## 📧 Contact

???