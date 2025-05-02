import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from scipy.interpolate import interp1d

# Load the CSV file
dataFile = pd.read_csv('72698024229.csv')

# Parse the DATE column as datetime (with time)
dataFile['DATE'] = pd.to_datetime(dataFile['DATE'])

# Extract numeric part before comma and convert to int
def parse_tmp(tmp_str):
    try:
        value = int(tmp_str.split(',')[0])
        return None if value == 9999 else value
    except:
        return None

# Apply parsing
dataFile['TMP_tenths_C'] = dataFile['TMP'].apply(parse_tmp)

# Convert tenths of °C to °F
dataFile['TMP_F'] = dataFile['TMP_tenths_C'].apply(
    lambda x: (x / 10.0) * 9 / 5 + 32 if x is not None else np.nan
)

# --- Specify date range here ---
start_date = '2021-06-25'
end_date   = '2021-07-02'

# Filter based on date part only
dataFile = dataFile[(dataFile['DATE'].dt.date >= pd.to_datetime(start_date).date()) &
        (dataFile['DATE'].dt.date <= pd.to_datetime(end_date).date())]

# Drop rows with missing temperature for interpolation
valid = dataFile['TMP_F'].notna()
x = dataFile.loc[valid, 'DATE'].astype(np.int64)  # Convert datetime to int for interpolation
y = dataFile.loc[valid, 'TMP_F']

# Interpolate using cubic spline
spline = interp1d(x, y, kind='cubic', fill_value="extrapolate")
dataFile['TMP_F_smooth'] = spline(dataFile['DATE'].astype(np.int64))

# Plot
plt.figure(figsize=(12, 6))
plt.plot(dataFile['DATE'], dataFile['TMP_F_smooth'], label='Smoothed Temperature (°F)', color='orange')
plt.scatter(dataFile['DATE'], dataFile['TMP_F'], label='Original Data (°F)', s=10, alpha=0.5)
plt.xlabel('Date')
plt.ylabel('Temperature (°F)')
plt.title(f'Smoothed Temperature from {start_date} to {end_date}')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
