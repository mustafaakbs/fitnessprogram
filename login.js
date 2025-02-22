class Login {
    constructor() {
        this.db = new Database();
        this.initEventListeners();
    }

    initEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Kullanıcıları kontrol et
        const users = this.db.getUsers();
        const user = users.find(u => u.username === username);

        // Basit giriş kontrolü
        if (user) {
            if (user.username === 'admin' && password === 'admin123') {
                localStorage.setItem('currentUser', JSON.stringify(user));
                window.location.href = 'dashboard.html';
            } else if (password === 'user123') {
                localStorage.setItem('currentUser', JSON.stringify(user));
                window.location.href = 'dashboard.html';
            } else {
                alert('Şifre hatalı!');
            }
        } else {
            alert('Kullanıcı bulunamadı!');
        }
    }
}

// Login sayfasını başlat
window.onload = () => {
    new Login();
    // localStorage'ı temizlemek için yorum satırını kaldırın
    // localStorage.clear();
}; 