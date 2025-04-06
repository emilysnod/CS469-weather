# BikePed Database Interface

A Node.js application to connect to and interact with the BikePed PostgreSQL database.

## Features

- Direct PostgreSQL database connection
- Easy data insertion via web interface
- Modern JavaScript stack (Node.js, Express, EJS)
- Simple and intuitive UI

## Installation

1. Make sure you have Node.js installed (version 14.x or higher recommended)

2. Clone this repository

```
git clone <repository-url>
cd bikeped-dashboard
```

3. Install dependencies

```
npm install
```

4. Set up your database connection by creating a `.env` file with your PostgreSQL connection:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

## Running the Application

Start the application:

```
npm start
```

For development with auto-restart:

```
npm run dev
```

Then open your browser to http://localhost:3000

## Available Endpoints

- `/` - Home page with links to database operations
- `/add-weather` - Insert weather data into the database

## Technology Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **EJS** - Templating engine
- **pg** - PostgreSQL client

## Project Structure

- `app.js` - Main application file
- `views/` - EJS templates
- `.env` - Environment variables (database configuration)
- `package.json` - Project dependencies

## Troubleshooting

### Database Connection Issues

If you see an error like:

```
Error adding weather data: no pg_hba.conf entry for host "x.x.x.x", user "username", database "dbname", SSL off
```

Try these solutions:

1. **Enable SSL**:

   - Update your .env file to include SSL parameter:
     ```
     DATABASE_URL=postgresql://username:password@host:port/database?ssl=true
     ```
   - Make sure the app.js file is configured to handle SSL connections

2. **Use a VPN**:
   - If connecting to a university/corporate database, connect to their VPN first
3. **Contact Database Administrator**:
   - Provide them with your IP address to add to the pg_hba.conf file
   - Ask them to grant you the proper access credentials
4. **Try psql command line**:
   - Test your connection using the psql command line tool:
     ```
     psql "postgresql://username:password@host:port/database?ssl=true"
     ```
   - This can help verify if the issue is with your application or the database itself
