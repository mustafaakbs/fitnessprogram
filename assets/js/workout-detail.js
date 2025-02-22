// API Configuration
const SPREADSHEET_ID = '18_5FU3uuFYLJqOoF5Jp9pHaRQvpnc8TWlg5Q2JvvBvE';
const API_KEY = 'AIzaSyCxzGnOmTadaeTJBIs5Ehm4MEgSg8Sk1kE';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// DOM Elements
const userName = document.getElementById('userName');
const programName = document.getElementById('programName');
const programType = document.getElementById('programType');
const programDifficulty = document.getElementById('programDifficulty');
const programDate = document.getElementById('programDate');
const programProgress = document.getElementById('programProgress');
const completedExercises = document.getElementById('completedExercises');
const totalExercises = document.getElementById('totalExercises');
const exercisesList = document.getElementById('exercisesList');
const startWorkoutBtn = document.getElementById('startWorkoutBtn');
const exerciseModal = new bootstrap.Modal(document.getElementById('exerciseModal'));
const logoutBtn = document.getElementById('logoutBtn');

// YouTube Player
let player;

// Current Program Data
let currentProgram = null;
let currentExercises = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeWorkoutDetail);
startWorkoutBtn.addEventListener('click', startWorkout);
logoutBtn.addEventListener('click', handleLogout);

// Initialize Workout Detail Page
async function initializeWorkoutDetail() {
    const user = checkAuth();
    if (!user) return;

    userName.textContent = user.name;
    
    // Get program ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const programId = urlParams.get('id');
    
    if (!programId) {
        window.location.href = 'workouts.html';
        return;
    }

    await initializeAPI();
    await loadProgramDetails(programId);
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

// Load Program Details
async function loadProgramDetails(programId) {
    try {
        // Load program info
        const programResponse = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Programs!A2:E'
        });

        const programs = programResponse.result.values || [];
        currentProgram = programs[programId];

        if (!currentProgram) {
            window.location.href = 'workouts.html';
            return;
        }

        // Display program info
        programName.textContent = currentProgram[1];
        programType.textContent = currentProgram[2];
        programDifficulty.textContent = currentProgram[3];
        programDate.textContent = currentProgram[4];

        // Load exercises
        const exercisesResponse = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Exercises!A2:G'
        });

        const allExercises = exercisesResponse.result.values || [];
        currentExercises = allExercises.filter(e => 
            e[0] == currentProgram[0] && e[1] == currentProgram[1]
        );

        displayExercises();
        updateProgress();

    } catch (error) {
        console.error('Error loading program details:', error);
    }
}

// Display Exercises
function displayExercises() {
    exercisesList.innerHTML = '';
    
    currentExercises.forEach((exercise, index) => {
        const card = document.createElement('div');
        card.className = 'card bg-surface mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="card-title">${exercise[2]}</h5>
                        <div class="exercise-meta">
                            <span class="me-3">${exercise[3]} Set</span>
                            <span>${exercise[4]} Tekrar</span>
                        </div>
                    </div>
                    <button class="btn btn-primary ${exercise[6] === 'true' ? 'btn-success' : ''}"
                            onclick="viewExercise(${index})">
                        ${exercise[6] === 'true' ? 'Tamamlandı' : 'Başla'}
                    </button>
                </div>
            </div>
        `;
        exercisesList.appendChild(card);
    });

    totalExercises.textContent = currentExercises.length;
}

// Update Progress
function updateProgress() {
    const total = currentExercises.length;
    const completed = currentExercises.filter(e => e[6] === 'true').length;
    const progress = (completed / total) * 100;

    programProgress.style.width = `${progress}%`;
    completedExercises.textContent = completed;
}

// View Exercise
function viewExercise(index) {
    const exercise = currentExercises[index];
    
    document.getElementById('exerciseTitle').textContent = exercise[2];
    document.getElementById('exerciseSets').textContent = `${exercise[3]} Set`;
    document.getElementById('exerciseReps').textContent = `${exercise[4]} Tekrar`;
    
    // Initialize YouTube player
    if (player) {
        player.loadVideoById(exercise[5]);
    } else {
        player = new YT.Player('videoPlayer', {
            height: '360',
            width: '640',
            videoId: exercise[5],
            playerVars: {
                'playsinline': 1
            }
        });
    }

    const completeBtn = document.getElementById('completeExerciseBtn');
    completeBtn.textContent = exercise[6] === 'true' ? 'Tamamlandı' : 'Egzersizi Tamamla';
    completeBtn.onclick = () => completeExercise(index);

    exerciseModal.show();
}

// Complete Exercise
async function completeExercise(index) {
    try {
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Exercises!G${index + 2}`,
            valueInputOption: 'RAW',
            resource: {
                values: [['true']]
            }
        });

        currentExercises[index][6] = 'true';
        displayExercises();
        updateProgress();
        exerciseModal.hide();
    } catch (error) {
        console.error('Error completing exercise:', error);
        alert('Egzersiz tamamlanırken bir hata oluştu.');
    }
}

// Start Workout
function startWorkout() {
    if (currentExercises.length > 0) {
        viewExercise(0);
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