const auth = {
    user: null,

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        try {
            this.user = await api.get('/auth/profile');
            this.updateUI();
            return true;
        } catch (err) {
            localStorage.removeItem('token');
            return false;
        }
    },

    async signup(username, email, password) {
        try {
            const data = await api.post('/auth/signup', { username, email, password });
            localStorage.setItem('token', data.token);
            this.user = data.user;
            this.updateUI();
            return true;
        } catch (err) {
            alert(err.message || 'Signup failed');
            return false;
        }
    },

    async login(email, password) {
        try {
            const data = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            this.user = data.user;
            this.updateUI();
            return true;
        } catch (err) {
            alert(err.message || 'Login failed');
            return false;
        }
    },

    logout() {
        localStorage.removeItem('token');
        this.user = null;
        this.updateUI();
        window.location.reload();
    },

    updateUI() {
        const loginBtn = document.getElementById('login-open-btn');
        const userInfo = document.getElementById('sidebar-user-info');
        const nameSmall = document.getElementById('user-name-small');
        const avatarSmall = document.getElementById('user-avatar-small');
        const profilePreviewImg = document.querySelector('#profile-preview img');

        if (this.user) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            nameSmall.textContent = this.user.username;
            if (this.user.profile?.avatar) {
                avatarSmall.src = this.user.profile.avatar;
                profilePreviewImg.src = this.user.profile.avatar;
            }
        } else {
            loginBtn.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    }
};
