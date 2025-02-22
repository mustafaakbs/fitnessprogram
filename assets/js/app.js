// Google Sheets API Configuration
const SPREADSHEET_ID = '18_5FU3uuFYLJqOoF5Jp9pHaRQvpnc8TWlg5Q2JvvBvE';
const API_KEY = 'AIzaSyCxzGnOmTadaeTJBIs5Ehm4MEgSg8Sk1kE';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const loginForm = document.getElementById('loginForm');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
loginBtn.addEventListener('click', () => loginModal.show());
loginForm.addEventListener('submit', handleLogin);

// Initialize Google API
function initializeApp() {
    gapi.load('client', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS
    }).then(() => {
        // API ready
        console.log('Google Sheets API initialized');
    }).catch(error => {
        console.error('Error initializing Google Sheets API:', error);
    });
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Users!A2:D'
        });

        const users = response.result.values || [];
        const user = users.find(u => u[0] === username && u[1] === password);

        if (user) {
            loginModal.hide();
            localStorage.setItem('user', JSON.stringify({
                id: user[2],
                name: user[3],
                username: user[0]
            }));
            window.location.href = 'dashboard.html';
        } else {
            alert('Kullanıcı adı veya şifre hatalı!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Giriş yapılırken bir hata oluştu.');
    }
}

// Check Authentication
function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = 'index.html';
    }
    return JSON.parse(user);
} 