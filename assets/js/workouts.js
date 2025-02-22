// API Configuration
const SPREADSHEET_ID = '18_5FU3uuFYLJqOoF5Jp9pHaRQvpnc8TWlg5Q2JvvBvE';
const API_KEY = 'AIzaSyCxzGnOmTadaeTJBIs5Ehm4MEgSg8Sk1kE';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// DOM Elements
const userName = document.getElementById('userName');
const workoutPrograms = document.getElementById('workoutPrograms');
const addWorkoutBtn = document.getElementById('addWorkoutBtn');
const addWorkoutModal = new bootstrap.Modal(document.getElementById('addWorkoutModal'));
const addWorkoutForm = document.getElementById('addWorkoutForm');
const addExerciseBtn = document.getElementById('addExerciseBtn');
const programType = document.getElementById('programType');
const difficultyLevel = document.getElementById('difficultyLevel');
const sortOrder = document.getElementById('sortOrder');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeWorkouts);
addWorkoutBtn.addEventListener('click', () => addWorkoutModal.show());
addWorkoutForm.addEventListener('submit', handleAddWorkout);
addExerciseBtn.addEventListener('click', addExerciseInput);
programType.addEventListener('change', filterWorkouts);
difficultyLevel.addEventListener('change', filterWorkouts);
sortOrder.addEventListener('change', filterWorkouts);
logoutBtn.addEventListener('click', handleLogout);

// Initialize Workouts Page
async function initializeWorkouts() {
    const user = checkAuth();
    if (!user) return;

    userName.textContent = user.name;
    await initializeAPI();
    await loadWorkoutPrograms();
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

// Load Workout Programs
async function loadWorkoutPrograms() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Programs!A2:E'
        });

        const programs = response.result.values || [];
        displayWorkoutPrograms(programs);
    } catch (error) {
        console.error('Error loading programs:', error);
    }
}

// Display Workout Programs
function displayWorkoutPrograms(programs) {
    workoutPrograms.innerHTML = '';
    
    programs.forEach((program, index) => {
        const card = document.createElement('div');
        card.className = 'col-md-4';
        card.innerHTML = `
            <div class="program-card">
                <div class="card-body">
                    <h5 class="card-title">${program[1]}</h5>
                    <div class="program-info mb-3">
                        <span class="badge bg-primary me-2">${program[2]}</span>
                        <span class="badge bg-secondary">${program[3]}</span>
                    </div>
                    <p class="text-muted small">Oluşturulma: ${program[4]}</p>
                    <button class="btn btn-primary w-100" onclick="viewProgram(${index})">
                        Programa Git
                    </button>
                </div>
            </div>
        `;
        workoutPrograms.appendChild(card);
    });
}

// Add Exercise Input
function addExerciseInput() {
    const exerciseList = document.getElementById('exerciseList');
    const exerciseItem = document.createElement('div');
    exerciseItem.className = 'exercise-item card bg-surface mb-3';
    exerciseItem.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="card-title mb-0">Yeni Egzersiz</h6>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeExercise(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Egzersiz Adı</label>
                    <input type="text" class="form-control bg-dark text-light" name="exercises[]" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Set</label>
                    <input type="number" class="form-control bg-dark text-light" name="sets[]" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Tekrar</label>
                    <input type="number" class="form-control bg-dark text-light" name="reps[]" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Video ID</label>
                    <input type="text" class="form-control bg-dark text-light" name="videos[]" required>
                </div>
            </div>
        </div>
    `;
    exerciseList.appendChild(exerciseItem);
}

// Remove Exercise
function removeExercise(button) {
    button.closest('.exercise-item').remove();
}

// Handle Add Workout
async function handleAddWorkout(event) {
    event.preventDefault();
    
    const user = checkAuth();
    if (!user) return;

    const formData = new FormData(event.target);
    const workoutData = {
        userId: user.id,
        name: formData.get('name'),
        type: formData.get('type'),
        difficulty: formData.get('difficulty'),
        date: new Date().toISOString().split('T')[0],
        exercises: Array.from(formData.getAll('exercises[]')),
        sets: Array.from(formData.getAll('sets[]')),
        reps: Array.from(formData.getAll('reps[]')),
        videos: Array.from(formData.getAll('videos[]'))
    };

    try {
        // Add program to Programs sheet
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Programs!A2:E',
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    workoutData.userId,
                    workoutData.name,
                    workoutData.type,
                    workoutData.difficulty,
                    workoutData.date
                ]]
            }
        });

        // Add exercises to Exercises sheet
        const exerciseRows = workoutData.exercises.map((exercise, index) => [
            workoutData.userId,
            workoutData.name,
            exercise,
            workoutData.sets[index],
            workoutData.reps[index],
            workoutData.videos[index],
            false
        ]);

        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Exercises!A2:G',
            valueInputOption: 'RAW',
            resource: {
                values: exerciseRows
            }
        });

        addWorkoutModal.hide();
        event.target.reset();
        await loadWorkoutPrograms();
    } catch (error) {
        console.error('Error adding workout:', error);
        alert('Program eklenirken bir hata oluştu.');
    }
}

// Filter Workouts
async function filterWorkouts() {
    const type = programType.value;
    const difficulty = difficultyLevel.value;
    const sort = sortOrder.value;

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Programs!A2:E'
        });

        let programs = response.result.values || [];

        // Filter by type
        if (type !== 'all') {
            programs = programs.filter(program => program[2] === type);
        }

        // Filter by difficulty
        if (difficulty !== 'all') {
            programs = programs.filter(program => program[3] === difficulty);
        }

        // Sort programs
        programs.sort((a, b) => {
            switch (sort) {
                case 'name':
                    return a[1].localeCompare(b[1]);
                case 'date':
                    return new Date(b[4]) - new Date(a[4]);
                case 'difficulty':
                    const difficultyOrder = {
                        'beginner': 1,
                        'intermediate': 2,
                        'advanced': 3
                    };
                    return difficultyOrder[a[3]] - difficultyOrder[b[3]];
                default:
                    return 0;
            }
        });

        displayWorkoutPrograms(programs);
    } catch (error) {
        console.error('Error filtering programs:', error);
    }
}

// View Program
function viewProgram(programId) {
    window.location.href = `workout-detail.html?id=${programId}`;
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