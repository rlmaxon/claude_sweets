/**
 * Finding Sweetie - Main Application JavaScript
 * Handles session management, navigation, and service worker registration
 */

// Global session state
let currentUser = null;

/**
 * Check if user is logged in
 */
async function checkSession() {
    try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            updateNavigation(true);
        } else {
            currentUser = null;
            updateNavigation(false);
        }
    } catch (error) {
        console.error('Session check failed:', error);
        updateNavigation(false);
    }
}

/**
 * Update navigation based on authentication status
 */
function updateNavigation(isAuthenticated) {
    const navAuth = document.getElementById('nav-auth');
    const mobileNavAuth = document.getElementById('mobile-nav-auth');

    if (isAuthenticated && currentUser) {
        const authHTML = `
            <div class="flex items-center space-x-4">
                <a href="/profile.html" class="text-gray-700 hover:text-blue-600 font-medium transition">
                    ${currentUser.email}
                </a>
                <button onclick="logout()" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                    Logout
                </button>
            </div>
        `;
        if (navAuth) navAuth.innerHTML = authHTML;
        if (mobileNavAuth) mobileNavAuth.innerHTML = authHTML;
    } else {
        const authHTML = `
            <div class="flex items-center space-x-4">
                <a href="/login.html" class="text-gray-700 hover:text-blue-600 font-medium transition">
                    Login
                </a>
                <a href="/register.html" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    Sign Up
                </a>
            </div>
        `;
        if (navAuth) navAuth.innerHTML = authHTML;
        if (mobileNavAuth) mobileNavAuth.innerHTML = authHTML;
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        updateNavigation(false);
        window.location.href = '/';
    } catch (error) {
        console.error('Logout failed:', error);
        alert('Logout failed. Please try again.');
    }
}

/**
 * Load pet statistics for homepage
 */
async function loadPetCount() {
    try {
        const [lostRes, foundRes] = await Promise.all([
            fetch('/api/pets/lost?limit=1000'),
            fetch('/api/pets/found?limit=1000')
        ]);
        const lost = await lostRes.json();
        const found = await foundRes.json();
        const total = (lost.count || 0) + (found.count || 0);

        // Animate counter
        const counterElement = document.getElementById('pets-registered');
        if (counterElement) {
            animateCounter(counterElement, total);
        }
    } catch (error) {
        console.error('Error loading pet count:', error);
    }
}

/**
 * Animate number counter
 */
function animateCounter(element, target) {
    let current = 0;
    const increment = Math.ceil(target / 50);
    const duration = 1500; // 1.5 seconds
    const stepTime = duration / 50;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = current;
    }, stepTime);
}

/**
 * Mobile menu toggle
 */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
}

/**
 * Service Worker Registration (ONLY ONCE!)
 * This ensures the service worker is registered exactly once per page load
 */
let serviceWorkerRegistered = false;

function registerServiceWorker() {
    // Prevent duplicate registration
    if (serviceWorkerRegistered) {
        console.log('Service worker already registered, skipping...');
        return;
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    serviceWorkerRegistered = true;
                    console.log('✅ Service Worker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.error('❌ Service Worker registration failed:', error);
                });
        });
    }
}

/**
 * Initialize application
 */
function init() {
    console.log('🐾 Finding Sweetie App Initialized');

    // Initialize mobile menu
    initMobileMenu();

    // Check session status
    checkSession();

    // Load pet count on homepage
    if (document.getElementById('pets-registered')) {
        loadPetCount();
    }

    // Register service worker (only once!)
    registerServiceWorker();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Make functions available globally
window.checkSession = checkSession;
window.logout = logout;
window.loadPetCount = loadPetCount;
