import openmeteo_requests

import requests_cache
import pandas as pd
from retry_requests import retry

import json
import psycopg2

#Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after = -1)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)

#Make sure all required weather variables are listed here
#The order of variables in hourly or daily is important to assign them correctly below
url = "https://archive-api.open-meteo.com/v1/archive"
params = {
	"latitude": 45.6387,
	"longitude": -122.6615,
	"start_date": "2025-03-29",
	"end_date": "2025-04-15",
	"hourly": ["temperature_2m", "precipitation"],
	"timezone": "America/Los_Angeles",
	"temperature_unit": "fahrenheit",
	"precipitation_unit": "inch"
}
responses = openmeteo.weather_api(url, params=params)

#Process first location. Add a for-loop for multiple locations or weather models
response = responses[0]
print(f"Coordinates {response.Latitude()}°N {response.Longitude()}°E")
print(f"Elevation {response.Elevation()} m asl")
print(f"Timezone {response.Timezone()}{response.TimezoneAbbreviation()}")
print(f"Timezone difference to GMT+0 {response.UtcOffsetSeconds()} s")

#Process hourly data. The order of variables needs to be the same as requested.
hourly = response.Hourly()
hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
hourly_precipitation = hourly.Variables(1).ValuesAsNumpy()

hourly_data = {"date": pd.date_range(
	start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
	end = pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
	freq = pd.Timedelta(seconds = hourly.Interval()),
	inclusive = "left"
)}

hourly_data["temperature_2m"] = hourly_temperature_2m
hourly_data["precipitation"] = hourly_precipitation

hourly_dataframe = pd.DataFrame(data = hourly_data)
print(hourly_dataframe)

#This will write the DataFrame to a JSON file.
hourly_dataframe.to_json("weather_dataVancouver.json", orient="records", date_format="iso")

#The following section of code was copy from here: https://www.sqliz.com/posts/python-basic-postgresql/
#It has been modified for my/our purpoes.

#Inputs just so no one has my login information.
username = input("Enter username: ") 
password = input("Enter password: ")

#Database configuration
db_config = {
	"dbname": "bikeped_capstone",
    "user": username,
	"password": password,
	"host": "portaldb.its.pdx.edu"
}

try:
	connection = psycopg2.connect(**db_config)

	if connection:
		print("Connected to database")
		cursor = connection.cursor()

		TableName = "weather.Weather_Data_Vancouver_WA"
		
		#The Table should be already created, but it is here to make it easier to make a new Table or just in case the table gets deleted.
		create_table_query = """CREATE TABLE IF NOT EXISTS """ + TableName + """ (
			id SERIAL PRIMARY KEY,
            time timestamp,
			temperature FLOAT(32),
			precipitation FLOAT(32)
		)"""

		cursor.execute(create_table_query)
		print("Table created successfully") #Should probably figure out how (if possible) if the previous line actucally created the table or not.

		for i in range(len(hourly_data["temperature_2m"])):
			insert_query = "INSERT INTO " + TableName + " (time, temperature, precipitation) VALUES (%s, %s, %s)"
			time = hourly_data["date"][i]
			temp = float(hourly_data["temperature_2m"][i])
			prep = float(hourly_data["precipitation"][i])
			data = (time, temp , prep)
			cursor.execute(insert_query, data)
            
		connection.commit()
		print("Data inserted successfully")
    
except psycopg2.Error as e:
    print(f"Error: {e}")

finally:
    if 'connection' in locals():
        connection.close()
        print("Connection closed")


'''
The Code using Open Meteo API was copied from thier example Python code. The code uses to connect and interact with the postgres database was 
copied and pasted from https://www.sqliz.com/posts/python-basic-postgresql/ and was then modified to meet what I needed it to do. And while I'm
 at it, I should also probadly metion I used Bing Coploit to help in debuging.

Below are the cititions that Open Meteo requirments for the used of there API. They are in APA format:
Zippenfenig, P. (2023). Open-Meteo.com Weather API [Computer software]. Zenodo. https://doi.org/10.5281/ZENODO.7970649

Hersbach, H., Bell, B., Berrisford, P., Biavati, G., Horányi, A., Muñoz Sabater, J., Nicolas, J., Peubey, C., Radu, R., Rozum, I., Schepers, D., Simmons, A., Soci, C., Dee, D., Thépaut, J-N. (2023). ERA5 hourly data on single levels from 1940 to present [Data set]. ECMWF. https://doi.org/10.24381/cds.adbb2d47

Muñoz Sabater, J. (2019). ERA5-Land hourly data from 2001 to present [Data set]. ECMWF. https://doi.org/10.24381/CDS.E2161BAC

Schimanke S., Ridal M., Le Moigne P., Berggren L., Undén P., Randriamampianina R., Andrea U., Bazile E., Bertelsen A., Brousseau P., Dahlgren P., Edvinsson L., El Said A., Glinton M., Hopsch S., Isaksson L., Mladek R., Olsson E., Verrelle A., Wang Z.Q. (2021). CERRA sub-daily regional reanalysis data for Europe on single levels from 1984 to present [Data set]. ECMWF. https://doi.org/10.24381/CDS.622A565A

'''
