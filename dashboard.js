// Dashboard class'ının constructor'ında Database'i başlat
constructor() {
    // Temel ayarlar
    this.db = new Database();
    // ... diğer kodlar aynı kalacak
}

// checkAdminPassword metodunu güncelle
async checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    const users = await this.db.getUsers();
    const adminUser = users.find(u => u.role === 'admin');
    
    if (password === adminUser.password) {
        this.editMode = !this.editMode;
        document.getElementById('passwordModal').style.display = 'none';
        document.getElementById('editModeBtn').classList.toggle('active', this.editMode);
        this.renderPrograms();
    } else {
        alert('Yanlış şifre!');
    }
}

// renderPrograms metodunu güncelle
async renderPrograms() {
    try {
        const program = await this.db.getProgramByDay(this.currentDay);
        
        if (!program) {
            console.error('Program not found for day:', this.currentDay);
            return;
        }

        const container = document.getElementById('programCards');
        if (!container) return;

        // ... geri kalan kod aynı kalacak
    } catch (error) {
        console.error('Error rendering programs:', error);
    }
}
