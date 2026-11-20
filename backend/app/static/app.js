// ==========================================
// DORWAILA INN'S & SUIT HOTEL MANAGEMENT
// Frontend JavaScript
// ==========================================

const API_BASE = window.location.origin;
const API = `${API_BASE}/api/v1`;

let currentUser = null;

const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");

// ==========================================
// GENERAL HELPERS
// ==========================================

function showMessage(element, message, type = "error") {
    element.textContent = message;
    element.className = `message ${type}`;
}

function hideMessage(element) {
    element.textContent = "";
    element.className = "message hidden";
}

function getToken() {
    return sessionStorage.getItem("dorwaila_token");
}

function clearSession() {
    sessionStorage.removeItem("dorwaila_token");
    currentUser = null;
}

function formatLabel(value) {
    if (!value) return "Not specified";

    return String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return escapeHTML(value);

    return date.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function formatMoney(amount, currency = "SLE") {
    if (amount === null || amount === undefined) return "—";

    return `${currency} ${Number(amount).toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// ==========================================
// API REQUEST HANDLER
// ==========================================

async function apiRequest(endpoint, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearSession();
        showLogin();
        throw new Error("Your session has expired. Please sign in again.");
    }

    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { detail: text };
    }

    if (!response.ok) {
        throw new Error(
            data.detail || `Request failed (${response.status})`
        );
    }

    return data;
}

// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    hideMessage(loginMessage);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const formData = new URLSearchParams();

        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(`${API}/auth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Login failed.");
        }

        sessionStorage.setItem(
            "dorwaila_token",
            data.access_token
        );

        loginForm.reset();

        await loadDashboard();

    } catch (error) {
        showMessage(loginMessage, error.message);
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});

// ==========================================
// SHOW AND HIDE PAGES
// ==========================================

function showLogin() {
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
}

function showDashboard() {
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
}

// ==========================================
// LOAD USER INFORMATION
// ==========================================

async function loadCurrentUser() {
    currentUser = await apiRequest("/auth/me");

    return currentUser;
}

function displayUserInformation(user) {
    const name = user.full_name || "Hotel Staff";
    const email = user.email || "—";

    const department = user.is_general_manager
        ? "General Manager"
        : formatLabel(user.department);

    const initial = name.charAt(0).toUpperCase();

    document.getElementById("sidebarUserName").textContent = name;
    document.getElementById("sidebarUserRole").textContent = department;

    document.getElementById("topbarUserName").textContent = name;
    document.getElementById("welcomeName").textContent = name;

    document.getElementById("userAvatar").textContent = initial;
    document.getElementById("topbarAvatar").textContent = initial;

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = email;
    document.getElementById("profileDepartment").textContent = department;

    document.getElementById("profileStatus").textContent =
        user.is_active ? "Active" : "Inactive";

    configureNavigation(user);
}

// ==========================================
// ROLE-BASED NAVIGATION
// ==========================================

function configureNavigation(user) {
    const isManager = Boolean(user.is_general_manager);

    const department = user.department;

    const allowedSections = isManager
        ? [
            "overview",
            "employees",
            "reports",
            "audit"
        ]
        : department === "front_desk"
        ? [
            "overview",
            "rooms",
            "reservations",
            "payments"
        ]
        : department === "admin_finance"
        ? [
            "overview",
            "expenses",
            "reports"
        ]
        : department === "operations"
        ? [
            "overview",
            "attendance",
            "activities"
        ]
        : [
            "overview",
            "expenses",
            "attendance",
            "activities"
        ];

    document.querySelectorAll(".nav-link").forEach(button => {
        const section = button.dataset.section;

        button.classList.toggle(
            "hidden",
            !allowedSections.includes(section)
        );
    });

    document.getElementById("managerNavigation")
        .classList.toggle("hidden", !isManager);
}

// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {
    try {
        await loadCurrentUser();

        displayUserInformation(currentUser);

        showDashboard();

        hideMessage(dashboardMessage);

        await loadOverview();

    } catch (error) {
        clearSession();
        showLogin();

        showMessage(loginMessage, error.message);
    }
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

async function getRecordCount(endpoint) {
    try {
        const data = await apiRequest(endpoint);

        if (Array.isArray(data)) {
            return data.length;
        }

        if (Array.isArray(data.items)) {
            return data.items.length;
        }

        return "—";

    } catch {
        return "—";
    }
}

async function loadOverview() {
    if (!currentUser) return;

    const department = currentUser.department;
    const isManager = Boolean(currentUser.is_general_manager);

    const tasks = [];

    if (isManager || department === "front_desk") {
        tasks.push(
            getRecordCount("/rooms").then(value => {
                document.getElementById("totalRooms").textContent = value;
            })
        );

        tasks.push(
            getRecordCount("/reservations").then(value => {
                document.getElementById("totalReservations").textContent = value;
            })
        );
    }

    if (isManager || department === "admin_finance" ||
        department === "front_desk" ||
        department === "operations") {

        tasks.push(
            getRecordCount("/expenses").then(value => {
                document.getElementById("totalExpenses").textContent = value;
            })
        );
    }

    // The backend currently exposes payments under individual reservations.
    // A global payment total is therefore not assumed here.

    await Promise.all(tasks);
}

// ==========================================
// NAVIGATION
// ==========================================

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", async () => {
        const section = button.dataset.section;

        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

        const titles = {
            overview: "Dashboard Overview",
            rooms: "Room Management",
            reservations: "Reservations",
            payments: "Payments",
            expenses: "Expense Management",
            attendance: "Staff Attendance",
            activities: "Department Activities",
            employees: "Staff Management",
            reports: "Management Reports",
            audit: "Audit Logs"
        };

        document.getElementById("pageTitle").textContent =
            titles[section] || "Hotel Management";

        if (section === "overview") {
            showOverview();
            await loadOverview();
        } else {
            await loadSection(section);
        }
    });
});

// ==========================================
// OVERVIEW CONTENT
// ==========================================

function showOverview() {
    const content = document.getElementById("contentArea");

    content.innerHTML = `
        <div class="welcome-panel">
            <div>
                <span class="eyebrow">HOTEL MANAGEMENT</span>
                <h2>Welcome back, ${escapeHTML(currentUser.full_name)}</h2>
                <p>
                    Manage hotel operations, staff activities,
                    reservations and financial records.
                </p>
            </div>
            <div class="welcome-icon">🏨</div>
        </div>

        <div class="dashboard-grid">
            <article class="stat-card">
                <div class="stat-icon">▤</div>
                <p>Total Rooms</p>
                <h3 id="totalRooms">—</h3>
                <small>Room records</small>
            </article>

            <article class="stat-card">
                <div class="stat-icon">▣</div>
                <p>Reservations</p>
                <h3 id="totalReservations">—</h3>
                <small>Reservation records</small>
            </article>

            <article class="stat-card">
                <div class="stat-icon">₣</div>
                <p>Payments</p>
                <h3 id="totalPayments">—</h3>
                <small>Available through reservations</small>
            </article>

            <article class="stat-card">
                <div class="stat-icon">↗</div>
                <p>Expenses</p>
                <h3 id="totalExpenses">—</h3>
                <small>Expense records</small>
            </article>
        </div>

        <div class="panel">
            <div class="panel-header">
                <div>
                    <h3>Account Information</h3>
                    <p>Your current hotel system account.</p>
                </div>
                <span class="status-badge">Connected</span>
            </div>

            <div class="information-grid">
                <div>
                    <small>Full Name</small>
                    <strong>${escapeHTML(currentUser.full_name)}</strong>
                </div>
                <div>
                    <small>Email Address</small>
                    <strong>${escapeHTML(currentUser.email)}</strong>
                </div>
                <div>
                    <small>Department</small>
                    <strong>${escapeHTML(
                        currentUser.is_general_manager
                            ? "General Manager"
                            : formatLabel(currentUser.department)
                    )}</strong>
                </div>
                <div>
                    <small>Account Status</small>
                    <strong>${currentUser.is_active ? "Active" : "Inactive"}</strong>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// LOAD INDIVIDUAL SECTIONS
// ==========================================

async function loadSection(section) {
    const content = document.getElementById("contentArea");

    content.innerHTML = `
        <div class="panel">
            <h3>Loading information...</h3>
            <p>Please wait while we contact the hotel API.</p>
        </div>
    `;

    const endpoints = {
        rooms: "/rooms",
        reservations: "/reservations",
        expenses: "/expenses",
        attendance: "/attendance/my/records",
        activities: `/departments/${currentUser.department}/activities`,
        employees: "/manager/users",
        reports: "/manager/reports/summary",
        audit: "/manager/audit-logs"
    };

    if (section === "payments") {
        await loadPayments();
        return;
    }

    const endpoint = endpoints[section];

    if (!endpoint) {
        showSectionError("This section is not available.");
        return;
    }

    try {
        const data = await apiRequest(endpoint);

        renderSection(section, data);

    } catch (error) {
        showSectionError(error.message);
    }
}

// ==========================================
// RENDER TABLES
// ==========================================

function renderSection(section, data) {
    const content = document.getElementById("contentArea");

    let rows = [];

    if (Array.isArray(data)) {
        rows = data;
    } else if (Array.isArray(data.items)) {
        rows = data.items;
    } else {
        content.innerHTML = `
            <div class="panel">
                <h3>${escapeHTML(formatLabel(section))}</h3>
                <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
            </div>
        `;
        return;
    }

    if (rows.length === 0) {
        content.innerHTML = `
            <div class="panel">
                <h3>${escapeHTML(formatLabel(section))}</h3>
                <p>No records are currently available.</p>
            </div>
        `;
        return;
    }

    const columns = Object.keys(rows[0]).filter(key =>
        typeof rows[0][key] !== "object" || rows[0][key] === null
    );

    const tableHead = columns.map(key =>
        `<th>${escapeHTML(formatLabel(key))}</th>`
    ).join("");

    const tableRows = rows.map(row => `
        <tr>
            ${columns.map(key => `
                <td>${escapeHTML(
                    key.endsWith("_at")
                        ? formatDate(row[key])
                        : row[key] ?? "—"
                )}</td>
            `).join("")}
        </tr>
    `).join("");

    content.innerHTML = `
        <div class="panel">
            <div class="panel-header">
                <div>
                    <h3>${escapeHTML(formatLabel(section))}</h3>
                    <p>${rows.length} record(s) retrieved from the hotel system.</p>
                </div>
            </div>

            <div style="overflow-x:auto; margin-top:20px;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr>${tableHead}</tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// ==========================================
// PAYMENTS
// ==========================================

async function loadPayments() {
    const content = document.getElementById("contentArea");

    try {
        const reservations = await apiRequest("/reservations");

        if (!Array.isArray(reservations) || reservations.length === 0) {
            content.innerHTML = `
                <div class="panel">
                    <h3>Payments</h3>
                    <p>No reservations are available to check for payments.</p>
                </div>
            `;
            return;
        }

        const paymentGroups = await Promise.all(
            reservations.map(async reservation => {
                try {
                    const payments = await apiRequest(
                        `/reservations/${reservation.id}/payments`
                    );

                    return Array.isArray(payments) ? payments : [];

                } catch {
                    return [];
                }
            })
        );

        const allPayments = paymentGroups.flat();

        renderSection("payments", allPayments);

    } catch (error) {
        showSectionError(error.message);
    }
}

// ==========================================
// ERROR DISPLAY
// ==========================================

function showSectionError(message) {
    const content = document.getElementById("contentArea");

    content.innerHTML = `
        <div class="panel">
            <h3>Unable to load this section</h3>
            <p>${escapeHTML(message)}</p>
            <p style="margin-top:10px; color:#718096; font-size:12px;">
                Your account may not have permission to access this information.
            </p>
        </div>
    `;
}

// ==========================================
// LOGOUT
// ==========================================

document.getElementById("logoutButton").addEventListener("click", () => {
    clearSession();
    showLogin();
    hideMessage(loginMessage);
    document.getElementById("password").value = "";
});

// ==========================================
// INITIAL STARTUP
// ==========================================

async function startApplication() {
    if (getToken()) {
        await loadDashboard();
    } else {
        showLogin();
    }
}

startApplication();