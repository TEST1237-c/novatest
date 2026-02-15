const AUTH_KEY = 'nova_admin_session';

function getAdminCredentials() {
    const u = atob('Tm92YXN0cmVhbTEyeXkhISFycnI=');
    const p = atob('Tm92YXN0cmVhbTEyeSEhIWVlZQ==');
    return { user: u, pass: p };
}

function login(username, password) {
    const { user, pass } = getAdminCredentials();
    if (username === user && password === pass) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ loggedIn: true, at: Date.now() }));
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
}

function isLoggedIn() {
    const session = localStorage.getItem(AUTH_KEY);
    if (!session) return false;
    try {
        const data = JSON.parse(session);
        return data.loggedIn === true;
    } catch (e) {}
    return false;
}

function updateNavAuth() {
    const addLink = document.getElementById('navAdd');
    const loginLink = document.getElementById('navLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const loggedIn = isLoggedIn();

    if (addLink) addLink.style.display = loggedIn ? '' : 'none';
    if (loginLink) {
        loginLink.style.display = '';
        loginLink.href = loggedIn ? 'admin.html' : 'login.html';
        loginLink.textContent = loggedIn ? 'Mon compte' : 'Se connecter';
    }
    if (logoutBtn) {
        logoutBtn.style.display = loggedIn ? '' : 'none';
        logoutBtn.classList.toggle('hidden', !loggedIn);
    }
}
