// API Configuration
const SPREADSHEET_ID = '18_5FU3uuFYLJqOoF5Jp9pHaRQvpnc8TWlg5Q2JvvBvE';
const API_KEY = 'AIzaSyCxzGnOmTadaeTJBIs5Ehm4MEgSg8Sk1kE';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// DOM Elements
const welcomeMessage = document.getElementById('welcomeMessage');
const userName = document.getElementById('userName');
const workoutList = document.getElementById('workoutList');
const logoutBtn = document.getElementById('logoutBtn');
const progressChart = document.getElementById('progressChart');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);
logoutBtn.addEventListener('click', handleLogout);

// Initialize Dashboard
async function initializeDashboard() {
    const user = checkAuth();
    if (!user) return;

    welcomeMessage.textContent = `Hoş Geldin, ${user.name}`;
    userName.textContent = user.name;

    await initializeAPI();
    await loadUserWorkouts(user.id);
    loadUserStats(user.id);
    initializeChart();
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

// Load User's Workouts
async function loadUserWorkouts(userId) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Workouts!A2:G'
        });

        const workouts = response.result.values || [];
        const userWorkouts = workouts.filter(w => w[0] == userId);
        
        displayWorkouts(userWorkouts);
        updateProgress(userWorkouts);
    } catch (error) {
        console.error('Error loading workouts:', error);
    }
}

// Display Workouts
function displayWorkouts(workouts) {
    workoutList.innerHTML = '';
    
    workouts.forEach((workout, index) => {
        const card = document.createElement('div');
        card.className = 'col-md-4';
        card.innerHTML = `
            <div class="program-card">
                <div class="card-body">
                    <h5 class="card-title">${workout[1]}</h5>
                    <div class="workout-stats">
                        <span>${workout[2]} Set</span>
                        <span>${workout[3]} Tekrar</span>
                    </div>
                    <button class="btn btn-primary mt-3 ${workout[5] === 'true' ? 'completed' : ''}"
                            onclick="toggleWorkoutComplete(${index}, ${workout[5]})"
                    >
                        ${workout[5] === 'true' ? 'Tamamlandı' : 'Tamamla'}
                    </button>
                </div>
            </div>
        `;
        workoutList.appendChild(card);
    });
}

// Update Progress
function updateProgress(workouts) {
    const total = workouts.length;
    const completed = workouts.filter(w => w[5] === 'true').length;
    const progress = (completed / total) * 100;

    document.getElementById('dailyProgress').style.width = `${progress}%`;
    document.getElementById('completedWorkouts').textContent = completed;
}

// Initialize Chart
function initializeChart() {
    const ctx = progressChart.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{
                label: 'Haftalık İlerleme',
                data: [65, 70, 75, 70, 80, 85, 90],
                borderColor: '#BB86FC',
                tension: 0.1
            }]
        },
        options: {
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
        }
    });
}

// Handle Logout
function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Toggle Workout Complete
async function toggleWorkoutComplete(index, currentStatus) {
    const user = checkAuth();
    if (!user) return;

    try {
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Workouts!F${index + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[!currentStatus]]
            }
        });

        loadUserWorkouts(user.id);
    } catch (error) {
        console.error('Error updating workout:', error);
    }
} 