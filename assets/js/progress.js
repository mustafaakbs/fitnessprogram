// API Configuration
const SPREADSHEET_ID = '18_5FU3uuFYLJqOoF5Jp9pHaRQvpnc8TWlg5Q2JvvBvE';
const API_KEY = 'AIzaSyCxzGnOmTadaeTJBIs5Ehm4MEgSg8Sk1kE';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// DOM Elements
const userName = document.getElementById('userName');
const measurementsList = document.getElementById('measurementsList');
const addMeasurementBtn = document.getElementById('addMeasurementBtn');
const addMeasurementModal = new bootstrap.Modal(document.getElementById('addMeasurementModal'));
const addMeasurementForm = document.getElementById('addMeasurementForm');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeProgress);
addMeasurementBtn.addEventListener('click', () => addMeasurementModal.show());
addMeasurementForm.addEventListener('submit', handleAddMeasurement);
logoutBtn.addEventListener('click', handleLogout);

// Initialize Progress Page
async function initializeProgress() {
    const user = checkAuth();
    if (!user) return;

    userName.textContent = user.name;
    await initializeAPI();
    await loadUserMeasurements(user.id);
    initializeCharts();
}

// Initialize Google API
async function initializeAPI() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS
        });
        console.log('API initialized');
    } catch (error) {
        console.error('API initialization error:', error);
    }
}

// Load User's Measurements
async function loadUserMeasurements(userId) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Measurements!A2:I'
        });

        const measurements = response.result.values || [];
        const userMeasurements = measurements.filter(m => m[0] == userId);
        
        displayMeasurements(userMeasurements);
        updateCharts(userMeasurements);
    } catch (error) {
        console.error('Error loading measurements:', error);
    }
}

// Display Measurements
function displayMeasurements(measurements) {
    measurementsList.innerHTML = '';
    
    measurements.forEach(measurement => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${measurement[1]}</td>
            <td>${measurement[2]} kg</td>
            <td>${measurement[3]}%</td>
            <td>${measurement[4]} cm</td>
            <td>${measurement[5]} cm</td>
            <td>${measurement[6]} cm</td>
            <td>${measurement[7]} cm</td>
            <td>${measurement[8]} cm</td>
        `;
        measurementsList.appendChild(row);
    });
}

// Initialize Charts
function initializeCharts() {
    const weightCtx = document.getElementById('weightChart').getContext('2d');
    const bodyFatCtx = document.getElementById('bodyFatChart').getContext('2d');

    new Chart(weightCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Kilo (kg)',
                data: [],
                borderColor: '#BB86FC',
                tension: 0.1
            }]
        },
        options: getChartOptions()
    });

    new Chart(bodyFatCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Yağ Oranı (%)',
                data: [],
                borderColor: '#03DAC6',
                tension: 0.1
            }]
        },
        options: getChartOptions()
    });
}

// Chart Options
function getChartOptions() {
    return {
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: '#E0E0E0'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255,255,255,0.1)'
                },
                ticks: {
                    color: '#E0E0E0'
                }
            },
            x: {
                grid: {
                    color: 'rgba(255,255,255,0.1)'
                },
                ticks: {
                    color: '#E0E0E0'
                }
            }
        }
    };
}

// Update Charts
function updateCharts(measurements) {
    const dates = measurements.map(m => m[1]);
    const weights = measurements.map(m => m[2]);
    const bodyFats = measurements.map(m => m[3]);

    const weightChart = Chart.getChart('weightChart');
    const bodyFatChart = Chart.getChart('bodyFatChart');

    weightChart.data.labels = dates;
    weightChart.data.datasets[0].data = weights;
    weightChart.update();

    bodyFatChart.data.labels = dates;
    bodyFatChart.data.datasets[0].data = bodyFats;
    bodyFatChart.update();
}

// Handle Add Measurement
async function handleAddMeasurement(event) {
    event.preventDefault();
    
    const user = checkAuth();
    if (!user) return;

    const formData = new FormData(event.target);
    const measurementData = {
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        weight: formData.get('weight'),
        bodyFat: formData.get('bodyFat'),
        chest: formData.get('chest'),
        waist: formData.get('waist'),
        hips: formData.get('hips'),
        arm: formData.get('arm'),
        leg: formData.get('leg')
    };

    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Measurements!A2:I',
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    measurementData.userId,
                    measurementData.date,
                    measurementData.weight,
                    measurementData.bodyFat,
                    measurementData.chest,
                    measurementData.waist,
                    measurementData.hips,
                    measurementData.arm,
                    measurementData.leg
                ]]
            }
        });

        addMeasurementModal.hide();
        event.target.reset();
        loadUserMeasurements(user.id);
    } catch (error) {
        console.error('Error adding measurement:', error);
        alert('Ölçüm eklenirken bir hata oluştu.');
    }
}

// Handle Logout
function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Check Authentication
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(user);
} 