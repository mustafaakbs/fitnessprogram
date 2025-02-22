// API Configuration
const SPREADSHEET_ID = '18_5FU3uuFYLJqOoF5Jp9pHaRQvpnc8TWlg5Q2JvvBvE';
const API_KEY = 'AIzaSyCxzGnOmTadaeTJBIs5Ehm4MEgSg8Sk1kE';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// DOM Elements
const userName = document.getElementById('userName');
const mealList = document.getElementById('mealList');
const addMealBtn = document.getElementById('addMealBtn');
const addMealModal = new bootstrap.Modal(document.getElementById('addMealModal'));
const addMealForm = document.getElementById('addMealForm');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeNutrition);
addMealBtn.addEventListener('click', () => addMealModal.show());
addMealForm.addEventListener('submit', handleAddMeal);
logoutBtn.addEventListener('click', handleLogout);

// Initialize Nutrition Page
async function initializeNutrition() {
    const user = checkAuth();
    if (!user) return;

    userName.textContent = user.name;
    await initializeAPI();
    await loadUserMeals(user.id);
    loadNutritionStats(user.id);
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

// Load User's Meals
async function loadUserMeals(userId) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Meals!A2:H'
        });

        const meals = response.result.values || [];
        const userMeals = meals.filter(m => m[0] == userId);
        
        displayMeals(userMeals);
        updateNutritionProgress(userMeals);
    } catch (error) {
        console.error('Error loading meals:', error);
    }
}

// Display Meals
function displayMeals(meals) {
    mealList.innerHTML = '';
    
    meals.forEach((meal, index) => {
        const mealCard = document.createElement('div');
        mealCard.className = 'card bg-surface mb-3';
        mealCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">${meal[1]}</h5>
                    <span class="badge bg-primary">${meal[2]} kcal</span>
                </div>
                <div class="row mt-3">
                    <div class="col-4">
                        <small class="text-muted">Protein</small>
                        <p class="mb-0">${meal[3]}g</p>
                    </div>
                    <div class="col-4">
                        <small class="text-muted">Karb</small>
                        <p class="mb-0">${meal[4]}g</p>
                    </div>
                    <div class="col-4">
                        <small class="text-muted">Yağ</small>
                        <p class="mb-0">${meal[5]}g</p>
                    </div>
                </div>
            </div>
        `;
        mealList.appendChild(mealCard);
    });
}

// Handle Add Meal
async function handleAddMeal(event) {
    event.preventDefault();
    
    const user = checkAuth();
    if (!user) return;

    const formData = new FormData(event.target);
    const mealData = {
        userId: user.id,
        name: formData.get('name'),
        calories: formData.get('calories'),
        protein: formData.get('protein'),
        carbs: formData.get('carbs'),
        fats: formData.get('fats'),
        date: new Date().toISOString().split('T')[0]
    };

    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Meals!A2:H',
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    mealData.userId,
                    mealData.name,
                    mealData.calories,
                    mealData.protein,
                    mealData.carbs,
                    mealData.fats,
                    mealData.date
                ]]
            }
        });

        addMealModal.hide();
        event.target.reset();
        loadUserMeals(user.id);
    } catch (error) {
        console.error('Error adding meal:', error);
        alert('Öğün eklenirken bir hata oluştu.');
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