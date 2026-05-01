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
        windDegrees = parseFloat(data.windDirection);
    }
   
    const index = Math.round(windDegrees / 22.5) % 16;
    const compassDir = directions[index];
   
    windDirectionEl.textContent = `${compassDir} ${Math.round(windDegrees)}°`;
    windAngleEl.textContent = `${Math.round(windDegrees)}°`;
    needleEl.style.transform = `translate(-50%, -100%) rotate(${windDegrees}deg)`;
    
    updateAQIColor(data.aqi);
}

function updateAQIColor(aqi) {
    const aqiValue = parseFloat(aqi);
    let color = '#4caf50';
    
    if (aqiValue > 50 && aqiValue <= 100) {
        color = '#ffeb3b';
    } else if (aqiValue > 100 && aqiValue <= 200) {
        color = '#ff9800';
    } else if (aqiValue > 200 && aqiValue <= 300) {
        color = '#f44336';
    } else if (aqiValue > 300 && aqiValue <= 400) {
        color = '#9c27b0';
    } else if (aqiValue > 400) {
        color = '#795548';
    }
    
    aqiEl.style.color = color;
    aqiEl.style.textShadow = `0 0 8px ${color}`;
}

function updateThermometer(temp) {
    const height = Math.min(100, Math.max(0, (temp / 50) * 100));
    thermometerEl.style.height = `${height}%`;
    
    if (temp < 10) {
        thermometerEl.style.background = '#42a5f5';
    } else if (temp < 25) {
        thermometerEl.style.background = '#4caf50';
    } else if (temp < 35) {
        thermometerEl.style.background = '#ff9800';
    } else {
        thermometerEl.style.background = '#f44336';
    }
}

function initTemperatureChart() {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(24).fill().map((_, i) => `${i}:00`),
            datasets: [{
                label: 'Temperature (°C)',
                data: Array(24).fill(null),
                borderColor: '#ffcc00',
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#ffcc00',
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 10 } }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
                }
            },
            elements: { line: { tension: 0.4 } }
        }
    });
}

function updateTemperatureChart(temperatureData) {
    if (!temperatureChart) return;
    
    temperatureChart.data.datasets[0].data = temperatureData;
    
    const now = new Date();
    temperatureChart.data.labels = temperatureData.map((_, i) => {
        const d = new Date(now);
        d.setHours(now.getHours() - (temperatureData.length - 1 - i));
        return d.getHours() + ':00';
    });
    
    temperatureChart.update();
}

function getSampleData() {
    const now = new Date();
    const hour = now.getHours();
    
    return {
        temperature: 25 + 10 * Math.sin(hour * Math.PI / 12),
        humidity: 50 + 30 * Math.sin(hour * Math.PI / 12),
        highTemp: 32,
        lowTemp: 18,
        pressure: 1012 + (Math.random() * 4 - 2),
        uvIndex: Math.min(10, Math.max(1, Math.round(3 + 5 * Math.sin(hour * Math.PI / 12)))),
        pm25: 45,
        pm10: 78,
        coLevel: 0.8,
        no2: 25,
        windSpeed: 2 + (Math.random() * 5),
        windDirection: Math.round(Math.random() * 360),
        rainfall: hour > 6 && hour < 18 ? Math.random() * 5 : 0,
        aqi: 85
    };
}

async function fetchSunTimes() {
    try {
        const response = await fetch('https://api.sunrise-sunset.org/json?lat=23.6889&lng=86.9661&formatted=0');
        const data = await response.json();
        
        if (data.status === "OK") {
            const sunriseUTC = new Date(data.results.sunrise);
            const sunsetUTC = new Date(data.results.sunset);
            
            const sunrise = new Date(sunriseUTC.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const sunset = new Date(sunsetUTC.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
            document.getElementById('sunrise-time').textContent = sunrise.toLocaleTimeString('en-IN', timeOptions);
            document.getElementById('sunset-time').textContent = sunset.toLocaleTimeString('en-IN', timeOptions);
            
            updateSunPosition(sunrise, sunset);
            setInterval(() => updateSunPosition(sunrise, sunset), 60000);
        }
    } catch (error) {
        console.error("Error fetching sun data:", error);
        document.getElementById('sunrise-time').textContent = "06:00 AM";
        document.getElementById('sunset-time').textContent = "06:00 PM";
    }
}

function updateSunPosition(sunrise, sunset) {
    const now = new Date();
    const nowTime = now.getTime();
    const sunriseTime = sunrise.getTime();
    const sunsetTime = sunset.getTime();
    
    if (nowTime < sunriseTime || nowTime > sunsetTime) {
        document.getElementById('sun').style.opacity = '0';
        return;
    }
    
    document.getElementById('sun').style.opacity = '1';
    
    const totalDaylight = sunsetTime - sunriseTime;
    const elapsedTime = nowTime - sunriseTime;
    let progress = elapsedTime / totalDaylight;
    progress = Math.max(0, Math.min(progress, 1));
    
    const radius = 40;
    const centerX = 50;
    const centerY = 50;
    const angle = progress * Math.PI;
    const sunX = centerX + radius * Math.cos(angle);
    const sunY = centerY - radius * Math.sin(angle);
    
    const sun = document.getElementById('sun');
    sun.style.left = `calc(${sunX}% - 12.5px)`;
    sun.style.top = `calc(${sunY}% - 12.5px)`;
    
    if (progress < 0.25 || progress > 0.75) {
        sun.style.background = '#ff9900';
        sun.style.boxShadow = '0 0 30px #ff9900';
    } else {
        sun.style.background = '#ffcc00';
        sun.style.boxShadow = '0 0 40px #ffcc00';
    }
}

function calculateMoonPhase(date) {
    const referenceDate = new Date('2000-01-06T18:14:00Z');
    const lunarCycle = 29.53058867 * 24 * 60 * 60 * 1000;
    const diff = date - referenceDate;
    const phase = (diff % lunarCycle) / lunarCycle;
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

    const phases = [
        { icon: '🌑', name: 'New Moon', min: 0.00, max: 0.02 },
        { icon: '🌒', name: 'Waxing Crescent', min: 0.02, max: 0.25 },
        { icon: '🌓', name: 'First Quarter', min: 0.25, max: 0.35 },
        { icon: '🌔', name: 'Waxing Gibbous', min: 0.35, max: 0.45 },
        { icon: '🌕', name: 'Full Moon', min: 0.45, max: 0.55 },
        { icon: '🌖', name: 'Waning Gibbous', min: 0.55, max: 0.65 },
        { icon: '🌗', name: 'Last Quarter', min: 0.65, max: 0.75 },
        { icon: '🌘', name: 'Waning Crescent', min: 0.75, max: 0.92 },
        { icon: '🌑', name: 'New Moon', min: 0.92, max: 1.00 }
    ];

    const currentPhase = phases.find(p => phase >= p.min && phase < p.max) || { icon: '🌑', name: 'New Moon' };
    return {
        icon: currentPhase.icon,
        name: currentPhase.name,
        illumination: (illumination * 100).toFixed(1)
    };
}

function updateMoonPhase() {
    const date = new Date();
    const moonData = calculateMoonPhase(date);
    document.getElementById('moon-phase-icon').textContent = moonData.icon;
    document.getElementById('moon-phase-details').textContent = moonData.name;
    document.getElementById('moon-illumination').textContent = `${moonData.illumination}% illuminated`;
}

function init() {
    displayDateTime();
    setInterval(displayDateTime, 1000);
    
    fetchSunTimes();
    updateMoonPhase();
    setInterval(updateMoonPhase, 3600000);
    
    initTemperatureChart();
    
    fetchWeatherData();
    setInterval(fetchWeatherData, 300000);
}

window.onload = init;
