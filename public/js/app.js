// Finding Sweetie - Main Application JavaScript

// Global state
let currentUser = null;

// Check session status
async function checkSession() {
    try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            updateNavbar(true, data.user);
        } else {
            currentUser = null;
            updateNavbar(false);
        }

        return data.authenticated;
    } catch (error) {
        console.error('Error checking session:', error);
        updateNavbar(false);
        return false;
    }
}

// Update navbar based on authentication status
function updateNavbar(isAuthenticated, user = null) {
    const navAuth = document.getElementById('nav-auth');
    const mobileNavAuth = document.getElementById('mobile-nav-auth');

    if (isAuthenticated && user) {
        // Desktop nav
        if (navAuth) {
            navAuth.innerHTML = `
                <div class="flex items-center space-x-4">
                    <a href="/dashboard.html" class="text-gray-700 hover:text-blue-600 font-medium transition">
                        Dashboard
                    </a>
                    <span class="text-gray-600">👤 ${escapeHtml(user.email)}</span>
                    <button onclick="logout()" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                        Logout
                    </button>
                </div>
            `;
        }

        // Mobile nav
        if (mobileNavAuth) {
            mobileNavAuth.innerHTML = `
                <div class="space-y-2">
                    <a href="/dashboard.html" class="block px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md">
                        Dashboard
                    </a>
                    <div class="px-3 py-2 text-gray-600">
                        👤 ${escapeHtml(user.email)}
                    </div>
                    <button onclick="logout()" class="w-full text-left px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                        Logout
                    </button>
                </div>
            `;
        }
    } else {
        // Desktop nav
        if (navAuth) {
            navAuth.innerHTML = `
                <div class="flex items-center space-x-4">
                    <a href="/login.html" class="text-gray-700 hover:text-blue-600 font-medium transition">
                        Login
                    </a>
                    <a href="/register.html" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        Create Account
                    </a>
                </div>
            `;
        }

        // Mobile nav
        if (mobileNavAuth) {
            mobileNavAuth.innerHTML = `
                <div class="space-y-2">
                    <a href="/login.html" class="block px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md">
                        Login
                    </a>
                    <a href="/register.html" class="block px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Create Account
                    </a>
                </div>
            `;
        }
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            currentUser = null;
            showNotification('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            showNotification('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed', 'error');
    }
}

// Show notification/toast
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification-toast');
    existing.forEach(el => el.remove());

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Require authentication
async function requireAuth() {
    const isAuthenticated = await checkSession();
    if (!isAuthenticated) {
        showNotification('Please log in to access this page', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return false;
    }
    return true;
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone number (10 digits)
function isValidPhone(phone) {
    const re = /^\d{10}$/;
    return re.test(phone);
}

// Validate zip code (5 digits)
function isValidZip(zip) {
    const re = /^\d{5}$/;
    return re.test(zip);
}

// Validate password strength
function isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(password);
}

// Show loading spinner
function showLoading(element) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    `;
    element.appendChild(spinner);
}

// Hide loading spinner
function hideLoading(element) {
    const spinner = element.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format time ago
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }

    return 'just now';
}

// Get query parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Session timeout warning (300 seconds = 5 minutes)
let sessionTimeout;
let sessionWarningTimeout;

function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    clearTimeout(sessionWarningTimeout);

    // Warning at 4 minutes
    sessionWarningTimeout = setTimeout(() => {
        showNotification('Your session will expire in 1 minute', 'warning');
    }, 240000);

    // Logout at 5 minutes
    sessionTimeout = setTimeout(() => {
        showNotification('Session expired. Please log in again.', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    }, 300000);
}

// Reset timeout on user activity
if (currentUser) {
    ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, debounce(resetSessionTimeout, 1000));
    });
    resetSessionTimeout();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle fetch errors globally
async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Export for use in other scripts
window.FindingSweetie = {
    checkSession,
    updateNavbar,
    logout,
    showNotification,
    escapeHtml,
    formatDate,
    requireAuth,
    isValidEmail,
    isValidPhone,
    isValidZip,
    isValidPassword,
    showLoading,
    hideLoading,
    debounce,
    timeAgo,
    getQueryParam,
    safeFetch,
    currentUser
};
