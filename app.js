class MembersList {
    constructor() {
        this.members = JSON.parse(localStorage.getItem('members')) || [];
        this.init();
    }

    init() {
        this.renderMembers();
        this.initDarkMode();
    }

    renderMembers() {
        const membersList = document.getElementById('membersList');
        membersList.innerHTML = this.members.map(member => `
            <div class="member-card">
                <h3>${member.name} ${member.surname}</h3>
                <p>Yaş: ${member.age}</p>
                <p>Telefon: ${member.phone}</p>
                <a href="member-detail.html?id=${member.id}" class="primary-button">
                    Detayları Görüntüle
                </a>
            </div>
        `).join('');
    }

    initDarkMode() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        document.body.classList.toggle('dark-mode', darkMode);
        
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
    }
}

const membersList = new MembersList(); 