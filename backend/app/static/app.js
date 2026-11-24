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

    if (section === "employees") {
        await loadEmployeeManagement();
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
// EMPLOYEE AND SHIFT MANAGEMENT (GENERAL MANAGER)
// ==========================================

const employeeDepartments = [
    "admin_finance", "front_desk", "kitchen", "housekeeping",
    "bar", "security", "storekeeping", "operations"
];

async function loadEmployeeManagement() {
    const content = document.getElementById("contentArea");
    try {
        const [employees, shifts] = await Promise.all([
            apiRequest("/manager/users"),
            apiRequest("/attendance/shifts")
        ]);
        renderEmployeeManagement(employees, shifts);
    } catch (error) {
        showSectionError(error.message);
    }
}

function renderEmployeeManagement(employees, shifts) {
    const content = document.getElementById("contentArea");
    const staff = employees.filter(person => !person.is_general_manager);
    const departmentOptions = employeeDepartments.map(department =>
        `<option value="${department}">${escapeHTML(formatLabel(department))}</option>`
    ).join("");
    const employeeOptions = staff.filter(person => person.is_active).map(person =>
        `<option value="${person.id}">${escapeHTML(person.full_name)} — ${escapeHTML(formatLabel(person.department))}</option>`
    ).join("");

    const employeeRows = staff.map(person => `
        <tr>
            <td>${escapeHTML(person.full_name)}</td>
            <td>${escapeHTML(person.email)}</td>
            <td>${escapeHTML(formatLabel(person.department))}</td>
            <td><span class="status-pill">${person.is_active ? "Active" : "Inactive"}</span></td>
            <td>
                <button class="btn-secondary staff-toggle" data-id="${person.id}" data-active="${person.is_active}">
                    ${person.is_active ? "Deactivate" : "Activate"}
                </button>
            </td>
        </tr>
    `).join("");

    const shiftRows = shifts.map(shift => {
        const person = staff.find(item => item.id === shift.employee_id);
        return `<tr>
            <td>${escapeHTML(person ? person.full_name : "Staff member")}</td>
            <td>${escapeHTML(formatLabel(shift.department))}</td>
            <td>${escapeHTML(formatDate(shift.shift_start_at))}</td>
            <td>${escapeHTML(formatDate(shift.shift_end_at))}</td>
            <td>${escapeHTML(shift.notes || "—")}</td>
        </tr>`;
    }).join("");

    content.innerHTML = `
        <div class="panel staff-panel">
            <div class="panel-header">
                <div><h3>Create Staff Account</h3><p>Add a member of the hotel team.</p></div>
            </div>
            <form id="createStaffForm" class="staff-form">
                <label>Full name<input name="full_name" required minlength="2" maxlength="160"></label>
                <label>Email address<input name="email" type="email" required maxlength="320"></label>
                <label>Temporary password<input name="password" type="password" required minlength="12" maxlength="256" autocomplete="new-password"><small>At least 12 characters. Share it securely and ask the employee to change it if your system supports password changes.</small></label>
                <label>Department<select name="department" required>${departmentOptions}</select></label>
                <label class="check-label"><input name="expense_approver" type="checkbox"> Can approve expenses (Admin &amp; Finance only)</label>
                <button class="btn-primary" type="submit">Create Staff Account</button>
                <p id="staffFormMessage" class="message hidden" role="status"></p>
            </form>
        </div>

        <div class="panel staff-panel">
            <div class="panel-header"><div><h3>Assign Staff Shift</h3><p>Schedule a shift for an active employee. Times use your device's local time.</p></div></div>
            <form id="assignShiftForm" class="staff-form">
                <label>Employee<select name="employee_id" required>${employeeOptions}</select></label>
                <label>Shift type<select name="shift_type" id="shiftType">
                    <option value="morning">Morning (06:00–14:00)</option>
                    <option value="afternoon">Afternoon (14:00–22:00)</option>
                    <option value="night">Night (22:00–06:00 next day)</option>
                    <option value="custom">Custom times</option>
                </select></label>
                <label>Shift start<input name="shift_start" id="shiftStart" type="datetime-local" required></label>
                <label>Shift end<input name="shift_end" id="shiftEnd" type="datetime-local" required></label>
                <label>Notes (optional)<input name="notes" maxlength="2000" placeholder="e.g. Covering for another employee"></label>
                <button class="btn-primary" type="submit" ${employeeOptions ? "" : "disabled"}>Assign Shift</button>
                <p id="shiftFormMessage" class="message hidden" role="status"></p>
            </form>
        </div>

        <div class="panel staff-panel">
            <div class="panel-header"><div><h3>Staff Directory</h3><p>${staff.length} employee account(s).</p></div></div>
            <div class="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Account</th></tr></thead>
            <tbody>${employeeRows || '<tr><td colspan="5">No staff accounts yet.</td></tr>'}</tbody></table></div>
        </div>

        <div class="panel staff-panel">
            <div class="panel-header"><div><h3>Shift Schedule</h3><p>Recently scheduled shifts.</p></div></div>
            <div class="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Starts</th><th>Ends</th><th>Notes</th></tr></thead>
            <tbody>${shiftRows || '<tr><td colspan="5">No shifts assigned yet.</td></tr>'}</tbody></table></div>
        </div>
    `;

    const shiftType = document.getElementById("shiftType");
    const startInput = document.getElementById("shiftStart");
    const endInput = document.getElementById("shiftEnd");
    const localInputValue = (date) => {
        const pad = value => String(value).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    const setPreset = () => {
        if (shiftType.value === "custom") return;
        const date = startInput.value ? new Date(startInput.value) : new Date();
        if (!startInput.value) date.setMinutes(0, 0, 0);
        const [startHour, endHour] = shiftType.value === "morning" ? [6, 14]
            : shiftType.value === "afternoon" ? [14, 22] : [22, 6];
        date.setHours(startHour, 0, 0, 0);
        const end = new Date(date);
        end.setHours(endHour, 0, 0, 0);
        if (end <= date) end.setDate(end.getDate() + 1);
        startInput.value = localInputValue(date);
        endInput.value = localInputValue(end);
    };
    shiftType.addEventListener("change", setPreset);
    startInput.addEventListener("change", () => {
        if (shiftType.value !== "custom") setPreset();
    });
    setPreset();

    document.getElementById("createStaffForm").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const message = document.getElementById("staffFormMessage");
        const values = new FormData(form);
        const department = values.get("department");
        try {
            await apiRequest("/manager/users", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    full_name: values.get("full_name").trim(),
                    email: values.get("email").trim(),
                    password: values.get("password"),
                    department,
                    expense_approver: values.get("expense_approver") === "on"
                })
            });
            showMessage(message, "Staff account created successfully.", "success");
            form.reset();
            await loadEmployeeManagement();
        } catch (error) {
            showMessage(message, error.message);
        }
    });

    document.getElementById("assignShiftForm").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const message = document.getElementById("shiftFormMessage");
        const values = new FormData(form);
        const start = new Date(values.get("shift_start"));
        const end = new Date(values.get("shift_end"));
        if (!values.get("employee_id")) {
            showMessage(message, "Create a staff account before assigning a shift.");
            return;
        }
        if (!(end > start)) {
            showMessage(message, "Shift end must be later than shift start.");
            return;
        }
        try {
            await apiRequest("/attendance/shifts", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    employee_id: values.get("employee_id"),
                    shift_start_at: start.toISOString(),
                    shift_end_at: end.toISOString(),
                    notes: values.get("notes") || null
                })
            });
            showMessage(message, "Shift assigned successfully.", "success");
            await loadEmployeeManagement();
        } catch (error) {
            showMessage(message, error.message);
        }
    });

    content.querySelectorAll(".staff-toggle").forEach(button => {
        button.addEventListener("click", async () => {
            const action = button.dataset.active === "true" ? "disable" : "enable";
            if (!confirm(`Are you sure you want to ${action} this staff account?`)) return;
            try {
                await apiRequest(`/manager/users/${button.dataset.id}/${action}`, {method: "PATCH"});
                await loadEmployeeManagement();
            } catch (error) {
                alert(error.message);
            }
        });
    });
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