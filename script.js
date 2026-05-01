// Google Apps Script Endpoint - YOUR API URL
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYH5Z_UHoLAL3S5qI3YYpnICHrtEcD-1VmdOc028qexu4j9sNbNYFOlctTRDMMPaZZcw/exec';

// DOM Elements
const dateTimeEl = document.getElementById('dateTime');
const currentTempEl = document.getElementById('current-temp');
const highTempEl = document.getElementById('high-temp');
const lowTempEl = document.getElementById('low-temp');
const humidityEl = document.getElementById('humidity');
const pressureEl = document.getElementById('pressure');
const uvIndexEl = document.getElementById('uv-index');
const aqiEl = document.getElementById('aqi');
const coLevelEl = document.getElementById('co-level');
const pm25El = document.getElementById('pm25');
const pm10El = document.getElementById('pm10');
const no2LevelEl = document.getElementById('no2-level');
const windSpeedEl = document.getElementById('wind-speed');
const windDirectionEl = document.getElementById('wind-direction');
const windAngleEl = document.getElementById('wind-angle');
const windGustEl = document.getElementById('wind-gust');
const compassWindSpeedEl = document.getElementById('compass-wind-speed');
const needleEl = document.getElementById('needle');
const thermometerEl = document.getElementById('thermometer-mercury');

// Temperature Chart
let temperatureChart;

// Date and Time Display
function displayDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    dateTimeEl.textContent = now.toLocaleDateString('en-IN', options);
}

// Calculate AQI based on PM2.5 and PM10 (Indian Standard)
function calculateAQI(pm25, pm10) {
    const pm25Breakpoints = [0, 30, 60, 90, 120, 250, 500];
    const pm25AQI = [0, 50, 100, 200, 300, 400, 500];
    
    const pm10Breakpoints = [0, 50, 100, 250, 350, 430, 500];
    const pm10AQI = [0, 50, 100, 200, 300, 400, 500];

    const pm25SubIndex = calculateSubIndex(pm25, pm25Breakpoints, pm25AQI);
    const pm10SubIndex = calculateSubIndex(pm10, pm10Breakpoints, pm10AQI);

    return Math.max(pm25SubIndex, pm10SubIndex);
}

function calculateSubIndex(value, breakpoints, aqiValues) {
    if (value <= breakpoints[0]) return 0;

    for (let i = 1; i < breakpoints.length; i++) {
        if (value <= breakpoints[i]) {
            const bpLow = breakpoints[i - 1];
            const bpHigh = breakpoints[i];
            const aqiLow = aqiValues[i - 1];
            const aqiHigh = aqiValues[i];

            return Math.round(((aqiHigh - aqiLow) / (bpHigh - bpLow)) * (value - bpLow) + aqiLow);
        }
    }

    return aqiValues[aqiValues.length - 1];
}

// Fetch Data from Google Apps Script
async function fetchWeatherData() {
    try {
        const response = await fetch(APP_SCRIPT_URL);
        const result = await response.json();
       
        if (result.status === 'success' && result.data.length > 0) {
            const currentData = result.data[0];
           
            const weatherData = {
                temperature: parseFloat(currentData[0]) || 0,
                humidity: parseFloat(currentData[1]) || 0,
                highTemp: parseFloat(currentData[2]) || 0,
                lowTemp: parseFloat(currentData[3]) || 0,
                pressure: parseFloat(currentData[4]) || 0,
                uvIndex: parseFloat(currentData[5]) || 0,
                pm25: parseFloat(currentData[6]) || 0,
                pm10: parseFloat(currentData[7]) || 0,
                coLevel: parseFloat(currentData[8]) || 0,
                no2: parseFloat(currentData[9]) || 0,
                windSpeed: parseFloat(currentData[10]) || 0,
                windDirection: currentData[11] || 'N',
                rainfall: parseFloat(currentData[12]) || 0
            };
            
            weatherData.aqi = calculateAQI(weatherData.pm25, weatherData.pm10);
           
            updateWeatherDisplay(weatherData);
           
            const chartData = result.data.slice(0, 24).map(row => parseFloat(row[0]) || 0);
            updateTemperatureChart(chartData);
           
            const lastUpdated = new Date(result.lastUpdated);
            console.log('Data last updated:', lastUpdated.toLocaleString());
        } else {
            throw new Error(result.message || 'No data available');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        updateWeatherDisplay(getSampleData());
    }
}

// Update all weather displays
function updateWeatherDisplay(data) {
    currentTempEl.textContent = `${data.temperature.toFixed(1)}°C`;
    highTempEl.textContent = `${data.highTemp.toFixed(1)}°C`;
    lowTempEl.textContent = `${data.lowTemp.toFixed(1)}°C`;
   
    updateThermometer(data.temperature);
   
    humidityEl.textContent = `${data.humidity.toFixed(0)}%`;
    pressureEl.textContent = `${data.pressure.toFixed(0)} hPa`;
    uvIndexEl.textContent = data.uvIndex.toFixed(0);
    aqiEl.textContent = data.aqi.toFixed(0);
    coLevelEl.textContent = `${data.coLevel.toFixed(1)} ppm`;
    pm25El.textContent = `${data.pm25.toFixed(1)} µg/m³`;
    pm10El.textContent = `${data.pm10.toFixed(1)} µg/m³`;
    
    if (no2LevelEl) {
        no2LevelEl.textContent = `${data.no2.toFixed(1)} ppb`;
    }
   
    const windSpeedKmh = (data.windSpeed * 1).toFixed(1);
    windSpeedEl.textContent = `${windSpeedKmh} km/h`;
    compassWindSpeedEl.textContent = windSpeedKmh;
   
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    let windDegrees = 0;
   
    if (isNaN(data.windDirection)) {
        const index = directions.indexOf(data.windDirection.toUpperCase());
        windDegrees = index * 22.5;
    } else {
        windDegrees = parseFloat