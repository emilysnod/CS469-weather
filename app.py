from flask import Flask, render_template, flash, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import sys
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.urandom(24)  # For flash messages

# Initialize database
db = SQLAlchemy(app)

# Direct SQL insert route
@app.route('/add_weather_sql', methods=['GET', 'POST'])
def add_weather_sql():
    if request.method == 'POST':
        try:
            # Use raw SQL to insert data
            sql = """
            INSERT INTO bike_ped.weather_data
            (station_id, record_time, "temp", precip, w_speed, w_direction, visibility, "timestamp")
            VALUES('A', NOW(), 'C', 'D', 'E', 'F', 'G', '2024-03-21 14:30:00');
            """
            db.session.execute(sql)
            db.session.commit()
            
            flash('Weather data added successfully with SQL!', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            flash(f'Error adding weather data: {str(e)}', 'error')
            return redirect(url_for('index'))
    
    return render_template('add_weather_sql.html')

# Weather Data model
class WeatherData(db.Model):
    __tablename__ = 'weather_data'
    __table_args__ = {'schema': 'bike_ped'}
    
    station_id = db.Column(db.String(1), primary_key=True)
    record_time = db.Column(db.DateTime, primary_key=True)
    temp = db.Column(db.String(1))
    precip = db.Column(db.String(1))
    w_speed = db.Column(db.String(1))
    w_direction = db.Column(db.String(1))
    visibility = db.Column(db.String(1))
    timestamp = db.Column(db.DateTime)

    def __repr__(self):
        return f'<WeatherData {self.station_id} {self.record_time}>'

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        flash(f'Error: {str(e)}', 'error')
        return render_template('index.html')

@app.route('/add_weather', methods=['GET', 'POST'])
def add_weather():
    if request.method == 'POST':
        try:
            # Create new weather data entry
            new_weather = WeatherData(
                station_id='A',
                record_time=datetime.utcnow(),
                temp='C',
                precip='D',
                w_speed='E',
                w_direction='F',
                visibility='G',
                timestamp=datetime(2024, 3, 21, 14, 30, 0)
            )
            
            db.session.add(new_weather)
            db.session.commit()
            
            flash('Weather data added successfully!', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            flash(f'Error adding weather data: {str(e)}', 'error')
            return redirect(url_for('index'))
    
    return render_template('add_weather.html')

if __name__ == '__main__':
    app.run(debug=True) 