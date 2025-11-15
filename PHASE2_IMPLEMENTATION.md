# Phase 2: Frontend Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Design System](#design-system)
4. [Page-by-Page Breakdown](#page-by-page-breakdown)
5. [JavaScript Functions Reference](#javascript-functions-reference)
6. [Testing Frontend Pages](#testing-frontend-pages)
7. [Customization Guide](#customization-guide)
8. [Integration with Backend](#integration-with-backend)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

Phase 2 implements the complete frontend user interface for Finding Sweetie using:
- **HTML5** for structure
- **Tailwind CSS** (via CDN) for styling
- **Vanilla JavaScript** for functionality
- **Responsive design** that works on mobile, tablet, and desktop

### What Was Built

**8 HTML Pages:**
1. index.html - Landing page
2. login.html - User login
3. register.html - Account creation
4. lost-pet.html - Lost pets listing
5. found-pet.html - Found pets listing
6. dashboard.html - User dashboard
7. about.html - About/mission page
8. (Future) pet-details.html - Individual pet details

**JavaScript:**
- app.js - Core application logic and utilities

### Technology Stack

| Technology | Purpose | CDN/Version |
|-----------|---------|-------------|
| Tailwind CSS | Styling framework | `https://cdn.tailwindcss.com` |
| Vanilla JavaScript | Client-side logic | ES6+ |
| Fetch API | Backend communication | Native browser API |
| HTML5 | Page structure | Standard |

---

## File Structure

```
public/
├── index.html              # Home/landing page
├── login.html              # Login page
├── register.html           # Registration page
├── lost-pet.html           # Lost pets listing
├── found-pet.html          # Found pets listing
├── dashboard.html          # User dashboard
├── about.html              # About page
├── js/
│   └── app.js              # Main application JavaScript
├── css/                    # (Future) Custom CSS
└── icons/                  # (Phase 4) PWA icons
```

---

## Design System

### Color Palette

The design uses a calming, soothing color scheme as specified:

**Primary Colors:**
- Blue 600: `#3b82f6` - Primary CTAs, links
- Blue 700: `#2563eb` - Hover states
- Blue 50-200: Gradients and backgrounds

**Secondary Colors:**
- Green 600: `#16a34a` - Found pets, success states
- Red 500: `#ef4444` - Lost pets alert, errors
- Gray 50-900: Text, backgrounds, borders

**Gradients:**
```css
.gradient-bg {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%);
}
```

### Typography

**Font Stack:**
- Primary: Tailwind's default `font-sans`
- Clean, highly legible sans-serif
- Responsive sizing using Tailwind classes

**Text Sizes:**
- Headings: `text-4xl` to `text-6xl` (36px-60px)
- Body: `text-base` to `text-xl` (16px-20px)
- Small text: `text-sm` to `text-xs` (12px-14px)

### Spacing & Layout

**Containers:**
- Max width: `max-w-7xl` (1280px)
- Padding: `px-4 sm:px-6 lg:px-8`
- Centered: `mx-auto`

**Cards:**
```html
<div class="bg-white rounded-xl shadow-lg p-8">
    <!-- Card content -->
</div>
```

**Grid Layouts:**
```html
<!-- 3-column responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Grid items -->
</div>
```

### Icons

Using Unicode emojis for simplicity:
- 🐾 - App logo, general pet icon
- 🐕 - Dogs
- 🐈 - Cats
- 🐦 - Birds
- 🐰 - Rabbits
- 📍 - Location
- 📱 - Contact/notifications

---

## Page-by-Page Breakdown

### 1. index.html (Home Page)

**Purpose:** Landing page for non-authenticated users

**Sections:**
1. **Navigation Bar**
   - Logo with paw emoji
   - Main links (Home, Lost Pets, Found Pets, About)
   - Dynamic auth section (Login/Create Account or Dashboard/Logout)
   - Mobile hamburger menu

2. **Hero Section**
   - Large headline
   - Subtitle description
   - Two CTAs: "View Lost Pets" and "Create Account"

3. **Feature Cards**
   - Report Lost Pets
   - Report Found Pets
   - Connect & Notify

4. **Statistics Section**
   - Pets Registered (dynamic count)
   - Community Driven
   - Free to Use

5. **Final CTA**
   - Gradient background
   - Strong call to action to register

**Key JavaScript:**
```javascript
// Load and animate pet count
async function loadPetCount() {
    const [lostRes, foundRes] = await Promise.all([
        fetch('/api/pets/lost?limit=1000'),
        fetch('/api/pets/found?limit=1000')
    ]);
    const lost = await lostRes.json();
    const found = await foundRes.json();
    const total = (lost.count || 0) + (found.count || 0);
    animateCounter('pets-registered', total);
}
```

**Testing:**
```bash
# Start server
npm start

# Visit in browser
open http://localhost:3000

# Check:
# - Navigation loads
# - Pet count animates
# - CTAs link correctly
# - Responsive on mobile
```

---

### 2. login.html (Login Page)

**Purpose:** Authenticate existing users

**Form Fields:**
- Email (validated as email format)
- Password (required)

**Validation:**
```javascript
// Email validation
if (!isValidEmail(email)) {
    document.getElementById('email-error').textContent = 'Please enter a valid email address';
    document.getElementById('email-error').classList.remove('hidden');
    isValid = false;
}
```

**Flow:**
1. User enters credentials
2. Client-side validation
3. POST to `/api/auth/login`
4. On success: Redirect to `/dashboard.html`
5. On failure: Display error message

**Security Features:**
- No password shown (type="password")
- Error messages don't reveal if email exists
- Session cookie set by backend

**Testing:**
```bash
# Test with existing user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  -c cookies.txt

# Or test in browser:
# 1. Go to http://localhost:3000/login.html
# 2. Enter email: test@example.com
# 3. Enter password: TestPass123
# 4. Click "Log In"
# 5. Should redirect to dashboard
```

---

### 3. register.html (Registration Page)

**Purpose:** Create new user accounts

**Form Sections:**
1. **User Information**
   - Email (required, validated)
   - Password (required, strength validated)
   - Mobile Number (optional, 10 digits)
   - Zip Code (required, 5 digits)

2. **Notification Preferences**
   - Email notifications (checked by default)
   - SMS notifications (unchecked by default)

**Validation Rules:**

| Field | Validation | Error Message |
|-------|-----------|---------------|
| Email | Valid email format | "Please enter a valid email address" |
| Password | 8+ chars, 1 upper, 1 lower, 1 number | "Password must be at least 8 characters with..." |
| Mobile | Exactly 10 digits | "Mobile number must be exactly 10 digits" |
| Zip Code | Exactly 5 digits | "Zip code must be exactly 5 digits" |

**Real-Time Validation:**
```javascript
// Password validation on input
document.getElementById('password').addEventListener('input', (e) => {
    const password = e.target.value;
    const errorEl = document.getElementById('password-error');

    if (password.length > 0 && !isValidPassword(password)) {
        errorEl.textContent = 'Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number';
        errorEl.classList.remove('hidden');
    } else {
        errorEl.classList.add('hidden');
    }
});
```

**Testing Registration:**
```bash
# Test in browser:
# 1. Go to http://localhost:3000/register.html
# 2. Fill in all fields
# 3. Submit
# 4. Should create account and redirect to dashboard

# Verify in database:
sqlite3 database/findingsweetie.db "SELECT email, zip_code FROM users WHERE email='newuser@example.com';"
```

---

### 4. lost-pet.html (Lost Pets Listing)

**Purpose:** Browse and search lost pets

**Features:**
1. **Search & Filter Bar**
   - Zip code input (5 digits)
   - Pet type dropdown (Dog, Cat, Bird, Rabbit, Other)
   - Search button

2. **Pet Cards Grid**
   - Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
   - Each card shows:
     - Pet image or emoji fallback
     - Pet name and type
     - Description (truncated)
     - Location
     - Time posted (relative time)

3. **States:**
   - Loading (spinner)
   - Results (grid of cards)
   - No results (empty state)

**Search Implementation:**
```javascript
async function loadPets() {
    const zip = document.getElementById('zip-filter').value.trim();
    const type = document.getElementById('type-filter').value;

    let url = '/api/pets/lost?limit=100';
    if (zip) url += `&zip=${zip}`;
    if (type) url += `&type=${type}`;

    const response = await fetch(url);
    const data = await response.json();

    // Render pet cards
}
```

**Pet Card Template:**
```html
<div class="bg-white rounded-xl shadow-lg overflow-hidden pet-card cursor-pointer" onclick="viewPet(${pet.id})">
    <div class="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
        ${pet.image_url ? `<img src="${pet.image_url}" class="w-full h-full object-cover">` : `<span class="text-6xl">${getPetEmoji(pet.pet_type)}</span>`}
    </div>
    <div class="p-6">
        <h3 class="text-xl font-bold text-gray-900 mb-2">${escapeHtml(pet.pet_name || 'Unknown Name')}</h3>
        <p class="text-gray-600 mb-2">${escapeHtml(pet.pet_type)} ${pet.pet_breed ? '• ' + escapeHtml(pet.pet_breed) : ''}</p>
        <p class="text-gray-500 text-sm mb-3">${escapeHtml(pet.pet_description || 'No description')}</p>
        <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">📍 ${escapeHtml(pet.last_seen_location || pet.zip_code)}</span>
            <span class="text-gray-400">${timeAgo(pet.created_at)}</span>
        </div>
    </div>
</div>
```

**Testing:**
```bash
# Add test pets first
./test_api.sh

# Then test search:
# 1. Go to http://localhost:3000/lost-pet.html
# 2. Should see lost pets in grid
# 3. Filter by zip code: 12345
# 4. Filter by type: Dog
# 5. Click "Search"
# 6. Results should update
```

---

### 5. found-pet.html (Found Pets Listing)

**Purpose:** Browse and search found pets

**Differences from lost-pet.html:**
- Green color scheme instead of blue
- "FOUND" badge on each card
- Green search button
- Otherwise identical functionality

**Color Customization:**
```html
<!-- Green gradient instead of blue -->
<div class="h-48 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">

<!-- Green badge -->
<div class="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mb-2">FOUND</div>

<!-- Green button -->
<button class="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition">Search</button>
```

---

### 6. dashboard.html (User Dashboard)

**Purpose:** User's private homepage after login

**Requires Authentication:**
```javascript
requireAuth().then(isAuth => {
    if (isAuth) {
        loadDashboard();
    }
    // If not authenticated, redirects to /login.html
});
```

**Sections:**

1. **Welcome Header**
   - Displays user's email
   - Personalized greeting

2. **Quick Actions**
   - Report Lost Pet (blue card)
   - Report Found Pet (green card)
   - Opens modal for pet registration

3. **My Registered Pets**
   - Grid of user's pets
   - Shows status badge (Lost/Found)
   - Pet details
   - Timestamp

4. **User Profile**
   - Email, zip code, mobile
   - Notification preferences
   - Edit profile button

**Add Pet Modal:**
```javascript
function showAddPetModal(status) {
    document.getElementById('pet-status').value = status;
    document.getElementById('modal-title').textContent = `Report ${status} Pet`;
    document.getElementById('add-pet-modal').classList.remove('hidden');
}
```

**Pet Registration Form:**
- Pet Type (dropdown)
- Pet Name (text)
- Breed (text)
- Description (textarea)
- Last Seen Location (text)
- Additional Comments (textarea)
- Has Microchip (checkbox)

**Testing:**
```bash
# Must be logged in first
# 1. Login at /login.html
# 2. Navigate to /dashboard.html
# 3. Click "Report Lost Pet"
# 4. Fill in form
# 5. Submit
# 6. Should see new pet in "My Registered Pets"
```

---

### 7. about.html (About Page)

**Purpose:** Information about Finding Sweetie

**Sections:**
1. Mission Statement
2. How It Works (4 steps)
3. Key Features (6 features in grid)
4. Technology Stack
5. Call to Action

**Content is static** - no dynamic loading required.

---

## JavaScript Functions Reference

### Session Management

#### `checkSession()`
**Purpose:** Check if user is authenticated
**Returns:** `Promise<boolean>`
**Usage:**
```javascript
const isAuthenticated = await checkSession();
if (isAuthenticated) {
    // User is logged in
}
```

#### `requireAuth()`
**Purpose:** Require authentication, redirect if not logged in
**Returns:** `Promise<boolean>`
**Usage:**
```javascript
requireAuth().then(isAuth => {
    if (isAuth) {
        loadDashboardData();
    }
});
```

#### `logout()`
**Purpose:** Log out current user
**Usage:**
```javascript
<button onclick="logout()">Logout</button>
```

---

### Validation Functions

#### `isValidEmail(email)`
**Purpose:** Validate email format
**Returns:** `boolean`
**Example:**
```javascript
if (!isValidEmail('user@example.com')) {
    showError('Invalid email');
}
```

#### `isValidPassword(password)`
**Purpose:** Validate password strength
**Rules:** 8+ chars, 1 uppercase, 1 lowercase, 1 number
**Returns:** `boolean`

#### `isValidPhone(phone)`
**Purpose:** Validate phone number
**Rules:** Exactly 10 digits
**Returns:** `boolean`

#### `isValidZip(zip)`
**Purpose:** Validate zip code
**Rules:** Exactly 5 digits
**Returns:** `boolean`

---

### UI Functions

#### `showNotification(message, type)`
**Purpose:** Display toast notification
**Parameters:**
- `message` (string): Notification text
- `type` (string): 'success', 'error', 'info', or 'warning'

**Usage:**
```javascript
showNotification('Pet registered successfully!', 'success');
showNotification('Login failed', 'error');
```

#### `updateNavbar(isAuthenticated, user)`
**Purpose:** Update navigation based on login status
**Auto-called** by `checkSession()`

---

### Utility Functions

#### `escapeHtml(unsafe)`
**Purpose:** Prevent XSS by escaping HTML
**Usage:**
```javascript
element.innerHTML = escapeHtml(userInput);
```

#### `formatDate(dateString)`
**Purpose:** Format date to readable string
**Returns:** "Nov 14, 2025, 11:30 AM"

#### `timeAgo(dateString)`
**Purpose:** Relative time display
**Returns:** "2 hours ago", "3 days ago", etc.

#### `getQueryParam(param)`
**Purpose:** Get URL query parameter
**Usage:**
```javascript
const petId = getQueryParam('id'); // From ?id=123
```

---

## Testing Frontend Pages

### Manual Testing Checklist

**Homepage (index.html)**
- [ ] Page loads without errors
- [ ] Navigation shows correct links
- [ ] Pet count animates
- [ ] CTAs link to correct pages
- [ ] Mobile menu works
- [ ] Responsive design (resize browser)

**Login (login.html)**
- [ ] Form validation works
- [ ] Can login with valid credentials
- [ ] Error shown for invalid credentials
- [ ] Redirects to dashboard on success
- [ ] Redirects to dashboard if already logged in

**Register (register.html)**
- [ ] All form fields present
- [ ] Email validation works
- [ ] Password strength validation works
- [ ] Mobile number accepts only digits
- [ ] Zip code accepts only 5 digits
- [ ] Account creation successful
- [ ] Redirects to dashboard

**Lost Pets (lost-pet.html)**
- [ ] Pets load and display in grid
- [ ] Search by zip works
- [ ] Filter by type works
- [ ] Empty state shows when no results
- [ ] Loading spinner shows during load
- [ ] Pet cards clickable

**Found Pets (found-pet.html)**
- [ ] Same tests as lost-pet.html
- [ ] Green color scheme
- [ ] "FOUND" badges display

**Dashboard (dashboard.html)**
- [ ] Requires login (redirects if not)
- [ ] Welcome message shows user email
- [ ] User's pets display
- [ ] Can open "Add Pet" modal
- [ ] Can submit new pet
- [ ] Profile information displays

**About (about.html)**
- [ ] All content loads
- [ ] Links work
- [ ] CTA buttons functional

---

### Automated Testing

Create a test script `test_frontend.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing Frontend Pages"
echo "======================"

# Test page accessibility
pages=("/" "/login.html" "/register.html" "/lost-pet.html" "/found-pet.html" "/dashboard.html" "/about.html")

for page in "${pages[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page")
    if [ $status -eq 200 ]; then
        echo "✅ $page - OK ($status)"
    else
        echo "❌ $page - FAIL ($status)"
    fi
done

# Test JavaScript file
js_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/js/app.js")
if [ $js_status -eq 200 ]; then
    echo "✅ /js/app.js - OK"
else
    echo "❌ /js/app.js - FAIL"
fi

echo ""
echo "Frontend testing complete!"
```

---

## Customization Guide

### Changing Colors

**Update Primary Color:**
```javascript
// In Tailwind, replace all instances of:
bg-blue-600    → bg-purple-600
text-blue-600  → text-purple-600
hover:bg-blue-700 → hover:bg-purple-700
```

**Update Gradient:**
```css
/* In each page's <style> section */
.gradient-bg {
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 50%, #your-color-3 100%);
}
```

---

### Adding a New Page

1. **Create HTML file** in `/public/`
2. **Copy navigation from existing page**
3. **Add link to navigation** in all pages
4. **Include app.js** at bottom
5. **Call checkSession()** if needed

**Template:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page - Finding Sweetie</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐾</text></svg>">
    <style>
        .gradient-bg { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%); }
    </style>
</head>
<body class="gradient-bg min-h-screen">
    <!-- Copy nav from index.html -->

    <!-- Your content -->

    <!-- Copy footer from index.html -->

    <script src="/js/app.js"></script>
    <script>
        checkSession();
        // Your page-specific JS
    </script>
</body>
</html>
```

---

### Customizing Forms

**Add New Field:**
```html
<div>
    <label for="new-field" class="block text-sm font-semibold text-gray-700 mb-2">
        Field Label
    </label>
    <input
        type="text"
        id="new-field"
        name="new_field"
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        placeholder="Placeholder text"
    >
    <p id="new-field-error" class="text-red-500 text-sm mt-1 hidden"></p>
</div>
```

**Add Validation:**
```javascript
const newField = document.getElementById('new-field').value.trim();

if (!newField) {
    document.getElementById('new-field-error').textContent = 'This field is required';
    document.getElementById('new-field-error').classList.remove('hidden');
    isValid = false;
}
```

---

## Integration with Backend

### API Endpoints Used

| Page | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| index.html | `/api/pets/lost` | GET | Pet count |
| index.html | `/api/pets/found` | GET | Pet count |
| login.html | `/api/auth/login` | POST | User login |
| register.html | `/api/auth/register` | POST | Create account |
| lost-pet.html | `/api/pets/lost` | GET | Get lost pets |
| found-pet.html | `/api/pets/found` | GET | Get found pets |
| dashboard.html | `/api/user/profile` | GET | User profile |
| dashboard.html | `/api/user/pets` | GET | User's pets |
| dashboard.html | `/api/pets/register` | POST | Register pet |
| All pages | `/api/auth/session` | GET | Check session |
| All pages | `/api/auth/logout` | POST | Logout |

### Fetch Example

```javascript
// GET request
const response = await fetch('/api/pets/lost?zip=12345&type=Dog');
const data = await response.json();

// POST request
const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
});
const data = await response.json();
```

### Error Handling

```javascript
try {
    const response = await fetch('/api/endpoint');

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
    }

    const data = await response.json();
    // Success handling

} catch (error) {
    console.error('Error:', error);
    showNotification('An error occurred', 'error');
}
```

---

## Troubleshooting

### Issue 1: Tailwind CSS Not Loading

**Symptom:** Pages have no styling

**Solution:**
```bash
# Check internet connection (Tailwind loads from CDN)
curl https://cdn.tailwindcss.com

# If offline, download Tailwind locally:
curl -o public/css/tailwind.min.css https://cdn.tailwindcss.com

# Update all pages:
<link href="/css/tailwind.min.css" rel="stylesheet">
```

---

### Issue 2: JavaScript Not Working

**Symptom:** Buttons don't work, no dynamic content

**Check:**
1. Browser console for errors (F12 → Console)
2. app.js is loading: `curl http://localhost:3000/js/app.js`
3. Script tag in HTML: `<script src="/js/app.js"></script>`

**Debug:**
```javascript
// Add at top of app.js
console.log('app.js loaded successfully');

// Test functions
console.log('isValidEmail test:', isValidEmail('test@example.com'));
```

---

### Issue 3: Session Not Persisting

**Symptom:** User logs in but gets logged out on page navigation

**Causes:**
1. Cookies not enabled in browser
2. Session timeout (5 minutes)
3. Backend session configuration

**Debug:**
```javascript
// Check if session exists
fetch('/api/auth/session')
    .then(r => r.json())
    .then(data => console.log('Session:', data));

// Check cookies in browser
// Chrome: F12 → Application → Cookies
```

---

### Issue 4: Forms Not Submitting

**Symptom:** Form submission does nothing or refreshes page

**Check:**
1. Event listener attached: `document.getElementById('form-id').addEventListener('submit', ...)`
2. `e.preventDefault()` called to prevent page refresh
3. No JavaScript errors in console

**Debug:**
```javascript
document.getElementById('form-id').addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted');
    // Rest of logic
});
```

---

### Issue 5: Images Not Displaying

**Symptom:** Pet images show broken image icon

**Causes:**
1. Image path incorrect
2. File doesn't exist
3. File permissions wrong

**Check:**
```bash
# Verify image exists
ls -la uploads/

# Check file is accessible
curl -I http://localhost:3000/uploads/pet-123.jpg

# Fix permissions
chmod 644 uploads/*
```

---

### Issue 6: Mobile Menu Not Working

**Symptom:** Hamburger menu doesn't open on mobile

**Solution:**
```javascript
// Ensure this code is in every page with mobile menu
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
});
```

---

### Issue 7: Validation Not Working

**Symptom:** Forms submit with invalid data

**Check:**
1. Validation functions loaded (in app.js)
2. Validation called before submit
3. `isValid` flag checked

**Debug:**
```javascript
console.log('Email valid:', isValidEmail(email));
console.log('Password valid:', isValidPassword(password));
console.log('Zip valid:', isValidZip(zip));
```

---

## Best Practices

### Security

1. **Always escape user input:**
   ```javascript
   element.textContent = userInput; // Safe
   element.innerHTML = escapeHtml(userInput); // Safe
   element.innerHTML = userInput; // UNSAFE!
   ```

2. **Use HTTPS in production** (required for cookies to work properly)

3. **Never store sensitive data in localStorage** (use secure cookies)

4. **Validate on both client and server** (client validation is convenience, not security)

---

### Performance

1. **Minimize API calls:**
   ```javascript
   // Good: Single call with multiple params
   fetch('/api/pets/lost?zip=12345&type=Dog&limit=100')

   // Bad: Multiple calls
   fetch('/api/pets/lost?zip=12345')
   fetch('/api/pets/lost?type=Dog')
   ```

2. **Use debouncing for search:**
   ```javascript
   const debouncedSearch = debounce(searchPets, 300);
   document.getElementById('search').addEventListener('input', debouncedSearch);
   ```

3. **Lazy load images** (implement in future)

---

### Accessibility

1. **Use semantic HTML:**
   ```html
   <nav>...</nav>
   <main>...</main>
   <footer>...</footer>
   ```

2. **Add ARIA labels:**
   ```html
   <button aria-label="Close modal">×</button>
   ```

3. **Keyboard navigation:**
   - All interactive elements should be focusable
   - Test with Tab key
   - Add focus states

---

### Code Organization

1. **Keep JavaScript modular:**
   ```javascript
   // Group related functions
   const Auth = {
       checkSession,
       login,
       logout,
       requireAuth
   };

   const Validation = {
       isValidEmail,
       isValidPassword,
       isValidPhone,
       isValidZip
   };
   ```

2. **Use consistent naming:**
   - Functions: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Classes: `PascalCase`

3. **Comment complex logic:**
   ```javascript
   // Calculate time difference in seconds for relative time display
   const seconds = Math.floor((now - date) / 1000);
   ```

---

## Success Checklist

Before moving to Phase 3, verify:

- [ ] All 8 pages load successfully
- [ ] Navigation works across all pages
- [ ] Mobile menu functional
- [ ] User can register account
- [ ] User can login/logout
- [ ] Dashboard displays user data
- [ ] Pet listings load and display
- [ ] Search and filter work
- [ ] Forms validate properly
- [ ] Error messages display correctly
- [ ] Success notifications work
- [ ] Session management functional
- [ ] Responsive design on mobile/tablet/desktop
- [ ] No console errors
- [ ] Tailwind CSS loads correctly
- [ ] All API integrations working

---

## Next Steps: Phase 3 - PWA Implementation

Once Phase 2 is complete and tested, proceed to Phase 3:

1. Create `manifest.json` (app metadata)
2. Generate PWA icons (multiple sizes)
3. Implement service worker (`sw.js`)
4. Add offline page
5. Test installation on mobile
6. Configure caching strategies
7. Add background sync
8. (Optional) Implement push notifications

**Phase 2 Complete!** The frontend is now fully functional and ready for PWA enhancement.
