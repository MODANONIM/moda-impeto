/* ===============================================
   Admin Authentication & Session Management
   =============================================== */

const AUTH_CONFIG = {
    tokenKey: 'adminToken',
    loginPage: 'login.html',
    idleTimeout: 20 * 60 * 1000, // 20 minutes in milliseconds
    refreshThreshold: 5 * 60 * 1000 // Refresh if less than 5 minutes remain
};

let idleTimer;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Auth on Load
    if (!checkAuth()) return;

    // 2. Start Idle Timer
    resetIdleTimer();

    // 3. Monitor Activity
    ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, () => {
            resetIdleTimer();
        }, { passive: true });
    });

    // 4. Initial Token Verification & Schedule Refresh
    verifyAndScheduleRefresh();
});

// --- Authentication Check ---
function checkAuth() {
    // Verify we are not on the login page to avoid infinite redirect loop
    if (window.location.pathname.endsWith(AUTH_CONFIG.loginPage)) return false;

    const token = sessionStorage.getItem(AUTH_CONFIG.tokenKey);
    if (!token) {
        console.warn('No token found in sessionStorage. Redirecting to login.');
        window.location.href = AUTH_CONFIG.loginPage;
        return false;
    }
    return true;
}

// --- Logout ---
function logout() {
    sessionStorage.removeItem(AUTH_CONFIG.tokenKey);
    window.location.href = AUTH_CONFIG.loginPage;
}

// Expose logout globally for buttons
window.logout = logout;

// --- Idle Timer Logic ---
function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        alert('一定時間操作がなかったため、ログアウトしました。');
        logout();
    }, AUTH_CONFIG.idleTimeout);
}

// --- API Wrapper ---
async function fetchWithAuth(url, options = {}) {
    let token = sessionStorage.getItem(AUTH_CONFIG.tokenKey);

    // Optimistic check: if token is missing, fail early
    if (!token) {
        logout();
        return Promise.reject('No token');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await fetch(url, { ...options, headers });

        // Handle Unauthorized
        if (res.status === 401 || res.status === 403) {
            // Try explicit refresh
            const refreshed = await refreshToken();
            if (refreshed) {
                // Retry original request with new token
                token = sessionStorage.getItem(AUTH_CONFIG.tokenKey);
                headers['Authorization'] = `Bearer ${token}`;
                return fetch(url, { ...options, headers });
            } else {
                logout();
                return Promise.reject('Session expired');
            }
        }

        return res;
    } catch (err) {
        throw err;
    }
}

// Expose fetchWithAuth globally
window.fetchWithAuth = fetchWithAuth;

// --- Token Management ---
async function refreshToken() {
    const token = sessionStorage.getItem(AUTH_CONFIG.tokenKey);
    if (!token) return false;

    try {
        const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem(AUTH_CONFIG.tokenKey, data.token);
            console.log('Token refreshed.');
            return true;
        }
        return false;
    } catch (err) {
        console.error('Refresh failed:', err);
        return false;
    }
}

async function verifyAndScheduleRefresh() {
    const token = sessionStorage.getItem(AUTH_CONFIG.tokenKey);
    if (!token) return;

    try {
        const res = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const expiresInMs = data.expiresIn * 1000;

            // If token is about to expire (e.g. within 5 mins) and user is active, refresh it
            // Actually, let's just schedule a refresh before it expires
            const refreshIn = Math.max(0, expiresInMs - AUTH_CONFIG.refreshThreshold);

            if (refreshIn > 0) {
                setTimeout(async () => {
                    // Only refresh if user is still active (timer hasn't fired)
                    // We can check if token still exists
                    if (sessionStorage.getItem(AUTH_CONFIG.tokenKey)) {
                        await refreshToken();
                        verifyAndScheduleRefresh(); // Reschedule
                    }
                }, refreshIn);
            } else {
                // Token already close to expiry, refresh immediately
                await refreshToken();
                // If successful, it will set a new token, we should verify again to schedule next
                // But avoid infinite loop if refresh fails or returns short life
            }
        }
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

// Attach logout listener to button if it exists
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
