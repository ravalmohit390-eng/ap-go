// --- CONFIGURATION ---
const API_BASE = '/api';

// --- API LAYER ---
const api = {
    async get(endpoint) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
            }

            if (!res.ok) throw new Error(data.message || 'API Get Error');
            return data;
        } catch (e) {
            this.handleNetworkError(e);
            throw e;
        }
    },
    async post(endpoint, data) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            let resData;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                resData = await res.json();
            } else {
                const text = await res.text();
                throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
            }

            if (!res.ok) throw new Error(resData.message || 'API Post Error');
            return resData;
        } catch (e) {
            this.handleNetworkError(e);
            throw e;
        }
    },
    handleNetworkError(e) {
        if (e.message.includes('fetch') || e instanceof TypeError) {
            if (window.location.protocol === 'file:') {
                alert("🔴 CONNECTION ERROR: You are opening the file directly. Browsers block database features on LOCAL FILES.\n\nPLEASE DO THIS:\n1. Open your terminal.\n2. Run: npm run dev\n3. Go to: http://localhost:5000");
            } else {
                alert("🔴 SERVER ERROR: The backend is not responding. Ensure your server is running or deployed on Vercel.");
            }
        }
    }
};

// --- AUTH LAYER ---
const auth = {
    user: null,
    async init() {
        const token = localStorage.getItem('token');
        if (!token) return this.updateUI();
        try {
            this.user = await api.get('/auth/profile');
            this.updateUI();
        } catch (e) {
            localStorage.removeItem('token');
            this.updateUI();
        }
    },
    async login(email, password) {
        try {
            const data = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            this.user = data.user;
            this.updateUI();
            return true;
        } catch (e) {
            alert('Login failed: ' + e.message);
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
        } catch (e) {
            alert('Signup failed: ' + e.message);
            return false;
        }
    },
    logout() {
        localStorage.removeItem('token');
        this.user = null;
        window.location.reload();
    },
    updateUI() {
        const sidebarSection = document.getElementById('sidebar-user-section');
        const sidebarLogin = document.getElementById('sidebar-login-btn');
        const sidebarName = document.getElementById('sidebar-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (this.user) {
            if (sidebarLogin) sidebarLogin.style.display = 'none';
            if (sidebarSection) {
                sidebarSection.style.display = 'flex';
                sidebarName.textContent = this.user.username;
                sidebarAvatar.src = this.user.profile?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            }
        } else {
            if (sidebarLogin) sidebarLogin.style.display = 'block';
            if (sidebarSection) sidebarSection.style.display = 'none';
        }
    }
};

// --- CORE APP CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
    // Theme
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') document.body.classList.remove('dark-mode');

    document.getElementById('theme-toggle').onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    };

    // Navigation
    const navItems = document.querySelectorAll('.sidebar nav li');
    navItems.forEach(item => {
        item.onclick = () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderSection(item.dataset.section);
        };
    });

    // Auth
    const modal = document.getElementById('auth-modal');
    if (document.getElementById('sidebar-login-btn')) document.getElementById('sidebar-login-btn').onclick = () => modal.classList.add('active');
    document.querySelector('.close-modal').onclick = () => modal.classList.remove('active');
    if (document.getElementById('sidebar-logout-btn')) document.getElementById('sidebar-logout-btn').onclick = () => auth.logout();

    document.getElementById('tab-login').onclick = () => {
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-signup').classList.remove('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    };
    document.getElementById('tab-signup').onclick = () => {
        document.getElementById('tab-signup').classList.add('active');
        document.getElementById('tab-login').classList.remove('active');
        document.getElementById('signup-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
    };

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const em = document.getElementById('login-email').value;
        const pw = document.getElementById('login-password').value;
        if (await auth.login(em, pw)) { modal.classList.remove('active'); renderSection('dashboard'); }
    };

    document.getElementById('signup-form').onsubmit = async (e) => {
        e.preventDefault();
        const un = document.getElementById('signup-username').value;
        const em = document.getElementById('signup-email').value;
        const pw = document.getElementById('signup-password').value;
        if (await auth.signup(un, em, pw)) { modal.classList.remove('active'); renderSection('dashboard'); }
    };

    // Global Search
    document.getElementById('global-search').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        if (!q) return;
        ['gaming', 'shopping', 'entertainment', 'tools', 'dashboard'].forEach(s => {
            if (s.includes(q)) {
                const li = document.querySelector(`.sidebar nav li[data-section="${s}"]`);
                if (li && !li.classList.contains('active')) li.click();
            }
        });
    };

    // PWA Install Logic
    let deferredPrompt;
    const installBtn = document.getElementById('pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.style.display = 'block';
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            installBtn.style.display = 'none';
        });
    }

    // Init
    auth.init().then(() => renderSection('dashboard'));
});

window.stopAllGames = () => {
    if (window.gameTick) clearInterval(window.gameTick);
    if (window.gameLoop) cancelAnimationFrame(window.gameLoop);
    window.gameTick = null;
    window.gameLoop = null;
    window.onkeydown = null;
    window.onkeyup = null;
};

// --- RENDERER ---
async function renderSection(name) {
    const area = document.getElementById('content-area');
    const loader = document.getElementById('main-loader');

    if (!area) return;

    window.stopAllGames(); // Kill any running game logic before switching sections

    if (loader) loader.style.display = 'flex';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';

    setTimeout(async () => {
        try {
            switch (name) {
                case 'gaming': renderGaming(area); break;
                case 'shopping': await renderShopping(area); break;
                case 'entertainment': renderEntertainment(area); break;
                case 'tools': renderTools(area); break;
                case 'chat': renderChat(area); break;
                default: renderDashboard(area);
            }
        } catch (e) {
            console.error(e);
            area.innerHTML = `<div class="glass-card" style="padding:2rem;"><h2>Render Error</h2><p>${e.message}</p></div>`;
        } finally {
            if (loader) loader.style.display = 'none';
            area.style.opacity = '1';
            area.style.pointerEvents = 'auto';
        }
    }, 400);
}

// --- VIEWS ---

function renderDashboard(area) {
    const user = auth.user ? auth.user.username : 'Guest';
    const userKey = auth.user ? `saved_videos_${auth.user.username}` : 'saved_videos_guest';
    const cartKey = auth.user ? `cart_${auth.user.username}` : 'cart_guest';
    const notesKey = auth.user ? `notes_${auth.user.username}` : 'notes_guest';

    const savedVideos = JSON.parse(localStorage.getItem(userKey) || '[]');
    const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    const savedNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    const totalSpent = currentCart.reduce((s, x) => s + x.p, 0).toFixed(2);

    area.innerHTML = `
        <div class="welcome-card glass-card" style="padding:3.5rem; background: linear-gradient(135deg, #6366f1, #a855f7); color:white; margin-bottom:2.5rem; position:relative; overflow:hidden;">
            <div style="position:relative; z-index:2;">
                <h1>Welcome, ${user}!</h1>
                <p style="font-size:1.2rem; opacity:0.9; margin-top:1rem;">Explore the Market Hub or jump into a game. Your stats are looking great!</p>
                <div style="display:flex; gap:3rem; margin-top:3rem;">
                    <div><span style="display:block; font-size:1.8rem; font-weight:700;">${savedVideos.length}</span><small>Videos</small></div>
                    <div><span style="display:block; font-size:1.8rem; font-weight:700;">${currentCart.length}</span><small>Items</small></div>
                    <div><span style="display:block; font-size:1.8rem; font-weight:700;">${savedNotes.length}</span><small>Notes</small></div>
                    <div><span style="display:block; font-size:1.8rem; font-weight:700;">$${totalSpent}</span><small>Value</small></div>
                </div>
            </div>
            <i class="fas fa-rocket" style="position:absolute; right:3rem; bottom:2rem; font-size:8rem; opacity:0.2;"></i>
        </div>
        
        <div class="dashboard-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:2.5rem; margin-bottom:2.5rem;">
            <div class="glass-card" style="padding:2.5rem;">
                <h3><i class="fas fa-shopping-cart" style="color:var(--primary);"></i> Market Cart</h3>
                <div style="margin-top:1.5rem;" id="dash-cart-list">
                    ${currentCart.length ? currentCart.slice(0, 3).map(it => `
                        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span>${it.n}</span>
                            <strong style="color:var(--primary);">$${it.p}</strong>
                        </div>
                    `).join('') : '<p style="color:#64748b; font-size:0.9rem;">No items in cart yet.</p>'}
                </div>
                <button class="btn-primary" style="width:100%; margin-top:2rem;" onclick="document.querySelector('li[data-section=\\'shopping\\']').click()">Market</button>
            </div>
            
            <div class="glass-card" style="padding:2.5rem;">
                <h3><i class="fas fa-play-circle" style="color:var(--secondary);"></i> Private Library</h3>
                <div style="margin-top:1.5rem;" id="dash-video-list">
                    ${savedVideos.length ? savedVideos.slice(0, 3).map(v => `
                        <div style="display:flex; align-items:center; gap:1rem; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <img src="${v.thumb}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                            <span style="font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.platform} Video</span>
                        </div>
                    `).join('') : '<p style="color:#64748b; font-size:0.9rem;">No videos saved yet.</p>'}
                </div>
                <button class="btn-primary" style="width:100%; margin-top:2rem; background:var(--secondary);" onclick="document.querySelector('li[data-section=\\'entertainment\\']').click()">Watch Hub</button>
            </div>
        </div>

        <div class="glass-card" style="padding:2.5rem;">
            <h3><i class="fas fa-sticky-note" style="color:#fbbf24;"></i> Saved Marketing Notes</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:1.5rem; margin-top:1.5rem;">
                ${savedNotes.length ? savedNotes.map((n, i) => `
                    <div class="glass-card" style="padding:1.5rem; background:rgba(251,191,36,0.05); border-top:3px solid #fbbf24; position:relative;">
                        <p style="font-size:0.9rem; margin-bottom:1rem; line-height:1.5;">${n.content}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(0,0,0,0.05); padding-top:0.8rem;">
                            <small style="color:#64748b;">${n.date}</small>
                            <i class="fas fa-trash" style="color:#ef4444; cursor:pointer; font-size:0.8rem;" onclick="deleteNote(${i})"></i>
                        </div>
                    </div>
                `).join('') : '<p style="color:#64748b; font-size:0.9rem;">No notes saved. Use the Scribe tool to add one!</p>'}
            </div>
        </div>
    `;
}

window.deleteNote = (index) => {
    const notesKey = auth.user ? `notes_${auth.user.username}` : 'notes_guest';
    const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    notes.splice(index, 1);
    localStorage.setItem(notesKey, JSON.stringify(notes));
    renderSection('dashboard');
    showToast('Note deleted');
};

// --- GAMING VIEWS ---
function renderGaming(area) {
    area.innerHTML = `
        <div class="section-header"><h2>Gaming Hub</h2></div>
        <div id="game-selection" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:2rem;">
            <div class="glass-card game-card" style="padding:2.5rem; text-align:center; cursor:pointer;" onclick="launchSpaceRanger()">
                <div style="font-size:4rem; margin-bottom:1.5rem;">🚀</div>
                <h3>Space Ranger</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-top:0.5rem;">Defend the galaxy! Popular arcade shooter.</p>
                <button class="btn-primary" style="margin-top:2rem; width:100%; background:linear-gradient(90deg, #6366f1, #a855f7);">Play Space</button>
            </div>
            <div class="glass-card game-card" style="padding:2.5rem; text-align:center; cursor:pointer;" onclick="launchSnake()">
                <div style="font-size:4rem; margin-bottom:1.5rem;">🐍</div>
                <h3>Snake Master Pro</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-top:0.5rem;">Classic retro arcade action. Test your reflexes.</p>
                <button class="btn-primary" style="margin-top:2rem; width:100%;">Play Snake</button>
            </div>
            <div class="glass-card game-card" style="padding:2.5rem; text-align:center; cursor:pointer;" onclick="launchClicker()">
                <div style="font-size:4rem; margin-bottom:1.5rem;">⚡</div>
                <h3>Clicker Hero</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-top:0.5rem;">Simple and addictive tapping fun.</p>
                <button class="btn-primary" style="margin-top:2rem; width:100%; background:var(--secondary);">Play Clicker</button>
            </div>
            <div class="glass-card game-card" style="padding:2.5rem; text-align:center; cursor:pointer; background:linear-gradient(135deg, rgba(255,165,0,0.1), rgba(0,0,0,0));" onclick="launchGoku()">
                <div style="font-size:4rem; margin-bottom:1.5rem;">🔥</div>
                <h3 style="color:#f97316;">Rise of Goku</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-top:0.5rem;">Unleash the Super Saiyan within. High-intensity combat.</p>
                <button class="btn-primary" style="margin-top:2rem; width:100%; background:linear-gradient(90deg, #f97316, #fbbf24);">Play Goku</button>
            </div>
            <div class="glass-card game-card" style="padding:2.5rem; text-align:center; cursor:pointer; background:linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0,0,0,0));" onclick="launchFreeFire()">
                <div style="font-size:4rem; margin-bottom:1.5rem;">🔫</div>
                <h3 style="color:#ef4444;">Mini Free Fire</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-top:0.5rem;">Survival of the fittest. Tactical combat & loot.</p>
                <button class="btn-primary" style="margin-top:2rem; width:100%; background:linear-gradient(90deg, #b91c1c, #ef4444);">Play Free Fire</button>
            </div>
            <div class="glass-card game-card" style="padding:2.5rem; text-align:center; cursor:pointer;" onclick="launchCroc()">
                <div style="font-size:4rem; margin-bottom:1.5rem;">🐊</div>
                <h3 style="color:#10b981;">Croc Dentist</h3>
                <p style="font-size:0.95rem; color:#64748b; margin-top:0.5rem;">Don't touch the sore tooth! Classic reflex fun.</p>
                <button class="btn-primary" style="margin-top:2rem; width:100%; background:linear-gradient(90deg, #10b981, #059669);">Play Croc</button>
            </div>
        </div>
        <div id="active-game-zone" style="display:none; flex-direction:column; align-items:center; gap:2rem; margin-top:1rem;">
            <div class="glass-card" style="padding:1.5rem; background:#000; border-radius:30px; width:460px; max-width:100%; aspect-ratio:1; position:relative; display:flex; align-items:center; justify-content:center; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <canvas id="game-canvas" width="400" height="400" style="width:100%; height:100%; border:1px solid #334155; display:block; border-radius:15px;"></canvas>
                <div id="clicker-game-ui" style="display:none; text-align:center; color:white;">
                    <h1 style="font-size:5rem; margin-bottom:1rem;" id="click-score">0</h1>
                    <button class="btn-primary" onclick="handleGameClick()" style="font-size:2.5rem; padding:2rem; border-radius:50%; width:150px; height:150px; display:flex; align-items:center; justify-content:center; background:white; color:black; border:none; box-shadow:0 0 30px white;">TAP</button>
                </div>
                <div id="croc-game-ui" style="display:none; width:100%; height:100%; position:relative; overflow:hidden; background:#047857; border-radius:15px;">
                    <div id="croc-jaw-top" style="position:absolute; top:0; width:100%; height:80%; background:#10b981; border-bottom:10px solid #fff; transition: transform 0.2s cubic-bezier(0.68, -0.55, 0.27, 1.55); z-index:5; display:flex; align-items:flex-end; justify-content:center; font-size:4rem;">🐊</div>
                    <div id="croc-mouth-bottom" style="position:absolute; bottom:0; width:100%; height:60%; background:#065f46; display:grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(2, 1fr); gap:10px; padding:20px; z-index:1;">
                        <!-- Teeth will be generated here -->
                    </div>
                    <div id="croc-score-display" style="position:absolute; top:20px; right:20px; color:white; font-weight:bold; z-index:10; font-size:1.5rem;">0</div>
                </div>
            </div>
            <button class="btn-primary" onclick="renderSection('gaming')" style="background:#ef4444; padding:0.8rem 3rem;">Quit Game</button>
        </div>
    `;
}

window.launchSpaceRanger = () => {
    window.stopAllGames();
    document.getElementById('game-selection').style.display = 'none';
    document.getElementById('active-game-zone').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'block';
    document.getElementById('clicker-game-ui').style.display = 'none';
    initSpaceRanger();
};

window.launchSnake = () => {
    window.stopAllGames();
    document.getElementById('game-selection').style.display = 'none';
    document.getElementById('active-game-zone').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'block';
    document.getElementById('clicker-game-ui').style.display = 'none';
    initSnake();
};

window.launchClicker = () => {
    window.stopAllGames();
    document.getElementById('game-selection').style.display = 'none';
    document.getElementById('active-game-zone').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'none';
    document.getElementById('clicker-game-ui').style.display = 'block';
    initClicker();
};

window.launchGoku = () => {
    window.stopAllGames();
    document.getElementById('game-selection').style.display = 'none';
    document.getElementById('active-game-zone').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'block';
    document.getElementById('clicker-game-ui').style.display = 'none';
    initGoku();
};

window.launchFreeFire = () => {
    window.stopAllGames();
    document.getElementById('game-selection').style.display = 'none';
    document.getElementById('active-game-zone').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'block';
    document.getElementById('clicker-game-ui').style.display = 'none';
    document.getElementById('croc-game-ui').style.display = 'none';
    initFreeFire();
};

window.launchCroc = () => {
    window.stopAllGames();
    document.getElementById('game-selection').style.display = 'none';
    document.getElementById('active-game-zone').style.display = 'flex';
    document.getElementById('game-canvas').style.display = 'none';
    document.getElementById('clicker-game-ui').style.display = 'none';
    document.getElementById('croc-game-ui').style.display = 'block';
    initCroc();
};

// --- SPACE RANGER LOGIC ---
function initSpaceRanger() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    let player = { x: 180, y: 340, w: 40, h: 40 };
    let bullets = [];
    let enemies = [];
    let coins = [];
    let score = 0;

    if (window.gameTick) clearInterval(window.gameTick);

    window.gameTick = setInterval(() => {
        // Update
        bullets.forEach((b, i) => { b.y -= 7; if (b.y < 0) bullets.splice(i, 1); });

        enemies.forEach((e, i) => {
            e.y += e.s;
            if (e.y > 400) enemies.splice(i, 1);

            bullets.forEach((bi, bIdx) => {
                if (bi.x > e.x && bi.x < e.x + 30 && bi.y > e.y && bi.y < e.y + 30) {
                    enemies.splice(i, 1);
                    bullets.splice(bIdx, 1);
                    score += 50;
                }
            });

            if (player.x < e.x + 30 && player.x + 40 > e.x && player.y < e.y + 30 && player.y + 40 > e.y) {
                clearInterval(window.gameTick);
                alert('Mission Failed! Score: ' + score);
                renderSection('gaming');
            }
        });

        // Coins Update
        coins.forEach((c, i) => {
            c.y += 2.5;
            if (c.y > 400) coins.splice(i, 1);
            if (player.x < c.x + 20 && player.x + 40 > c.x && player.y < c.y + 20 && player.y + 40 > c.y) {
                coins.splice(i, 1);
                score += 100;
                showToast('Got Coin! +100');
            }
        });

        if (Math.random() < 0.05) enemies.push({ x: Math.random() * 370, y: -30, s: 2 + Math.random() * 3 });
        if (Math.random() < 0.015) coins.push({ x: Math.random() * 380, y: -20 });

        // Draw
        ctx.fillStyle = '#000814'; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#fff'; for (let i = 0; i < 10; i++) ctx.fillRect(Math.random() * 400, Math.random() * 400, 1, 1);

        // Player Ship
        ctx.fillStyle = '#6366f1';
        ctx.beginPath(); ctx.moveTo(player.x + 20, player.y); ctx.lineTo(player.x, player.y + 40); ctx.lineTo(player.x + 40, player.y + 40); ctx.fill();

        // Projectiles
        ctx.fillStyle = '#f43f5e'; bullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 10));

        // Invaders
        ctx.fillStyle = '#10b981'; enemies.forEach(e => ctx.fillRect(e.x, e.y, 30, 30));

        // Golden Coins
        ctx.fillStyle = '#facc15';
        coins.forEach(c => {
            ctx.beginPath(); ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = 'bold 12px Arial'; ctx.fillText('$', c.x + 6, c.y + 15);
            ctx.fillStyle = '#facc15';
        });

        ctx.fillStyle = '#fff'; ctx.font = '20px Outfit'; ctx.fillText('Score: ' + score, 20, 30);
    }, 1000 / 60);

    window.onkeydown = (e) => {
        if (e.key === 'ArrowLeft' && player.x > 0) player.x -= 20;
        if (e.key === 'ArrowRight' && player.x < 360) player.x += 20;
        if (e.key === ' ') bullets.push({ x: player.x + 20, y: player.y });
    };
}

// --- SNAKE LOGIC ---
function initSnake() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }];
    let food = { x: 15, y: 15 };
    let dx = 1, dy = 0;
    let score = 0;
    if (window.gameTick) clearInterval(window.gameTick);
    window.gameTick = setInterval(() => {
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.some(s => s.x === head.x && s.y === head.y)) {
            clearInterval(window.gameTick);
            alert('Game Over! Score: ' + score);
            if (auth.user) api.post('/games/score', { username: auth.user.username, game: 'Snake', score }).catch(e => e);
            renderSection('gaming');
            return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
        } else snake.pop();
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#6366f1'; snake.forEach(s => ctx.fillRect(s.x * 20 + 1, s.y * 20 + 1, 18, 18));
        ctx.fillStyle = '#f43f5e'; ctx.fillRect(food.x * 20 + 3, food.y * 20 + 3, 14, 14);
    }, 130);
    window.onkeydown = (e) => {
        const keys = { 'ArrowUp': [0, -1], 'ArrowDown': [0, 1], 'ArrowLeft': [-1, 0], 'ArrowRight': [1, 0] };
        if (keys[e.key]) {
            const [ndx, ndy] = keys[e.key];
            if (ndx !== -dx && ndy !== -dy) { dx = ndx; dy = ndy; }
        }
    };
}

let clickScore = 0;
function initClicker() {
    clickScore = 0;
    const el = document.getElementById('click-score');
    if (el) el.textContent = '0';
}
window.handleGameClick = () => {
    clickScore++;
    const el = document.getElementById('click-score');
    if (el) el.textContent = clickScore;
    if (clickScore % 50 === 0) showToast(`Milestone: ${clickScore} clicks!`);
};

// --- GOKU GAME LOGIC ---
// --- GOKU GAME LOGIC ---
function initGoku() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    let goku = { x: 50, y: 180, w: 40, h: 50, ki: 100, charging: false };
    let blasts = [];
    let enemies = [];
    let particles = [];
    let energyOrbs = [];
    let score = 0;

    if (window.gameTick) clearInterval(window.gameTick);

    window.gameTick = setInterval(() => {
        // Update
        if (goku.charging && goku.ki < 240) {
            goku.ki += 1.5;
            // Charge particles
            particles.push({ x: goku.x + 20 + Math.random() * 60 - 30, y: goku.y + 25 + Math.random() * 60 - 30, vx: (20 - (Math.random() * 40)) / 10, vy: (20 - (Math.random() * 40)) / 10, l: 15, c: '#38bdf8' });
        }

        blasts.forEach((b, i) => {
            b.x += 10;
            if (b.x > 400) blasts.splice(i, 1);
        });

        // Energy Orbs Update
        energyOrbs.forEach((o, i) => {
            o.x -= 2;
            if (o.x < -20) energyOrbs.splice(i, 1);

            // Collection
            if (goku.x < o.x + 15 && goku.x + 30 > o.x && goku.y < o.y + 15 && goku.y + 40 > o.y) {
                energyOrbs.splice(i, 1);
                goku.ki = Math.min(240, goku.ki + 40);
                score += 50;
                showToast('Energy Collected! +40 Ki');
                for (let k = 0; k < 12; k++) particles.push({ x: goku.x + 20, y: goku.y + 25, vx: Math.random() * 6 - 3, vy: Math.random() * 6 - 3, l: 30, c: '#fbbf24' });
            }
        });

        enemies.forEach((e, i) => {
            e.x -= e.s;
            if (e.x < -30) enemies.splice(i, 1);

            blasts.forEach((bi, bIdx) => {
                if (bi.x > e.x && bi.x < e.x + 30 && bi.y > e.y && bi.y < e.y + 30) {
                    enemies.splice(i, 1);
                    blasts.splice(bIdx, 1);
                    score += 100;
                    for (let k = 0; k < 8; k++) particles.push({ x: e.x, y: e.y, vx: Math.random() * 4 - 2, vy: Math.random() * 4 - 2, l: 20, c: '#ef4444' });
                }
            });

            if (goku.x < e.x + 25 && goku.x + 25 > e.x && goku.y < e.y + 25 && goku.y + 35 > e.y) {
                clearInterval(window.gameTick);
                alert('Defeated! Your Power Level reached: ' + score);
                renderSection('gaming');
            }
        });

        particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; p.l--;
            if (p.l <= 0) particles.splice(i, 1);
        });

        if (Math.random() < 0.04) enemies.push({ x: 430, y: Math.random() * 350, s: 3 + Math.random() * 2 });
        if (Math.random() < 0.01) energyOrbs.push({ x: 430, y: Math.random() * 350 });

        // Draw
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, 400, 400);

        // Energy Orbs
        energyOrbs.forEach(o => {
            ctx.shadowBlur = 15; ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x, o.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Aura
        if (goku.charging) {
            ctx.shadowBlur = 25; ctx.shadowColor = '#38bdf8';
            ctx.strokeStyle = 'rgba(56, 189, 248, ' + (Math.random() * 0.5 + 0.2) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(goku.x + 20, goku.y + 25, 35 + Math.random() * 15, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Goku
        ctx.fillStyle = '#f97316'; ctx.fillRect(goku.x + 10, goku.y + 15, 20, 30);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(goku.x + 10, goku.y + 15); ctx.lineTo(goku.x + 20, goku.y); ctx.lineTo(goku.x + 30, goku.y + 15); ctx.fill();
        ctx.fillStyle = '#fee2e2'; ctx.fillRect(goku.x + 12, goku.y + 10, 16, 10);
        ctx.fillStyle = '#1d4ed8'; ctx.fillRect(goku.x + 10, goku.y + 30, 20, 5);
        ctx.fillRect(goku.x + 10, goku.y + 45, 8, 5); ctx.fillRect(goku.x + 22, goku.y + 45, 8, 5);

        blasts.forEach(b => {
            ctx.shadowBlur = 15; ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        });

        ctx.fillStyle = '#ef4444';
        enemies.forEach(e => {
            ctx.fillRect(e.x, e.y, 30, 30);
            ctx.fillStyle = '#000'; ctx.fillRect(e.x + 5, e.y + 10, 5, 5); ctx.fillRect(e.x + 20, e.y + 10, 5, 5);
            ctx.fillStyle = '#ef4444';
        });

        particles.forEach(p => {
            ctx.fillStyle = p.c;
            ctx.fillRect(p.x, p.y, 2, 2);
        });

        // HUD
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Outfit';
        ctx.fillText('Power Level: ' + score, 20, 30);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(20, 40, 240, 12);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(20, 40, goku.ki, 12);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 40, 240, 12);
    }, 1000 / 60);

    window.onkeydown = (e) => {
        if (e.key === 'ArrowUp' && goku.y > 0) goku.y -= 25;
        if (e.key === 'ArrowDown' && goku.y < 350) goku.y += 25;
        if (e.key === 'c') goku.charging = true;
        if (e.key === ' ') {
            if (goku.ki >= 15) {
                blasts.push({ x: goku.x + 40, y: goku.y + 25 });
                goku.ki -= 15;
            } else {
                showToast('Need more Ki! Collect Orbs or Charge (C)');
            }
        }
    };
    window.onkeyup = (e) => {
        if (e.key === 'c') goku.charging = false;
    };
}

// --- MINI FREE FIRE LOGIC ---
function initFreeFire() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let player = { x: 200, y: 300, w: 25, h: 25, hp: 100, ammo: 40, dir: 'up', muzzle: 0 };
    let bullets = [], enemies = [], loot = [], particles = [];
    let score = 0, keys = {}, frame = 0;

    if (window.gameLoop) cancelAnimationFrame(window.gameLoop);
    if (window.gameTick) clearInterval(window.gameTick);

    const spawnEnemy = () => {
        const rank = Math.random();
        let type = 'grunt', hp = 1, s = 1.2, color = '#b91c1c';
        if (rank > 0.95) { type = 'boss'; hp = 5; s = 0.8; color = '#7c3aed'; }
        else if (rank > 0.8) { type = 'veteran'; hp = 2; s = 1.8; color = '#f97316'; }

        enemies.push({
            x: Math.random() * 370, y: -30,
            type, hp, s, color,
            w: type === 'boss' ? 35 : 25
        });
    };

    const update = () => {
        frame++;
        if (frame % 80 === 0) spawnEnemy();
        if (player.muzzle > 0) player.muzzle--;

        // Movement
        const speed = 4;
        if (keys['ArrowUp'] && player.y > 0) { player.y -= speed; player.dir = 'up'; }
        if (keys['ArrowDown'] && player.y < 375) { player.y += speed; player.dir = 'down'; }
        if (keys['ArrowLeft'] && player.x > 0) { player.x -= speed; player.dir = 'left'; }
        if (keys['ArrowRight'] && player.x < 375) { player.x += speed; player.dir = 'right'; }

        // Particles
        particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; p.l--;
            if (p.l <= 0) particles.splice(i, 1);
        });

        // Bullets
        bullets.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy;
            if (b.x < -10 || b.x > 410 || b.y < -10 || b.y > 410) bullets.splice(i, 1);
        });

        // Loot Box Collection
        loot.forEach((l, i) => {
            const dist = Math.hypot(player.x + 12 - l.x, player.y + 12 - l.y);
            if (dist < 25) {
                if (l.type === 'medkit') { player.hp = Math.min(100, player.hp + 50); showToast('+50 HP Recovered!'); }
                else { player.ammo += 40; showToast('+40 Ammo Looted!'); }
                loot.splice(i, 1);
            }
        });

        // Enemy AI & Collision
        enemies.forEach((e, i) => {
            const dx = player.x - e.x, dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            e.x += (dx / dist) * e.s; e.y += (dy / dist) * e.s;

            // Combat
            bullets.forEach((b, bIdx) => {
                if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.w) {
                    e.hp--;
                    bullets.splice(bIdx, 1);
                    // Blood splatter
                    for (let k = 0; k < 5; k++) particles.push({ x: e.x + 12, y: e.y + 12, vx: Math.random() * 4 - 2, vy: Math.random() * 4 - 2, l: 15, c: '#ef4444' });

                    if (e.hp <= 0) {
                        enemies.splice(i, 1);
                        score += (e.type === 'boss' ? 500 : 100);
                        // Drop Loot Box
                        if (Math.random() < 0.45) loot.push({ x: e.x, y: e.y, type: Math.random() > 0.4 ? 'ammo' : 'medkit' });
                    }
                }
            });

            if (dist < 20) {
                player.hp -= 0.8;
                if (player.hp <= 0) {
                    cancelAnimationFrame(window.gameLoop);
                    alert('Eliminated! Survivor Points: ' + score);
                    renderSection('gaming');
                }
            }
        });
    };

    const draw = () => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 400, 400); // Dark tactical background

        // Ground details
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let i = 0; i < 20; i++) ctx.fillRect((i * 47) % 400, (i * 113) % 400, 40, 1);

        // Loot Boxes (Realistic crates)
        loot.forEach(l => {
            ctx.fillStyle = l.type === 'medkit' ? '#ef4444' : '#fbbf24';
            ctx.fillRect(l.x, l.y, 18, 18);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(l.x + 2, l.y + 2, 14, 14);
        });

        // Player & Muzzle Flash
        if (player.muzzle > 0) {
            ctx.fillStyle = '#fde047'; ctx.shadowBlur = 15; ctx.shadowColor = '#fde047';
            let mx = player.x + 12, my = player.y + 12;
            if (player.dir === 'up') my -= 20; if (player.dir === 'down') my += 20;
            if (player.dir === 'left') mx -= 20; if (player.dir === 'right') mx += 20;
            ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#3b82f6'; ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#fff'; ctx.fillRect(player.x + 5, player.y + 5, 4, 4); ctx.fillRect(player.x + 16, player.y + 5, 4, 4);

        // Enemies
        enemies.forEach(e => {
            ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.w, e.w);
            if (e.type === 'boss') {
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(e.x - 2, e.y - 2, e.w + 4, e.w + 4);
            }
        });

        // Bullets
        ctx.fillStyle = '#fbbf24';
        bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 2, 4, 4));

        particles.forEach(p => { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 2, 2); });

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, 400, 50);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Outfit';
        ctx.fillText('SCORE: ' + score, 20, 20);
        ctx.fillText('AMMO: ' + player.ammo, 20, 40);

        ctx.fillStyle = '#1e293b'; ctx.fillRect(250, 15, 120, 10);
        ctx.fillStyle = '#10b981'; ctx.fillRect(250, 15, (player.hp / 100) * 120, 10);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(250, 15, 120, 10);
        ctx.fillText('HP', 230, 24);
    };

    const loop = () => {
        update();
        draw();
        window.gameLoop = requestAnimationFrame(loop);
    };

    window.onkeydown = (e) => {
        keys[e.key] = true;
        if (e.key === ' ' && player.ammo > 0) {
            let vx = 0, vy = 0;
            if (player.dir === 'up') vy = -8; if (player.dir === 'down') vy = 8;
            if (player.dir === 'left') vx = -8; if (player.dir === 'right') vx = 8;
            bullets.push({ x: player.x + 12, y: player.y + 12, vx, vy });
            player.ammo--;
            player.muzzle = 4;
        } else if (e.key === ' ' && player.ammo <= 0) {
            showToast('Out of AMMO! Kill enemies for crates.');
        }
    };
    window.onkeyup = (e) => keys[e.key] = false;

    loop();
}

// --- CROC DENTIST LOGIC ---
function initCroc() {
    const mouth = document.getElementById('croc-mouth-bottom');
    const jaw = document.getElementById('croc-jaw-top');
    const scoreEl = document.getElementById('croc-score-display');
    let score = 0;
    let gameOver = false;

    // Reset state
    jaw.style.transform = 'translateY(-100%)'; // Open mouth
    mouth.innerHTML = '';
    scoreEl.textContent = '0';

    const dangerTooth = Math.floor(Math.random() * 10);

    for (let i = 0; i < 10; i++) {
        const tooth = document.createElement('div');
        tooth.style.background = '#fff';
        tooth.style.borderRadius = '5px';
        tooth.style.cursor = 'pointer';
        tooth.style.boxShadow = '0 5px 0 #cbd5e1';
        tooth.style.display = 'flex';
        tooth.style.alignItems = 'center';
        tooth.style.justifyContent = 'center';
        tooth.style.transition = '0.1s';

        tooth.onclick = () => {
            if (gameOver) return;

            if (i === dangerTooth) {
                // Game Over
                gameOver = true;
                jaw.style.transform = 'translateY(0)'; // Close mouth
                tooth.style.background = '#ef4444';
                showToast('SNAP! Game Over! Score: ' + score);
                setTimeout(() => {
                    alert('The crocodile bit you! Final Score: ' + score);
                    renderSection('gaming');
                }, 500);
            } else {
                // Safe
                if (tooth.style.opacity === '0.2') return;
                tooth.style.opacity = '0.2';
                tooth.style.boxShadow = 'none';
                tooth.style.transform = 'translateY(5px)';
                score += 10;
                scoreEl.textContent = score;
                showToast('Safe! +10');

                if (score === 90) {
                    gameOver = true;
                    showToast('BRAVE DENTIST! You won!');
                    setTimeout(() => {
                        alert('You cleaned all the safe teeth! Total Score: ' + score);
                        renderSection('gaming');
                    }, 500);
                }
            }
        };

        // Hover effect helper
        tooth.onmouseover = () => { if (!gameOver && tooth.style.opacity !== '0.2') tooth.style.background = '#f1f5f9'; };
        tooth.onmouseout = () => { if (!gameOver && tooth.style.opacity !== '0.2') tooth.style.background = '#fff'; };

        mouth.appendChild(tooth);
    }

    // Animate open
    setTimeout(() => {
        jaw.style.transform = 'translateY(-30%)';
    }, 100);
}

async function renderShopping(area) {
    const cartKey = auth.user ? `cart_${auth.user.username}` : 'cart_guest';
    const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');

    area.innerHTML = `
        <div class="section-header">
            <h2>Market Hub</h2>
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <!-- Currency Selector -->
                <div class="currency-selector glass-card" style="padding: 0.4rem 1rem; border-radius: 12px; display: flex; align-items: center; gap: 0.8rem; border: 1px solid rgba(99, 102, 241, 0.2);">
                    <i class="fas fa-globe-americas" style="color: var(--primary); font-size: 0.9rem;"></i>
                    <select id="global-currency" onchange="updateMarketCurrency()" style="background: transparent; border: none; color: inherit; font-family: inherit; font-size: 0.85rem; font-weight: 600; outline: none; cursor: pointer;">
                        <option value="USD">🇺🇸 USD ($)</option>
                        <option value="INR">🇮🇳 INR (₹)</option>
                        <option value="EUR">🇪🇺 EUR (€)</option>
                        <option value="GBP">🇬🇧 GBP (£)</option>
                    </select>
                </div>
                <div class="market-status-badge">
                    <span class="pulse"></span> Live Market
                </div>
            </div>
        </div>

        <!-- Market Trends Section -->
        <div class="market-trends-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
            <!-- Gold -->
            <div class="glass-card trend-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; min-height: 220px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div class="icon-box" style="background: rgba(255, 215, 0, 0.1); color: #ffd700; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div style="overflow: hidden;">
                            <h4 style="margin: 0; font-size: 1.1rem; white-space: nowrap;">Gold Rate</h4>
                            <div class="unit-selectors" style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
                                <button class="unit-btn active" onclick="switchUnit('gold', '1g', this)">1g</button>
                                <button class="unit-btn" onclick="switchUnit('gold', '10g', this)">10g</button>
                                <button class="unit-btn" onclick="switchUnit('gold', '12g', this)">12g</button>
                                <button class="unit-btn" onclick="switchUnit('gold', '1kg', this)">1kg</button>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 100px;">
                        <div style="font-weight: 800; font-size: 1.25rem; color: var(--primary); line-height: 1.2;" id="gold-price-main">₹15,277</div>
                        <div style="color: #ef4444; font-size: 0.8rem; font-weight: 700; margin-top: 4px;" id="gold-price-change">
                            <i class="fas fa-caret-down"></i> ₹-289
                        </div>
                    </div>
                </div>
                <div style="flex: 1; min-height: 80px; width: 100%;">
                    <canvas id="chart-gold"></canvas>
                </div>
            </div>

            <!-- Silver -->
            <div class="glass-card trend-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; min-height: 220px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div class="icon-box" style="background: rgba(192, 192, 192, 0.1); color: #c0c0c0; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-gem"></i>
                        </div>
                        <div style="overflow: hidden;">
                            <h4 style="margin: 0; font-size: 1.1rem; white-space: nowrap;">Silver Rate</h4>
                            <div class="unit-selectors" style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
                                <button class="unit-btn active" onclick="switchUnit('silver', '1g', this)">1g</button>
                                <button class="unit-btn" onclick="switchUnit('silver', '1kg', this)">1kg</button>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 100px;">
                        <div style="font-weight: 800; font-size: 1.25rem; color: var(--primary); line-height: 1.2;" id="silver-price-main">₹92.00</div>
                        <div style="color: #10b981; font-size: 0.8rem; font-weight: 700; margin-top: 4px;" id="silver-price-change">
                            <i class="fas fa-caret-up"></i> ₹+1.20
                        </div>
                    </div>
                </div>
                <div style="flex: 1; min-height: 80px; width: 100%;">
                    <canvas id="chart-silver"></canvas>
                </div>
            </div>

            <!-- Bitcoin -->
            <div class="glass-card trend-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; min-height: 220px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div class="icon-box" style="background: rgba(247, 147, 26, 0.1); color: #f7931a; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fab fa-bitcoin"></i>
                        </div>
                        <div style="overflow: hidden;">
                            <h4 style="margin: 0; font-size: 1.1rem; white-space: nowrap;">Bitcoin</h4>
                            <div class="unit-selectors" style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
                                <button class="unit-btn active" onclick="switchUnit('btc', '1u', this)">Unit</button>
                                <button class="unit-btn" onclick="switchUnit('btc', 'sat', this)">Sats</button>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 100px;">
                        <div style="font-weight: 800; font-size: 1.25rem; color: var(--primary); line-height: 1.2;" id="btc-price-main">₹43.2L</div>
                        <div style="color: #10b981; font-size: 0.8rem; font-weight: 700; margin-top: 4px;" id="btc-price-change">
                            <i class="fas fa-caret-up"></i> +3.8%
                        </div>
                    </div>
                </div>
                <div style="flex: 1; min-height: 80px; width: 100%;">
                    <canvas id="chart-btc"></canvas>
                </div>
            </div>
        </div>

        <!-- My Asset Valuation (Portfolio Estimator) -->
        <div class="glass-card portfolio-checker" style="padding: 2.5rem; margin-bottom: 2.5rem; border: 1px solid rgba(99, 102, 241, 0.2);">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: var(--primary); color: white; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div>
                    <h3 style="margin:0;">Global Portfolio Estimator</h3>
                    <p style="color: #64748b; font-size: 0.85rem; margin:0;">Calculate asset value in Rupees, Euro, Pounds, or Dollars.</p>
                </div>
            </div>
            
            <div style="display: flex; gap: 1.5rem; align-items: flex-end; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 180px;">
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 0.6rem; font-weight: 600; color: var(--primary);">Asset & Unit</label>
                    <select id="asset-type" style="width: 100%; padding: 0.85rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: inherit; outline: none; font-family: inherit; cursor: pointer;">
                        <option value="gold_g">Gold (Grams)</option>
                        <option value="gold_kg">Gold (Kilograms)</option>
                        <option value="silver_g">Silver (Grams)</option>
                        <option value="silver_kg">Silver (Kilograms)</option>
                        <option value="btc">Bitcoin (Units)</option>
                    </select>
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 0.6rem; font-weight: 600; color: var(--primary);">Quantity</label>
                    <input type="number" id="asset-amount" placeholder="0.00" style="width: 100%; padding: 0.85rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: inherit; outline: none; font-family: inherit;">
                </div>
                <div style="flex: 1; min-width: 140px;">
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 0.6rem; font-weight: 600; color: var(--primary);">Currency</label>
                    <select id="valuation-currency" style="width: 100%; padding: 0.85rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: inherit; outline: none; font-family: inherit; cursor: pointer;">
                        <option value="USD">USD ($)</option>
                        <option value="INR" selected>INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>
                <button class="btn-primary" onclick="calculateAssetValue()" style="height: 52px; min-width: 160px; font-weight: 700;">
                    <i class="fas fa-coins" style="margin-right: 8px;"></i> Calculate
                </button>
            </div>
            
            <div id="valuation-result" style="margin-top: 2rem; padding: 2rem; border-radius: 20px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02)); border: 2px dashed rgba(16, 185, 129, 0.3); display: none; text-align: center; animation: fadeIn 0.5s ease-out;">
                <span style="font-size: 0.95rem; color: #64748b; letter-spacing: 1px; text-transform: uppercase;" id="valuation-label">Estimated Market Value</span>
                <div id="valuation-price" style="font-size: 3rem; font-weight: 800; color: var(--secondary); margin-top: 0.5rem; text-shadow: 0 0 20px rgba(16, 185, 129, 0.2);">$0.00</div>
            </div>
        </div>

        <div class="shopping-layout" style="display:grid; grid-template-columns: 1fr 300px; gap:2.5rem;">
            <div id="market-products" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:1.5rem; height:fit-content;"></div>
            <div class="glass-card cart-sidebar" style="padding:2.5rem; height:fit-content; position:sticky; top:20px;">
                <h3 style="margin-bottom:1.5rem;"><i class="fas fa-shopping-basket"></i> Market Cart</h3>
                <div id="cart-content" style="font-size:0.9rem; color:#64748b;">
                    ${currentCart.length ? currentCart.map(it => `<div style="padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.03); display:flex; justify-content:space-between;"><span>${it.n}</span><strong>$${it.p}</strong></div>`).join('') : 'Browse products to add to your marketing basket.'}
                </div>
                <div style="margin-top:2rem; border-top:1px solid rgba(0,0,0,0.05); padding-top:1.5rem;">
                    <div style="display:flex; justify-content:space-between; font-weight:700; font-size:1.1rem;">
                        <span>Total Val:</span>
                        <span id="cart-total">$${currentCart.reduce((s, x) => s + x.p, 0).toFixed(2)}</span>
                    </div>
                    <button class="btn-primary" style="width:100%; margin-top:2rem;" onclick="showToast('Market Transaction Confirmed!')">Checkout</button>
                </div>
            </div>
        </div>
    `;

    // Initialize Charts
    requestIdleCallback(() => {
        initMarketCharts();
    });

    try {
        const prods = await api.get('/shop/products');
        document.getElementById('market-products').innerHTML = prods.map(p => `
            <div class="glass-card" style="padding:1rem; border-radius:15px; text-align:center;">
                <div style="height:120px; border-radius:12px; overflow:hidden; margin-bottom:1rem;">
                    <img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <h5 style="font-size:1rem; margin-bottom:0.5rem;">${p.name}</h5>
                <p style="font-weight:700; color:var(--primary); margin-bottom:1rem;">$${p.price}</p>
                <button class="btn-primary" style="width:100%; padding:0.5rem;" onclick="addToCart('${p.name}', ${p.price})">Add to Hub</button>
            </div>
        `).join('');
    } catch (e) { }
}

let marketCharts = { gold: null, silver: null, btc: null };

function initMarketCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { point: { radius: 2, hoverRadius: 5 }, line: { tension: 0.4, borderWidth: 2 } }
    };

    // Gold
    if (marketCharts.gold) marketCharts.gold.destroy();
    marketCharts.gold = new Chart(document.getElementById('chart-gold').getContext('2d'), {
        type: 'line',
        data: {
            labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
            datasets: [{
                data: [15560, 15480, 15500, 15420, 15380, 15300, 15290, 15277],
                borderColor: '#ffd700',
                fill: true,
                backgroundColor: 'rgba(255, 215, 0, 0.05)'
            }]
        },
        options: commonOptions
    });

    // Silver
    if (marketCharts.silver) marketCharts.silver.destroy();
    marketCharts.silver = new Chart(document.getElementById('chart-silver').getContext('2d'), {
        type: 'line',
        data: {
            labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
            datasets: [{
                data: [90.5, 91.2, 90.8, 91.5, 92.2, 91.8, 92.4, 92.0],
                borderColor: '#c0c0c0',
                fill: true,
                backgroundColor: 'rgba(192, 192, 192, 0.05)'
            }]
        },
        options: commonOptions
    });

    // Bitcoin
    if (marketCharts.btc) marketCharts.btc.destroy();
    marketCharts.btc = new Chart(document.getElementById('chart-btc').getContext('2d'), {
        type: 'line',
        data: {
            labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
            datasets: [{
                data: [50200, 50800, 50500, 51200, 52000, 51800, 52400, 52140],
                borderColor: '#f7931a',
                fill: true,
                backgroundColor: 'rgba(247, 147, 26, 0.05)'
            }]
        },
        options: commonOptions
    });
}

window.switchUnit = (asset, unit, btn) => {
    // UI Update for unit buttons
    const container = btn.closest('.unit-selectors');
    container.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const priceEl = document.getElementById(`${asset}-price-main`);
    const changeEl = document.getElementById(`${asset}-price-change`);

    let price, change, data;

    if (asset === 'gold') {
        switch (unit) {
            case '1g': price = '₹15,277'; change = '<i class="fas fa-caret-down"></i> ₹-289'; data = [15560, 15480, 15500, 15420, 15380, 15300, 15290, 15277]; break;
            case '10g': price = '₹1,52,765'; change = '<i class="fas fa-caret-down"></i> ₹-2,885'; data = [155650, 154800, 155000, 154200, 153800, 153000, 152900, 152765]; break;
            case '12g': price = '₹1,83,318'; change = '<i class="fas fa-caret-down"></i> ₹-3,462'; data = [186780, 185800, 186000, 185200, 184800, 184000, 183900, 183318]; break;
            case '1kg': price = '₹1.52 Cr'; change = '<i class="fas fa-caret-down"></i> ₹-2.8 Lac'; data = [1.55, 1.54, 1.55, 1.54, 1.53, 1.53, 1.52, 1.52]; break;
        }
    } else if (asset === 'silver') {
        switch (unit) {
            case '1g': price = '₹92.00'; change = '<i class="fas fa-caret-up"></i> ₹+1.20'; data = [90.5, 91.2, 90.8, 91.5, 92.2, 91.8, 92.4, 92.0]; break;
            case '1kg': price = '₹92,000'; change = '<i class="fas fa-caret-up"></i> ₹+1,200'; data = [90500, 91200, 90800, 91500, 92200, 91800, 92400, 92000]; break;
        }
    } else if (asset === 'btc') {
        switch (unit) {
            case '1u': price = '₹43.2L'; change = '<i class="fas fa-caret-up"></i> +3.8%'; data = [41.5, 42.2, 41.8, 42.5, 43.2, 42.8, 43.4, 43.2]; break;
            case 'sat': price = '₹4.32'; change = '<i class="fas fa-caret-up"></i> +3.8%'; data = [4.15, 4.22, 4.18, 4.25, 4.32, 4.28, 4.34, 4.32]; break;
        }
    }

    priceEl.textContent = price;
    changeEl.innerHTML = change;

    // Chart Update
    if (marketCharts[asset]) {
        marketCharts[asset].data.datasets[0].data = data;
        marketCharts[asset].update();
    }

    showToast(`${asset.toUpperCase()} updated to ${unit}`);
};

window.updateMarketCurrency = () => {
    const currency = document.getElementById('global-currency').value;
    const rates = { USD: 1, INR: 83.20, EUR: 0.92, GBP: 0.79 };
    const symbols = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };

    document.querySelectorAll('.price-val').forEach(el => {
        const usdVal = parseFloat(el.dataset.usd);
        const unit = el.dataset.unit || '';
        const converted = (usdVal * rates[currency]).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        el.innerHTML = `${symbols[currency]}${converted} <small>${unit}</small>`;
    });
    showToast(`Prices updated to ${currency}`);
};

window.calculateAssetValue = () => {
    const type = document.getElementById('asset-type').value;
    const amount = parseFloat(document.getElementById('asset-amount').value);
    const currency = document.getElementById('valuation-currency').value;
    const resultDiv = document.getElementById('valuation-result');
    const priceDiv = document.getElementById('valuation-price');
    const labelDiv = document.getElementById('valuation-label');

    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid quantity');
        return;
    }

    const rates = { USD: 1, INR: 83.20, EUR: 0.92, GBP: 0.79 };
    const prices = {
        gold_g: 183.62, // ₹15,277 / 83.2
        gold_kg: 1836177 / 83.2, // ₹1,52,76,500 / 83.2 approx
        silver_g: 0.82,
        silver_kg: 816.60,
        btc: 52140.00
    };

    const labels = {
        gold_g: 'Gold Portfolio (Grams)',
        gold_kg: 'Gold Portfolio (Kilograms)',
        silver_g: 'Silver Portfolio (Grams)',
        silver_kg: 'Silver Portfolio (Kilograms)',
        btc: 'Bitcoin Portfolio'
    };

    const totalInUSD = amount * prices[type];
    const finalTotal = (totalInUSD * rates[currency]).toLocaleString('en-US', {
        style: 'currency',
        currency: currency
    });

    labelDiv.textContent = labels[type];
    resultDiv.style.display = 'block';
    priceDiv.textContent = finalTotal;

    // Smooth reveal animation
    resultDiv.style.opacity = '0';
    resultDiv.style.transform = 'translateY(15px)';
    resultDiv.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    requestAnimationFrame(() => {
        resultDiv.style.opacity = '1';
        resultDiv.style.transform = 'translateY(0)';
    });

    showToast(`Valuation calculated in ${currency}`);
};

let cart = [];
window.addToCart = (n, p) => {
    const cartKey = auth.user ? `cart_${auth.user.username}` : 'cart_guest';
    const currentCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    currentCart.push({ n, p });
    localStorage.setItem(cartKey, JSON.stringify(currentCart));

    const cEl = document.getElementById('cart-content');
    const tEl = document.getElementById('cart-total');
    if (cEl) {
        cEl.innerHTML = currentCart.map(it => `<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-between;"><span>${it.n}</span><strong>$${it.p}</strong></div>`).join('');
        tEl.textContent = `$${currentCart.reduce((s, x) => s + x.p, 0).toFixed(2)}`;
    }
    showToast(`Added ${n} to ${auth.user ? auth.user.username + "'s" : "guest"} cart`);
};

function renderEntertainment(area) {
    const userKey = auth.user ? `saved_videos_${auth.user.username}` : 'saved_videos_guest';
    const savedVideos = JSON.parse(localStorage.getItem(userKey) || '[]');

    area.innerHTML = `
        <div class="section-header"><h2>Video Hub</h2></div>
        <div style="display:grid; grid-template-columns: 1fr 320px; gap:2.5rem;">
            <div class="glass-card" style="padding:1.5rem; display:flex; flex-direction:column; gap:1.5rem;">
                <div class="video-input-box" style="display:flex; gap:1rem;">
                    <input type="text" id="yt-link" placeholder="Paste link here (YouTube, FB, IG, TeraBox)..." style="flex:1; padding:12px 20px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; font-family:inherit;">
                    <button class="btn-primary" onclick="saveAndPlayVideo()" style="padding:0 2rem;">Save & Play</button>
                </div>
                
                <div id="video-container" style="width:100%; aspect-ratio:16/9; background:#000; border-radius:20px; overflow:hidden; display:flex; align-items:center; justify-content:center; box-shadow:0 15px 40px rgba(0,0,0,0.3);">
                    <div id="video-placeholder" style="text-align:center; color:#64748b;">
                        <i class="fab fa-youtube" style="font-size:5rem; color:#ef4444; margin-bottom:1rem;"></i>
                        <p>Enter a link to start watching unique content</p>
                    </div>
                </div>
            </div>

            <div class="glass-card" style="padding:2rem; height:fit-content;">
                <h3 style="margin-bottom:1.5rem;"><i class="fas fa-history"></i> ${auth.user ? auth.user.username + "'s" : "Guest's"} Library</h3>
                <div id="video-history" style="display:flex; flex-direction:column; gap:1rem; max-height:450px; overflow-y:auto; padding-right:5px;">
                    ${savedVideos.length ? '' : '<p style="font-size:0.9rem; color:#64748b;">No saved videos yet.</p>'}
                </div>
            </div>
        </div>
    `;

    renderVideoHistory();
}

window.saveAndPlayVideo = () => {
    const link = document.getElementById('yt-link').value.trim();
    if (!link) return;

    const media = getMediaInfo(link);
    const userKey = auth.user ? `saved_videos_${auth.user.username}` : 'saved_videos_guest';

    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem(userKey) || '[]');
    if (!saved.find(m => m.link === link)) {
        saved.unshift(media);
        localStorage.setItem(userKey, JSON.stringify(saved.slice(0, 20)));
    }

    playMedia(media);
    renderVideoHistory();
    document.getElementById('yt-link').value = '';
    showToast(`${media.platform} saved to ${auth.user ? auth.user.username + "'s" : "guest"} library`);
};

function getMediaInfo(url) {
    let platform = 'Web Link';
    let thumb = 'https://cdn-icons-png.flaticon.com/512/1055/1055666.png';
    let embed = url;
    let type = 'link';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/)?.[2];
        if (id && id.length === 11) {
            platform = 'YouTube';
            thumb = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
            embed = `https://www.youtube.com/embed/${id}?autoplay=1`;
            type = 'embed';
        }
    } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
        platform = 'Facebook';
        thumb = 'https://cdn-icons-png.flaticon.com/512/124/124010.png';
        embed = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0`;
        type = 'embed';
    } else if (url.includes('instagram.com')) {
        platform = 'Instagram';
        thumb = 'https://cdn-icons-png.flaticon.com/512/174/174855.png';
        const cleanUrl = url.split('?')[0].replace(/\/$/, "");
        embed = `${cleanUrl}/embed`;
        type = 'embed';
    } else if (url.includes('tiktok.com')) {
        platform = 'TikTok';
        thumb = 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png';
        // TikTok embeds are tricky, we provide the link and a fallback
        type = 'link';
    } else if (url.includes('terabox')) {
        platform = 'TeraBox';
        thumb = 'https://www.terabox.com/static/images/logo/logo-blue.png';
        type = 'link';
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
        platform = 'Direct Video';
        thumb = 'https://cdn-icons-png.flaticon.com/512/825/825633.png';
        type = 'direct';
    }

    return { platform, thumb, embed, link: url, type };
}

function playMedia(media) {
    const player = document.getElementById('main-player');
    const placeholder = document.getElementById('video-placeholder');
    const container = document.getElementById('video-container');

    if (!container) return;

    // Reset container
    container.innerHTML = `<iframe id="main-player" style="display:none; width:100%; height:100%; border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>
                           <video id="direct-player" controls style="display:none; width:100%; height:100%; background:#000; border-radius:15px;"></video>
                           <div id="fallback-zone" style="display:none; text-align:center; padding:2rem;">
                                <div style="font-size:4rem; margin-bottom:1rem;">🔗</div>
                                <h4>External Content Detected</h4>
                                <p style="margin-bottom:2rem; opacity:0.7;">This platform does not allow direct embedding on other sites.</p>
                                <a href="${media.link}" target="_blank" class="btn-primary" style="display:inline-block; text-decoration:none; background:#ff4757;">Open Original Video</a>
                           </div>`;

    const iframe = document.getElementById('main-player');
    const video = document.getElementById('direct-player');
    const fallback = document.getElementById('fallback-zone');

    if (media.type === 'embed') {
        iframe.src = media.embed;
        iframe.style.display = 'block';
    } else if (media.type === 'direct') {
        video.src = media.link;
        video.style.display = 'block';
        video.play();
    } else {
        fallback.style.display = 'block';
    }
}

function renderVideoHistory() {
    const historyPanel = document.getElementById('video-history');
    if (!historyPanel) return;

    const userKey = auth.user ? `saved_videos_${auth.user.username}` : 'saved_videos_guest';
    const saved = JSON.parse(localStorage.getItem(userKey) || '[]');

    if (!saved.length) {
        historyPanel.innerHTML = '<p style="font-size:0.9rem; color:#64748b;">No saved videos yet.</p>';
        return;
    }

    historyPanel.innerHTML = saved.map((media, index) => {
        return `
            <div class="glass-card" style="padding:0.8rem; background:rgba(255,255,255,0.03); display:flex; gap:1rem; align-items:center; margin-bottom:0.5rem; transition:0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                <div style="cursor:pointer; display:flex; gap:1rem; align-items:center; flex:1;" onclick="playMedia(${JSON.stringify(media).replace(/"/g, '&quot;')})">
                    <div style="width:60px; height:60px; border-radius:10px; overflow:hidden; background:#000; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">
                         <img src="${media.thumb}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div style="overflow:hidden;">
                        <p style="font-size:0.85rem; font-weight:700; color:white; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${media.platform}</p>
                        <small style="color:var(--primary); font-size:0.75rem; font-weight:600;">Play Now</small>
                    </div>
                </div>
                <button onclick="deleteVideo(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:5px; opacity:0.4; transition:0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');
}

window.deleteVideo = (index) => {
    const userKey = auth.user ? `saved_videos_${auth.user.username}` : 'saved_videos_guest';
    const saved = JSON.parse(localStorage.getItem(userKey) || '[]');
    saved.splice(index, 1);
    localStorage.setItem(userKey, JSON.stringify(saved));
    renderVideoHistory();
    showToast('Removed from history');
};

function renderTools(area) {
    area.innerHTML = `
        <div class="section-header"><h2>Utilities</h2></div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:2.5rem;">
            <div class="glass-card" style="padding:2.5rem;">
                <h3><i class="fas fa-calculator"></i> EMI Calculator</h3>
                <p style="font-size:0.85rem; color:#64748b; margin-top:0.5rem;">Plan your market investments.</p>
                <div style="margin-top:2rem;">
                    <label style="font-size:0.8rem;">Principal Amount ($)</label>
                    <input type="number" id="emi-p" value="10000" style="width:100%; padding:12px; border-radius:10px; border:1px solid rgba(0,0,0,0.1); background:transparent; display:block; margin:0.5rem 0;">
                    <button class="btn-primary" style="width:100%; margin-top:1rem;" onclick="const v = document.getElementById('emi-p').value; document.getElementById('emi-r').innerHTML = 'Result: $' + (v * 0.05).toFixed(2) + ' / mo'; showToast('Calculated!');">Calculate</button>
                    <div id="emi-r" style="margin-top:1.5rem; text-align:center; font-weight:700; font-size:1.2rem; color:var(--primary);">$0.00 / mo</div>
                </div>
            </div>
            <div class="glass-card" style="padding:2.5rem;">
                <h3><i class="fas fa-pen-fancy"></i> Quick Scribe</h3>
                <textarea id="note-txt" placeholder="Draft your marketing ideas..." style="width:100%; height:120px; padding:15px; border-radius:12px; border:1px solid rgba(0,0,0,0.1); background:transparent; color:inherit; resize:none; margin-top:1.5rem;"></textarea>
                <button class="btn-primary" style="width:100%; margin-top:1.5rem;" onclick="saveNote()">Save Draft</button>
            </div>
        </div>
    `;
}

window.saveNote = () => {
    const txt = document.getElementById('note-txt').value.replace(/<[^>]*>/g, '').trim();
    if (!txt) return;

    const notesKey = auth.user ? `notes_${auth.user.username}` : 'notes_guest';
    const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');

    notes.unshift({
        content: txt,
        date: new Date().toLocaleString()
    });

    localStorage.setItem(notesKey, JSON.stringify(notes.slice(0, 50)));
    document.getElementById('note-txt').value = '';
    showToast('Note saved to Hub!');
};

// --- UTIL ---
function showToast(m) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:var(--primary); color:white; padding:1rem 2.5rem; border-radius:30px; z-index:10000; box-shadow:0 15px 35px rgba(99,102,241,0.5); font-weight:700; font-size:1rem;';
    t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transition = '0.4s';
        setTimeout(() => t.remove(), 400);
    }, 2000);
}

// --- GROUP CHAT LOGIC ---
function renderChat(area) {
    area.innerHTML = `
        <div class="section-header">
            <h2>Group Chat Hub</h2>
            <p>Connect with others using room codes or QR scanning</p>
        </div>
        
        <div class="dashboard-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:2.5rem;">
            <div class="glass-card" style="padding:2.5rem;">
                <h3><i class="fas fa-plus-circle" style="color:var(--primary);"></i> Create Room</h3>
                <p style="color:#64748b; margin:1rem 0;">Generate a unique code for your private group.</p>
                <button class="btn-primary" style="width:100%;" onclick="generateChatRoom()">Generate Room Code</button>
                <div id="generated-room-area" style="margin-top:2rem; display:none; text-align:center;">
                    <div style="font-size:2rem; font-weight:bold; letter-spacing:5px; color:var(--primary);" id="room-code-display"></div>
                    <canvas id="room-qr-canvas" style="margin-top:1.5rem; background:white; padding:10px; border-radius:10px;"></canvas>
                    <button class="btn-primary" style="width:100%; margin-top:1.5rem; background:var(--secondary);" onclick="enterChatFromCode()">Enter Room</button>
                </div>
            </div>
            
            <div class="glass-card" style="padding:2.5rem;">
                <h3><i class="fas fa-sign-in-alt" style="color:var(--secondary);"></i> Join Room</h3>
                <div style="margin-top:1.5rem;">
                    <input type="text" id="join-room-input" placeholder="Enter code" style="width:100%; padding:1rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:white; font-size:1.1rem; text-align:center; letter-spacing:3px;">
                    <button class="btn-primary" style="width:100%; margin-top:1rem; background:var(--secondary);" onclick="joinChatByInput()">Join with Code</button>
                </div>
                <div style="margin-top:2rem; padding-top:2rem; border-top:1px solid rgba(255,255,255,0.1);">
                    <p style="text-align:center; color:#64748b; margin-bottom:1rem;">OR</p>
                    <button class="btn-primary" style="width:100%; background:#10b981;" onclick="startChatScanner()">
                        <i class="fas fa-qrcode"></i> Scan QR Code
                    </button>
                    <div id="qr-reader" style="width: 100%; margin-top:1.5rem; overflow:hidden; border-radius:15px; display:none;"></div>
                </div>
            </div>
        </div>
        
        <div id="active-chat-area" style="display:none; margin-top:2.5rem;">
            <div class="glass-card" style="height: 500px; display:flex; flex-direction:column; padding:0; overflow:hidden;">
                <div style="padding:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                    <div>
                        <h3 style="margin:0;">Room: <span id="current-room-id" style="color:var(--primary);"></span></h3>
                        <small style="color:#64748b;">Collaborating as ${auth.user ? auth.user.username : 'Guest'}</small>
                    </div>
                    <button class="btn-primary" style="background:#ef4444; padding:0.5rem 1.5rem;" onclick="renderSection('chat')">Leave</button>
                </div>
                <div id="chat-messages" style="flex:1; overflow-y:auto; padding:1.5rem; display:flex; flex-direction:column; gap:1.2rem;">
                    <!-- Messages appear here -->
                </div>
                <div style="padding:1rem 1.5rem; border-top:1px solid rgba(255,255,255,0.1); display:flex; gap:1rem; background:rgba(255,255,255,0.02);">
                    <input type="text" id="chat-input" placeholder="Type message..." style="flex:1; padding:0.8rem 1.2rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:30px; color:white;">
                    <button class="btn-primary" id="send-chat-btn" style="width:50px; height:50px; border-radius:50%; padding:0; display:flex; align-items:center; justify-content:center;"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
    `;
}

window.generateChatRoom = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('room-code-display').textContent = code;
    document.getElementById('generated-room-area').style.display = 'block';

    new QRious({
        element: document.getElementById('room-qr-canvas'),
        size: 180,
        value: code,
        foreground: '#00d2ff',
        background: 'white'
    });
};

window.enterChatFromCode = () => {
    const code = document.getElementById('room-code-display').textContent;
    startChatRoom(code);
};

window.joinChatByInput = () => {
    const code = document.getElementById('join-room-input').value.trim();
    if (!code) return alert('Enter a room code');
    startChatRoom(code);
};

window.startChatScanner = () => {
    const reader = document.getElementById('qr-reader');
    reader.style.display = 'block';

    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            html5QrCode.stop().then(() => {
                reader.style.display = 'none';
                startChatRoom(decodedText);
            });
        },
        () => { } // Silent errors during scanning
    ).catch(err => {
        alert('Camera error: ' + err);
        reader.style.display = 'none';
    });
};

let chatInterval = null;
window.startChatRoom = async (roomId) => {
    if (!auth.user) {
        alert('Please login to use Group Chat');
        document.getElementById('auth-modal').classList.add('active');
        return;
    }

    const grids = document.querySelectorAll('.dashboard-grid');
    grids.forEach(g => g.style.display = 'none');
    document.getElementById('active-chat-area').style.display = 'block';
    document.getElementById('current-room-id').textContent = roomId;

    const msgArea = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat-btn');

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/rooms/${roomId}`);
            const messages = await res.json();
            msgArea.innerHTML = messages.map(m => `
                <div style="align-self: ${m.username === auth.user.username ? 'flex-end' : 'flex-start'}; max-width: 85%;">
                    <div style="font-size: 0.7rem; color: #64748b; margin: 0 5px 3px; text-align: ${m.username === auth.user.username ? 'right' : 'left'};">
                        ${m.username} • ${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style="padding: 12px 18px; border-radius: 20px; background: ${m.username === auth.user.username ? 'linear-gradient(135deg, var(--primary), #a855f7)' : 'rgba(255,255,255,0.08)'}; color: white; border-bottom-${m.username === auth.user.username ? 'right' : 'left'}-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        ${m.text}
                    </div>
                </div>
            `).join('');
            msgArea.scrollTop = msgArea.scrollHeight;
        } catch (e) { console.error('Chat sync error:', e); }
    };

    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        try {
            await fetch(`/api/chat/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: auth.user.username, text })
            });
            fetchMessages();
        } catch (e) { alert('Failed to send message'); }
    };

    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    if (chatInterval) clearInterval(chatInterval);
    fetchMessages();
    chatInterval = setInterval(fetchMessages, 2500); // Poll every 2.5s

    // Add cleanup to global handler
    const oldStop = window.stopAllGames;
    window.stopAllGames = () => {
        if (oldStop) oldStop();
        if (chatInterval) clearInterval(chatInterval);
        chatInterval = null;
    };
};

// --- ZENBOT FLOATING ASSISTANT LOGIC ---
window.toggleZenBot = () => {
    const win = document.getElementById('zenbot-window');
    const bubble = document.getElementById('zenbot-bubble');
    if (!win) return;

    const isHidden = win.style.display === 'none' || win.style.display === '';
    win.style.display = isHidden ? 'flex' : 'none';

    if (isHidden) {
        document.getElementById('zenbot-input').focus();
        bubble.style.transform = 'scale(0.9) rotate(15deg)';
    } else {
        bubble.style.transform = 'scale(1) rotate(0deg)';
    }
};

window.sendZenBotMessage = () => {
    const input = document.getElementById('zenbot-input');
    const text = input.value.trim();
    if (!text) return;

    // Add user message to UI
    appendZenBotMsg('You', text, true);
    input.value = '';

    // Simple Rule-based Logic for the Assistant
    setTimeout(() => {
        let response = "I'm still learning! But you can ask me about 'games', 'marketing', or 'chat'.";
        const lowText = text.toLowerCase();

        if (lowText.includes('hello') || lowText.includes('hi')) response = "Hi! I'm ZenBot, your OmniHub assistant. How's your day going?";
        else if (lowText.includes('game')) response = "We have Space Ranger, Snake, Clicker, Goku, and even Croc Dentist! Which one do you want to play?";
        else if (lowText.includes('market')) response = "The Marketing section has trending products, a cart system, and an EMI calculator ready for you.";
        else if (lowText.includes('chat')) response = "Go to the Group Chat section to create a room. You can even scan QR codes to join your friends!";
        else if (lowText.includes('who are you')) response = "I am ZenBot, the AI assistant built for OmniHub. I help you navigate and find the best features!";

        appendZenBotMsg('🤖 ZenBot', response, false);
    }, 800);
};

function appendZenBotMsg(sender, text, isUser) {
    const msgArea = document.getElementById('zenbot-messages');
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        padding: 10px 14px;
        border-radius: 12px;
        max-width: 85%;
        word-wrap: break-word;
        font-size: 0.85rem;
        background: ${isUser ? 'var(--primary)' : 'rgba(255,255,255,0.05)'};
        color: ${isUser ? 'white' : 'inherit'};
        align-self: ${isUser ? 'flex-end' : 'flex-start'};
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        margin-bottom: 5px;
        animation: fadeIn 0.3s ease;
    `;
    msgDiv.innerHTML = `<strong style="display:block; font-size:0.7rem; opacity:0.7; margin-bottom:4px;">${sender}</strong>${text}`;
    msgArea.appendChild(msgDiv);
    msgArea.scrollTop = msgArea.scrollHeight;
}

// Global Enter key for ZenBot
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'zenbot-input') {
        sendZenBotMessage();
    }
});


