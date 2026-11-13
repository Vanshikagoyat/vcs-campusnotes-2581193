
/* ==========================================
   CAMPUSNOTES - COMPLETE JAVASCRIPT
   Existing notes are preserved.
   ========================================== */

// STORAGE KEYS
const NOTES_KEY = "campusNotesData";
const TASKS_KEY = "campusNotesTasksV1";
const PROFILE_KEY = "campusNotesProfileV1";
const THEME_KEY = "campusNotesThemeV1";
const REWARDS_KEY = "campusNotesRewardsV1";

// LOAD SAVED DATA
function loadData(key, fallback) {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        return data ?? fallback;
    } catch (error) {
        console.error("Could not load:", key, error);
        return fallback;
    }
}

let notes = loadData(NOTES_KEY, []);
let tasks = loadData(TASKS_KEY, []);
let profile = loadData(PROFILE_KEY, {
    name: "",
    email: "",
    course: "B.Tech Computer Science Engineering",
    year: "Second Year"
});

// Rewards use a separate storage key so existing notes and tasks remain untouched.
let rewardsData = loadData(REWARDS_KEY, {
    xp: 0,
    activeDates: [],
    longestStreak: 0,
    dailyGoal: 2,
    checkInDates: []
});

if (!rewardsData || typeof rewardsData !== "object") {
    rewardsData = { xp: 0, activeDates: [], longestStreak: 0, dailyGoal: 2, checkInDates: [] };
}
rewardsData.xp = Number(rewardsData.xp) || 0;
rewardsData.activeDates = Array.isArray(rewardsData.activeDates) ? rewardsData.activeDates : [];
rewardsData.checkInDates = Array.isArray(rewardsData.checkInDates) ? rewardsData.checkInDates : [];
rewardsData.longestStreak = Number(rewardsData.longestStreak) || 0;
rewardsData.dailyGoal = Math.min(20, Math.max(1, Number(rewardsData.dailyGoal) || 2));

let currentPage = "dashboard";
let editingNoteId = null;
let editingTaskId = null;
let currentMonth = new Date();
let selectedDate = null;
let selectedSubject = "all";

// DOM HELPER
const $ = id => document.getElementById(id);

function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function saveProfile() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function makeId() {
    return Date.now().toString() + Math.random().toString(16).slice(2);
}

function escapeText(value) {
    return String(value ?? "");
}

function todayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// ==========================================
// STUDY STREAK & REWARDS
// ==========================================

function saveRewards() {
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewardsData));
}

function addRewardXP(points, reason) {
    rewardsData.xp += points;
    saveRewards();
    renderRewards();
    console.log(`CampusNotes rewards: +${points} XP (${reason})`);
}

function getDateOffset(dateString, offset) {
    const date = new Date(dateString + "T00:00:00");
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateCurrentStreak() {
    const active = new Set(rewardsData.activeDates);
    let cursor = todayString();

    // If the student has not checked in today, allow yesterday's streak to remain visible.
    if (!active.has(cursor)) {
        cursor = getDateOffset(cursor, -1);
    }

    let streak = 0;
    while (active.has(cursor)) {
        streak++;
        cursor = getDateOffset(cursor, -1);
    }
    return streak;
}

function checkInToday() {
    const today = todayString();

    if (rewardsData.checkInDates.includes(today)) {
        alert("You have already checked in today. Come back tomorrow to continue your streak!");
        return;
    }

    rewardsData.checkInDates.push(today);
    rewardsData.activeDates = [...new Set([...rewardsData.activeDates, today])].sort();
    rewardsData.longestStreak = Math.max(
        rewardsData.longestStreak,
        calculateCurrentStreak()
    );
    rewardsData.xp += 10;

    saveRewards();
    renderRewards();
    alert("Daily check-in complete! You earned 10 XP. Keep going!");
}

function getTodayCompletedTasks() {
    const today = todayString();
    return tasks.filter(task =>
        task.completed && task.completedAt && task.completedAt.slice(0, 10) === today
    ).length;
}

function renderRewards() {
    const streak = calculateCurrentStreak();
    const xp = rewardsData.xp;
    const completedToday = getTodayCompletedTasks();
    const goal = rewardsData.dailyGoal;
    const percentage = Math.min(100, Math.round((completedToday / goal) * 100));

    if ($("currentStreak")) $("currentStreak").textContent = `${streak} ${streak === 1 ? "day" : "days"}`;
    if ($("totalXP")) $("totalXP").textContent = xp;
    if ($("longestStreak")) $("longestStreak").textContent = `${rewardsData.longestStreak} days`;
    if ($("dailyGoalProgress")) $("dailyGoalProgress").style.width = percentage + "%";
    if ($("dailyGoalLabel")) {
        $("dailyGoalLabel").textContent = `${completedToday} of ${goal} tasks completed today`;
    }
    if ($("dailyGoalInput")) $("dailyGoalInput").value = goal;

    const alreadyCheckedIn = rewardsData.checkInDates.includes(todayString());
    if ($("dailyCheckinBtn")) {
        $("dailyCheckinBtn").disabled = alreadyCheckedIn;
        $("dailyCheckinBtn").textContent = alreadyCheckedIn
            ? "✓ Checked in today"
            : "＋ Check in today (+10 XP)";
    }
    if ($("checkinMessage")) {
        $("checkinMessage").textContent = alreadyCheckedIn
            ? "Great work! Your check-in is recorded for today."
            : "Check in today to record your study activity and earn 10 XP.";
    }

    const badges = [
        { icon: "🌱", title: "First Step", detail: "Check in for your first day.", unlocked: rewardsData.activeDates.length >= 1 },
        { icon: "🔥", title: "3-Day Streak", detail: "Reach a 3-day study streak.", unlocked: rewardsData.longestStreak >= 3 },
        { icon: "🚀", title: "7-Day Streak", detail: "Reach a 7-day study streak.", unlocked: rewardsData.longestStreak >= 7 },
        { icon: "💎", title: "XP Collector", detail: "Earn 100 XP.", unlocked: xp >= 100 },
        { icon: "📚", title: "Note Maker", detail: "Create 5 study notes.", unlocked: notes.length >= 5 },
        { icon: "🎯", title: "Goal Getter", detail: "Complete today's task goal.", unlocked: completedToday >= goal },
        { icon: "⭐", title: "Rising Star", detail: "Earn 250 XP.", unlocked: xp >= 250 },
        { icon: "🏆", title: "Study Champion", detail: "Reach a 30-day streak.", unlocked: rewardsData.longestStreak >= 30 }
    ];

    const badgeContainer = $("achievementGrid");
    if (badgeContainer) {
        badgeContainer.innerHTML = "";
        badges.forEach(badge => {
            const card = document.createElement("article");
            card.className = "achievement-card" + (badge.unlocked ? "" : " locked");

            const icon = document.createElement("div");
            icon.className = "achievement-icon";
            icon.textContent = badge.icon;

            const title = document.createElement("h4");
            title.textContent = badge.title;

            const detail = document.createElement("p");
            detail.textContent = badge.unlocked ? "Unlocked" : badge.detail;

            card.append(icon, title, detail);
            badgeContainer.appendChild(card);
        });
    }
}

if ($("dailyCheckinBtn")) {
    $("dailyCheckinBtn").addEventListener("click", checkInToday);
}

if ($("saveDailyGoalBtn")) {
    $("saveDailyGoalBtn").addEventListener("click", () => {
        const requestedGoal = Number($("dailyGoalInput").value);
        if (!Number.isInteger(requestedGoal) || requestedGoal < 1 || requestedGoal > 20) {
            alert("Please choose a daily goal between 1 and 20 tasks.");
            return;
        }
        rewardsData.dailyGoal = requestedGoal;
        saveRewards();
        renderRewards();
        alert("Your daily study goal has been updated.");
    });
}

// ==========================================
// FOCUS MODE / POMODORO TIMER
// ==========================================
const FOCUS_KEY = "campusNotesFocusV1";
const defaultFocusData = {
    settings: { focus: 25, short: 5, long: 15 },
    mode: "focus",
    remainingSeconds: 25 * 60,
    running: false,
    endsAt: null,
    completedSessions: 0,
    totalFocusSeconds: 0,
    sessionDates: []
};
let focusData = loadData(FOCUS_KEY, defaultFocusData);
if (!focusData || typeof focusData !== "object") focusData = { ...defaultFocusData };
focusData.settings = { ...defaultFocusData.settings, ...(focusData.settings || {}) };
focusData.mode = ["focus", "short", "long"].includes(focusData.mode) ? focusData.mode : "focus";
focusData.remainingSeconds = Math.max(0, Number(focusData.remainingSeconds) || focusData.settings[focusData.mode] * 60);
focusData.completedSessions = Number(focusData.completedSessions) || 0;
focusData.totalFocusSeconds = Number(focusData.totalFocusSeconds) || 0;
focusData.sessionDates = Array.isArray(focusData.sessionDates) ? focusData.sessionDates : [];
let focusInterval = null;

function saveFocusData() {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(focusData));
}
function focusDuration(mode) { return Number(focusData.settings[mode]) * 60; }
function formatFocusTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
function focusModeName(mode) {
    return mode === "focus" ? "FOCUS SESSION" : mode === "short" ? "SHORT BREAK" : "LONG BREAK";
}
function renderFocusTimer() {
    const duration = focusDuration(focusData.mode);
    const remaining = focusData.running && focusData.endsAt
        ? Math.max(0, Math.ceil((focusData.endsAt - Date.now()) / 1000))
        : focusData.remainingSeconds;
    focusData.remainingSeconds = remaining;
    const time = $("focusTime");
    if (time) time.textContent = formatFocusTime(remaining);
    if ($("focusModeLabel")) $("focusModeLabel").textContent = focusModeName(focusData.mode);
    if ($("focusStatus")) $("focusStatus").textContent = focusData.running ? "Stay focused — you've got this!" : "Ready when you are";
    if ($("focusStartBtn")) $("focusStartBtn").textContent = focusData.running ? "Pause" : remaining === 0 ? "Start Again" : "Start " + (focusData.mode === "focus" ? "Focus" : "Break");
    document.querySelectorAll("[data-focus-mode]").forEach(button => button.classList.toggle("active", button.dataset.focusMode === focusData.mode));
    const ring = $("focusTimerRing");
    if (ring) {
        const progress = duration > 0 ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 100;
        const ringColor = focusData.mode === "focus" ? "var(--primary)" : "var(--green)";
        ring.style.background = `conic-gradient(${ringColor} ${progress}%, var(--border) ${progress}% 100%)`;
    }
    if ($("focusSessionsCount")) $("focusSessionsCount").textContent = focusData.completedSessions;
    if ($("focusTotalTime")) {
        const totalMinutes = Math.floor(focusData.totalFocusSeconds / 60);
        $("focusTotalTime").textContent = totalMinutes < 60 ? `${totalMinutes} min` : `${Math.floor(totalMinutes / 60)} hr ${totalMinutes % 60} min`;
    }
    if ($("focusTodayCount")) $("focusTodayCount").textContent = focusData.sessionDates.filter(date => date === todayString()).length;
    if ($("focusMinutesInput")) $("focusMinutesInput").value = focusData.settings.focus;
    if ($("shortBreakInput")) $("shortBreakInput").value = focusData.settings.short;
    if ($("longBreakInput")) $("longBreakInput").value = focusData.settings.long;
}
function stopFocusInterval() {
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = null;
}
function completeFocusInterval() {
    stopFocusInterval();
    focusData.running = false;
    focusData.endsAt = null;
    focusData.remainingSeconds = 0;
    if (focusData.mode === "focus") {
        const completedMinutes = focusData.settings.focus;
        focusData.completedSessions += 1;
        focusData.totalFocusSeconds += completedMinutes * 60;
        focusData.sessionDates.push(todayString());
        focusData.mode = "short";
        focusData.remainingSeconds = focusDuration("short");
        saveFocusData();
        addRewardXP(10, "completed focus session");
        alert("Focus session complete! Great work. You earned 10 XP. Take a short break.");
    } else {
        focusData.remainingSeconds = focusDuration(focusData.mode);
        saveFocusData();
        alert("Break complete! You can start your next focus session when ready.");
    }
    renderFocusTimer();
}
function tickFocusTimer() {
    if (!focusData.running || !focusData.endsAt) return;
    const remaining = Math.max(0, Math.ceil((focusData.endsAt - Date.now()) / 1000));
    focusData.remainingSeconds = remaining;
    renderFocusTimer();
    if (remaining <= 0) completeFocusInterval();
}
function startFocusTimer() {
    if (focusData.running) {
        focusData.remainingSeconds = Math.max(0, Math.ceil((focusData.endsAt - Date.now()) / 1000));
        focusData.running = false;
        focusData.endsAt = null;
        stopFocusInterval();
        saveFocusData();
        renderFocusTimer();
        return;
    }
    if (focusData.remainingSeconds <= 0) focusData.remainingSeconds = focusDuration(focusData.mode);
    focusData.running = true;
    focusData.endsAt = Date.now() + focusData.remainingSeconds * 1000;
    saveFocusData();
    stopFocusInterval();
    focusInterval = setInterval(tickFocusTimer, 250);
    renderFocusTimer();
}
function resetFocusTimer() {
    stopFocusInterval();
    focusData.running = false;
    focusData.endsAt = null;
    focusData.remainingSeconds = focusDuration(focusData.mode);
    saveFocusData();
    renderFocusTimer();
}
function selectFocusMode(mode) {
    if (!["focus", "short", "long"].includes(mode)) return;
    stopFocusInterval();
    focusData.mode = mode;
    focusData.running = false;
    focusData.endsAt = null;
    focusData.remainingSeconds = focusDuration(mode);
    saveFocusData();
    renderFocusTimer();
}
function saveFocusSettings() {
    const values = {
        focus: Number($("focusMinutesInput").value),
        short: Number($("shortBreakInput").value),
        long: Number($("longBreakInput").value)
    };
    const limits = { focus: 90, short: 30, long: 60 };
    for (const mode of Object.keys(values)) {
        if (!Number.isInteger(values[mode]) || values[mode] < 1 || values[mode] > limits[mode]) {
            alert(`Please enter a whole number from 1 to ${limits[mode]} for ${mode} duration.`);
            return;
        }
    }
    if (focusData.running) {
        alert("Please pause the timer before changing its durations.");
        return;
    }
    focusData.settings = values;
    focusData.remainingSeconds = focusDuration(focusData.mode);
    saveFocusData();
    renderFocusTimer();
    alert("Timer durations saved successfully.");
}
if ($("focusStartBtn")) $("focusStartBtn").addEventListener("click", startFocusTimer);
if ($("focusResetBtn")) $("focusResetBtn").addEventListener("click", resetFocusTimer);
if ($("saveFocusSettingsBtn")) $("saveFocusSettingsBtn").addEventListener("click", saveFocusSettings);
document.querySelectorAll("[data-focus-mode]").forEach(button => {
    button.addEventListener("click", () => selectFocusMode(button.dataset.focusMode));
});
// Restore a running timer after refresh using its saved end timestamp.
if (focusData.running && focusData.endsAt) {
    if (Date.now() >= focusData.endsAt) {
        focusData.remainingSeconds = 0;
        completeFocusInterval();
    } else {
        focusInterval = setInterval(tickFocusTimer, 250);
    }
} else {
    focusData.running = false;
    focusData.endsAt = null;
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

const pageDetails = {
    dashboard: {
        title: "Dashboard",
        description: "Welcome back! Here's your learning overview."
    },
    notes: {
        title: "My Notes",
        description: "Organise and manage your study notes."
    },
    favourites: {
        title: "Favourites",
        description: "Your most important study notes."
    },
    subjects: {
        title: "Subjects",
        description: "Explore notes organised by subject."
    },
    planner: {
        title: "Study Planner",
        description: "Plan your study sessions and deadlines."
    },
    analytics: {
        title: "Study Analytics",
        description: "Track your learning progress."
    },
    rewards: {
        title: "Study Streak & Rewards",
        description: "Build consistency and celebrate your study progress."
    },
    focus: {
        title: "Focus Mode",
        description: "Use focused study sessions and planned breaks."
    },
    assistant: {
        title: "AI Study Assistant",
        description: "Turn your study material into summaries, explanations, quizzes and flashcards."
    },
    exams: {
        title: "Exam Preparation",
        description: "Plan upcoming exams and track subject-wise revision progress."
    },
    profile: {
        title: "My Profile",
        description: "Manage your student information."
    },
    settings: {
        title: "Settings",
        description: "Customise your CampusNotes experience."
    }
};

function changePage(page) {
    if (!pageDetails[page]) return;

    currentPage = page;

    const dashboard = $("dashboardPage");
    const subjects = $("subjectsPage");
    const planner = $("plannerPage");
    const analytics = $("analyticsPage");
    const rewards = $("rewardsPage");
    const focus = $("focusPage");
    const assistant = $("assistantPage");
    const exams = $("examsPage");
    const profilePage = $("profilePage");
    const settings = $("settingsPage");

    [dashboard, subjects, planner, analytics, rewards, focus, assistant, exams, profilePage, settings]
        .forEach(element => {
            if (element) element.hidden = true;
        });

    if (page === "dashboard" || page === "notes" || page === "favourites") {
        if (dashboard) dashboard.hidden = false;
    } else {
        const pageMap = {
            subjects,
            planner,
            analytics,
            rewards,
            focus,
            assistant,
            exams,
            profile: profilePage,
            settings
        };

        if (pageMap[page]) pageMap[page].hidden = false;
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.page === page
        );
    });

    if ($("pageTitle")) {
        $("pageTitle").textContent = pageDetails[page].title;
    }

    if ($("pageDescription")) {
        $("pageDescription").textContent = pageDetails[page].description;
    }

    if ($("sectionTitle")) {
        $("sectionTitle").textContent =
            page === "favourites" ? "Favourite Notes" :
            page === "notes" ? "All My Notes" :
            "Recent Notes";
    }

    if ($("statsSection")) {
        $("statsSection").hidden = page !== "dashboard";
    }

    if ($("notesWorkspace")) {
        $("notesWorkspace").hidden =
            !["dashboard", "notes", "favourites"].includes(page);
    }

    selectedSubject = "all";

    if ($("subjectFilter")) {
        $("subjectFilter").value = "all";
    }

    renderNotes();
    renderSubjects();
    updateStats();
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        changePage(link.dataset.page);
    });
});

// ==========================================
// NOTES - ADD, EDIT, DELETE AND FAVOURITE
// ==========================================

function openNoteModal(note = null) {
    if (!$("noteModal")) return;

    editingNoteId = note ? note.id : null;

    if ($("modalTitle")) {
        $("modalTitle").textContent = note ? "Edit Note" : "Add New Note";
    }

    if ($("noteTitle")) $("noteTitle").value = note?.title || "";
    if ($("noteSubject")) $("noteSubject").value = note?.subject || "";
    if ($("noteContent")) $("noteContent").value = note?.content || "";

    $("noteModal").hidden = false;
}

function closeNoteModal() {
    if ($("noteModal")) $("noteModal").hidden = true;
    editingNoteId = null;

    if ($("noteForm")) $("noteForm").reset();
}

if ($("addNoteBtn")) {
    $("addNoteBtn").addEventListener("click", () => openNoteModal());
}

if ($("emptyAddBtn")) {
    $("emptyAddBtn").addEventListener("click", () => openNoteModal());
}

if ($("closeModal")) {
    $("closeModal").addEventListener("click", closeNoteModal);
}

if ($("cancelBtn")) {
    $("cancelBtn").addEventListener("click", closeNoteModal);
}

if ($("noteForm")) {
    $("noteForm").addEventListener("submit", event => {
        event.preventDefault();

        const title = $("noteTitle").value.trim();
        const subject = $("noteSubject").value.trim();
        const content = $("noteContent").value.trim();

        if (!title || !subject || !content) {
            alert("Please fill in all note fields.");
            return;
        }

        if (editingNoteId !== null) {
            const index = notes.findIndex(
                note => note.id === editingNoteId
            );

            if (index !== -1) {
                notes[index] = {
                    ...notes[index],
                    title,
                    subject,
                    content,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            notes.unshift({
                id: makeId(),
                title,
                subject,
                content,
                favorite: false,
                createdAt: new Date().toISOString()
            });
            addRewardXP(3, "new study note");
        }

        saveNotes();
        closeNoteModal();
        renderNotes();
        renderSubjects();
        renderAssistantNoteOptions();
        updateStats();
    });
}

function toggleFavourite(id) {
    const note = notes.find(item => item.id === id);
    if (!note) return;

    note.favorite = !note.favorite;
    saveNotes();
    renderNotes();
    updateStats();
}

function deleteNote(id) {
    if (!confirm("Are you sure you want to delete this note?")) return;

    notes = notes.filter(note => note.id !== id);
    saveNotes();

    renderNotes();
    renderSubjects();
    renderAssistantNoteOptions();
    updateStats();
}

function renderNotes() {
    const container = $("notesList");
    const emptyState = $("emptyState");

    if (!container) return;

    container.innerHTML = "";

    const searchText = $("search")
        ? $("search").value.toLowerCase().trim()
        : "";

    const filterValue = $("subjectFilter")
        ? $("subjectFilter").value
        : "all";

    let filteredNotes = [...notes];

    if (currentPage === "favourites") {
        filteredNotes = filteredNotes.filter(note => note.favorite);
    }

    if (filterValue && filterValue !== "all") {
        filteredNotes = filteredNotes.filter(
            note => note.subject === filterValue
        );
    }

    filteredNotes = filteredNotes.filter(note =>
        escapeText(note.title).toLowerCase().includes(searchText) ||
        escapeText(note.content).toLowerCase().includes(searchText) ||
        escapeText(note.subject).toLowerCase().includes(searchText)
    );
    // SORT NOTES
const sortValue = $("sortNotes")
    ? $("sortNotes").value
    : "newest";

if (sortValue === "newest") {
    filteredNotes.sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
} else if (sortValue === "oldest") {
    filteredNotes.sort((a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
} else if (sortValue === "title") {
    filteredNotes.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", undefined, {
            sensitivity: "base"
        })
    );
}

    if (filteredNotes.length === 0) {
        if (emptyState) emptyState.hidden = false;

        if ($("emptyMessage")) {
            $("emptyMessage").textContent =
                currentPage === "favourites"
                    ? "You haven't added any favourite notes yet."
                    : "No notes found. Start adding your study notes!";
        }

        return;
    }

    if (emptyState) emptyState.hidden = true;

    filteredNotes.forEach(note => {
        const card = document.createElement("article");
        card.className = "note-card";

        const subject = document.createElement("span");
        subject.className = "note-subject";
        subject.textContent = note.subject || "General";

        const heading = document.createElement("h3");
        heading.textContent = note.title || "Untitled Note";

        const content = document.createElement("p");
        content.textContent = note.content || "";

        const actions = document.createElement("div");
        actions.className = "note-actions";

        const favouriteButton = document.createElement("button");
        favouriteButton.type = "button";
        favouriteButton.textContent = note.favorite ? "★" : "☆";
        favouriteButton.title = "Favourite";
        favouriteButton.addEventListener("click", () => {
            toggleFavourite(note.id);
        });

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "✎";
        editButton.title = "Edit note";
        editButton.addEventListener("click", () => {
            openNoteModal(note);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "🗑";
        deleteButton.title = "Delete note";
        deleteButton.addEventListener("click", () => {
            deleteNote(note.id);
        });

        actions.append(favouriteButton, editButton, deleteButton);
        card.append(subject, heading, content, actions);
        container.appendChild(card);
    });
}

// SEARCH AND SUBJECT FILTER
if ($("search")) {
    $("search").addEventListener("input", renderNotes);
}

if ($("subjectFilter")) {
    $("subjectFilter").addEventListener("change", renderNotes);
}
// NOTES SORTING
if ($("sortNotes")) {
    $("sortNotes").addEventListener("change", renderNotes);
}

// ==========================================
// SUBJECT-WISE ORGANISATION
// ==========================================

function renderSubjects() {
    const container = $("subjectCards");
    if (!container) return;

    container.innerHTML = "";

    const subjectCounts = {};

    notes.forEach(note => {
        const subject = note.subject || "General";
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    const subjects = Object.entries(subjectCounts);

    if (subjects.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Add notes to see your subjects here.";
        container.appendChild(message);
        return;
    }

    subjects.forEach(([subject, count]) => {
        const card = document.createElement("div");
        card.className = "subject-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");

        const icon = document.createElement("div");
        icon.className = "subject-icon";
        icon.textContent = "📚";

        const heading = document.createElement("h3");
        heading.textContent = subject;

        const description = document.createElement("p");
        description.textContent =
            `${count} ${count === 1 ? "note" : "notes"}`;

        card.append(icon, heading, description);

        const openSubject = () => {
            changePage("notes");
            if ($("subjectFilter")) {
                $("subjectFilter").value = subject;
            }
            renderNotes();
        };

        card.addEventListener("click", openSubject);
        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSubject();
            }
        });

        container.appendChild(card);
    });

    // Update subject filter options
    if ($("subjectFilter")) {
        const currentValue = $("subjectFilter").value;

        $("subjectFilter").innerHTML = "";

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "All Subjects";
        $("subjectFilter").appendChild(allOption);

        subjects.forEach(([subject]) => {
            const option = document.createElement("option");
            option.value = subject;
            option.textContent = subject;
            $("subjectFilter").appendChild(option);
        });

        $("subjectFilter").value =
            subjects.some(([subject]) => subject === currentValue)
                ? currentValue
                : "all";
    }
}

if ($("viewAllSubjectsBtn")) {
    $("viewAllSubjectsBtn").addEventListener("click", () => {
        changePage("notes");
    });
}

// ==========================================
// STUDY PLANNER - TASK MANAGEMENT
// ==========================================

function openTaskModal(task = null) {
    if (!$("taskModal")) return;

    editingTaskId = task ? task.id : null;

    if ($("taskTitle")) $("taskTitle").value = task?.title || "";
    if ($("taskSubject")) $("taskSubject").value = task?.subject || "";
    if ($("taskDate")) {
        $("taskDate").value = task?.date || selectedDate || todayString();
    }
    if ($("taskPriority")) {
        $("taskPriority").value = task?.priority || "Medium";
    }

    $("taskModal").hidden = false;
}

function closeTaskModal() {
    if ($("taskModal")) $("taskModal").hidden = true;
    editingTaskId = null;

    if ($("taskForm")) $("taskForm").reset();
}

if ($("addTaskBtn")) {
    $("addTaskBtn").addEventListener("click", () => openTaskModal());
}

if ($("closeTaskModal")) {
    $("closeTaskModal").addEventListener("click", closeTaskModal);
}

if ($("cancelTaskBtn")) {
    $("cancelTaskBtn").addEventListener("click", closeTaskModal);
}

if ($("taskForm")) {
    $("taskForm").addEventListener("submit", event => {
        event.preventDefault();

        const title = $("taskTitle").value.trim();
        const subject = $("taskSubject").value.trim();
        const date = $("taskDate").value;
        const priority = $("taskPriority").value;

        if (!title || !date) {
            alert("Please enter a task title and due date.");
            return;
        }

        if (editingTaskId !== null) {
            const index = tasks.findIndex(
                task => task.id === editingTaskId
            );

            if (index !== -1) {
                tasks[index] = {
                    ...tasks[index],
                    title,
                    subject,
                    date,
                    priority
                };
            }
        } else {
            tasks.push({
                id: makeId(),
                title,
                subject,
                date,
                priority,
                completed: false
            });
        }

        saveTasks();
        closeTaskModal();
        renderCalendar();
        renderTasks();
        updateStats();
    });
}

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        task.completedAt = new Date().toISOString();
        if (!task.xpAwarded) {
            task.xpAwarded = true;
            addRewardXP(5, "completed study task");
        }
    } else {
        task.completedAt = null;
    }

    saveTasks();
    renderTasks();
    renderCalendar();
    updateStats();
}

function deleteTask(id) {
    if (!confirm("Delete this study task?")) return;

    tasks = tasks.filter(task => task.id !== id);

    saveTasks();
    renderTasks();
    renderCalendar();
    updateStats();
}

function renderTasks() {
    const container = $("taskList");
    if (!container) return;

    container.innerHTML = "";

    let visibleTasks = [...tasks];

    if (selectedDate) {
        visibleTasks = visibleTasks.filter(
            task => task.date === selectedDate
        );
    }

    visibleTasks.sort((a, b) => a.date.localeCompare(b.date));

    if (visibleTasks.length === 0) {
        if ($("emptyTasks")) $("emptyTasks").hidden = false;
        return;
    }

    if ($("emptyTasks")) $("emptyTasks").hidden = true;

    visibleTasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";

        if (task.completed) item.classList.add("completed");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(task.completed);
        checkbox.addEventListener("change", () => toggleTask(task.id));

        const info = document.createElement("div");

        const heading = document.createElement("h4");
        heading.textContent = task.title;

        const details = document.createElement("p");
        details.textContent =
            `${task.subject || "General"} • ${formatDate(task.date)}`;

        info.append(heading, details);

        const priority = document.createElement("span");
        priority.className =
            "priority " + escapeText(task.priority).toLowerCase();
        priority.textContent = task.priority || "Medium";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "✎";
        editButton.title = "Edit task";
        editButton.addEventListener("click", () => openTaskModal(task));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete task";
        deleteButton.addEventListener("click", () => deleteTask(task.id));

        item.append(checkbox, info, priority, editButton, deleteButton);
        container.appendChild(item);
    });
}

// ==========================================
// CALENDAR
// ==========================================

function renderCalendar() {
    const grid = $("calendarGrid");
    if (!grid) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    if ($("calendarMonth")) {
        $("calendarMonth").textContent =
            currentMonth.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric"
            });
    }

    grid.innerHTML = "";

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    dayNames.forEach(day => {
        const label = document.createElement("div");
        label.className = "calendar-day-name";
        label.textContent = day;
        grid.appendChild(label);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < 42; i++) {
        let day;
        let cellMonth = month;
        let cellYear = year;
        let otherMonth = false;

        if (i < firstDay) {
            day = previousMonthDays - firstDay + i + 1;
            cellMonth = month - 1;
            otherMonth = true;
        } else if (i >= firstDay + daysInMonth) {
            day = i - firstDay - daysInMonth + 1;
            cellMonth = month + 1;
            otherMonth = true;
        } else {
            day = i - firstDay + 1;
        }

        const date = new Date(cellYear, cellMonth, day);
        const dateString =
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";
        cell.textContent = day;

        if (otherMonth) cell.classList.add("other-month");
        if (dateString === todayString()) cell.classList.add("today");
        if (dateString === selectedDate) cell.classList.add("selected");

        if (tasks.some(task => task.date === dateString)) {
            cell.classList.add("has-task");
        }

        cell.addEventListener("click", () => {
            selectedDate =
                selectedDate === dateString ? null : dateString;

            renderCalendar();
            renderTasks();
        });

        grid.appendChild(cell);
    }
}

if ($("prevMonthBtn")) {
    $("prevMonthBtn").addEventListener("click", () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });
}

if ($("nextMonthBtn")) {
    $("nextMonthBtn").addEventListener("click", () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateStats() {
    const totalNotes = notes.length;
    const subjects = new Set(
        notes.map(note => note.subject || "General")
    ).size;

    const favourites = notes.filter(note => note.favorite).length;
    const completed = tasks.filter(task => task.completed).length;

    if ($("totalNotes")) $("totalNotes").textContent = totalNotes;
    if ($("totalSubjects")) $("totalSubjects").textContent = subjects;
    if ($("totalFavourites")) {
        $("totalFavourites").textContent = favourites;
    }
    if ($("completedTasks")) {
        $("completedTasks").textContent = completed;
    }

    if ($("totalTasks")) $("totalTasks").textContent = tasks.length;

    if ($("pendingTasks")) {
        $("pendingTasks").textContent = tasks.length - completed;
    }

    if ($("plannerCompleted")) {
        $("plannerCompleted").textContent = completed;
    }

    updateAnalytics();
    renderRewards();
}

// ==========================================
// STUDY ANALYTICS
// ==========================================

function updateAnalytics() {
    const completed = tasks.filter(task => task.completed).length;
    const percentage = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    if ($("analyticsNotes")) {
        $("analyticsNotes").textContent = notes.length;
    }

    if ($("analyticsSubjects")) {
        $("analyticsSubjects").textContent =
            new Set(notes.map(note => note.subject || "General")).size;
    }

    if ($("analyticsCompleted")) {
        $("analyticsCompleted").textContent = completed;
    }

    if ($("analyticsProgress")) {
        $("analyticsProgress").textContent = percentage + "%";
    }

    const progressBar = $("progressAnalytics");

    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }

    const subjectContainer = $("subjectAnalytics");

    if (subjectContainer) {
        subjectContainer.innerHTML = "";

        const counts = {};

        notes.forEach(note => {
            const subject = note.subject || "General";
            counts[subject] = (counts[subject] || 0) + 1;
        });

        Object.entries(counts).forEach(([subject, count]) => {
            const row = document.createElement("div");
            row.className = "progress-item";

            const label = document.createElement("div");
            label.className = "progress-label";

            const name = document.createElement("span");
            name.textContent = subject;

            const number = document.createElement("span");
            number.textContent = count + " notes";

            label.append(name, number);

            const bar = document.createElement("div");
            bar.className = "progress-bar";

            const fill = document.createElement("div");
            fill.className = "progress-fill";
            fill.style.width = Math.round(
                count / Math.max(notes.length, 1) * 100
            ) + "%";

            bar.appendChild(fill);
            row.append(label, bar);
            subjectContainer.appendChild(row);
        });
    }
}

// ==========================================
// DARK MODE
// ==========================================

function applyTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);

    if ($("settingsThemeToggle") &&
        $("settingsThemeToggle").type === "checkbox") {
        $("settingsThemeToggle").checked = isDark;
    }

    if ($("themeToggle")) {
        $("themeToggle").textContent = isDark ? "☀️" : "🌙";
        $("themeToggle").title = isDark ? "Light Mode" : "Dark Mode";
    }
}

function toggleTheme() {
    const isDark = !document.body.classList.contains("dark-mode");

    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    applyTheme(isDark);
}

if ($("themeToggle")) {
    $("themeToggle").addEventListener("click", toggleTheme);
}

if ($("settingsThemeToggle")) {
    const control = $("settingsThemeToggle");

    if (control.type === "checkbox") {
        control.addEventListener("change", () => {
            localStorage.setItem(
                THEME_KEY,
                control.checked ? "dark" : "light"
            );
            applyTheme(control.checked);
        });
    } else {
        control.addEventListener("click", toggleTheme);
    }
}

// ==========================================
// EXPORT NOTES
// ==========================================

function exportNotes() {
    if (notes.length === 0) {
        alert("There are no notes to export.");
        return;
    }

    let text = "CAMPUSNOTES - MY STUDY NOTES\n";
    text += "================================\n\n";

    notes.forEach((note, index) => {
        text += `${index + 1}. ${note.title}\n`;
        text += `Subject: ${note.subject || "General"}\n`;
        text += `Favourite: ${note.favorite ? "Yes" : "No"}\n`;
        text += `Content:\n${note.content}\n`;
        text += "--------------------------------\n\n";
    });

    const blob = new Blob([text], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "CampusNotes_Export.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

if ($("exportTxtBtn")) {
    $("exportTxtBtn").addEventListener("click", exportNotes);
}

if ($("settingsExportBtn")) {
    $("settingsExportBtn").addEventListener("click", exportNotes);
}

if ($("printNotesBtn")) {
    $("printNotesBtn").addEventListener("click", () => {
        window.print();
    });
}

// ==========================================
// PROFILE
// ==========================================

function updateProfileDisplay() {
    const name = profile.name || "Student";

    if ($("profileName")) $("profileName").value = profile.name || "";
    if ($("profileEmail")) $("profileEmail").value = profile.email || "";
    if ($("profileCourse")) $("profileCourse").value = profile.course || "";
    if ($("profileYear")) $("profileYear").value = profile.year || "";

    if ($("sidebarName")) {
        $("sidebarName").textContent = name;
    }

    if ($("profileAvatar") &&
        $("profileAvatar").tagName !== "IMG") {
        $("profileAvatar").textContent =
            name.charAt(0).toUpperCase();
    }

    if ($("sidebarAvatar") &&
        $("sidebarAvatar").tagName !== "IMG") {
        $("sidebarAvatar").textContent =
            name.charAt(0).toUpperCase();
    }
}

if ($("profileForm")) {
    $("profileForm").addEventListener("submit", event => {
        event.preventDefault();

        profile = {
            name: $("profileName").value.trim(),
            email: $("profileEmail").value.trim(),
            course: $("profileCourse").value.trim(),
            year: $("profileYear").value.trim()
        };

        saveProfile();
        updateProfileDisplay();

        alert("Your profile has been saved successfully!");
    });
}


// ==========================================
// LOCAL STUDY ASSISTANT
// This version processes user-provided text locally; no external AI API is used.
// ==========================================

function getAssistantMaterial() {
    const selectedId = $("assistantNoteSelect")?.value || "";
    const selectedNote = notes.find(note => String(note.id) === selectedId);
    const typedText = $("assistantQuestion")?.value.trim() || "";

    if (selectedNote) {
        const noteText = `${selectedNote.title || "Untitled note"}\nSubject: ${selectedNote.subject || "General"}\n\n${selectedNote.content || ""}`;
        return { text: typedText ? `${noteText}\n\nAdditional question: ${typedText}` : noteText, note: selectedNote, question: typedText };
    }
    return { text: typedText, note: null, question: typedText };
}

function assistantSentences(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+|[\n•]+/)
        .map(part => part.trim())
        .filter(part => part.length > 18);
}

function renderAssistantNoteOptions() {
    const select = $("assistantNoteSelect");
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '<option value="">Use my own text below</option>';
    notes.forEach(note => {
        const option = document.createElement("option");
        option.value = String(note.id);
        option.textContent = `${note.title || "Untitled note"}${note.subject ? " — " + note.subject : ""}`;
        select.appendChild(option);
    });
    if (notes.some(note => String(note.id) === previous)) select.value = previous;
}

function showAssistantResponse(text) {
    const output = $("assistantOutput");
    if (output) output.textContent = text;
}

function runStudyAssistant(action) {
    const material = getAssistantMaterial();
    const text = material.text.trim();
    const sentences = assistantSentences(text);
    const output = $("assistantOutput");

    if (!text) {
        showAssistantResponse("Please select one of your saved notes or paste some study material in the text box first.");
        return;
    }

    if (action === "summarize") {
        if (!sentences.length) {
            showAssistantResponse("I could not find enough complete sentences to summarize. Try adding a little more study material.");
            return;
        }
        showAssistantResponse("SUMMARY\n\n" + sentences.slice(0, 5).map((sentence, index) => `${index + 1}. ${sentence}`).join("\n\n"));
        return;
    }

    if (action === "explain") {
        const keyLines = sentences.slice(0, 4);
        const explanation = keyLines.length
            ? keyLines.map((sentence, index) => `Point ${index + 1}: ${sentence}`).join("\n\n")
            : text.slice(0, 900);
        showAssistantResponse("SIMPLE EXPLANATION\n\nHere are the main ideas from your material in a shorter, easier-to-review format:\n\n" + explanation + "\n\nStudy tip: Read one point at a time, then try explaining it aloud in your own words.");
        return;
    }

    if (action === "quiz") {
        if (!sentences.length) {
            showAssistantResponse("Add a few complete sentences to your study material so I can create revision questions.");
            return;
        }
        const questions = sentences.slice(0, 5).map((sentence, index) => {
            const words = sentence.match(/\b[A-Za-z][A-Za-z-]{4,}\b/g) || [];
            const answer = words.sort((a, b) => b.length - a.length)[0];
            const prompt = answer ? sentence.replace(new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "________") : sentence;
            return `Q${index + 1}. Complete the statement:\n${prompt}\nAnswer: ${answer || sentence}`;
        });
        showAssistantResponse("QUICK REVISION QUIZ\n\nTry answering before revealing the answer.\n\n" + questions.join("\n\n"));
        return;
    }

    if (action === "flashcards") {
        if (!sentences.length) {
            showAssistantResponse("Add a few complete sentences to your study material to create flashcards.");
            return;
        }
        const cards = sentences.slice(0, 6).map((sentence, index) =>
            `FLASHCARD ${index + 1}\nFront: What is an important point from your material?\nBack: ${sentence}`
        );
        showAssistantResponse("YOUR FLASHCARDS\n\n" + cards.join("\n\n"));
        return;
    }

    // Ask mode searches the supplied material for sentences related to the question.
    const query = material.question.toLowerCase();
    const terms = query.split(/[^a-z0-9]+/).filter(word => word.length > 2);
    let matches = sentences;
    if (terms.length) {
        matches = sentences
            .map(sentence => ({
                sentence,
                score: terms.reduce((total, term) => total + (sentence.toLowerCase().includes(term) ? 1 : 0), 0)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.sentence);
    }
    if (!matches.length) {
        showAssistantResponse("I could not find a matching point in the selected text. Try asking with keywords that appear in your note, or choose Summarize to review the full material.");
    } else {
        showAssistantResponse("STUDY ASSISTANT RESPONSE\n\n" + matches.slice(0, 4).join("\n\n") + "\n\nThese points are taken from the study material you provided. Review the original note for full context.");
    }
}

document.querySelectorAll("[data-assistant-action]").forEach(button => {
    button.addEventListener("click", () => runStudyAssistant(button.dataset.assistantAction));
});

if ($("assistantNoteSelect")) {
    $("assistantNoteSelect").addEventListener("change", () => {
        const note = notes.find(item => String(item.id) === $("assistantNoteSelect").value);
        if (note && $("assistantQuestion")) $("assistantQuestion").value = "";
    });
}

if ($("copyAssistantResponseBtn")) {
    $("copyAssistantResponseBtn").addEventListener("click", async () => {
        const text = $("assistantOutput")?.textContent || "";
        if (!text.trim()) return;
        try {
            await navigator.clipboard.writeText(text);
            $("copyAssistantResponseBtn").textContent = "Copied!";
            setTimeout(() => $("copyAssistantResponseBtn").textContent = "Copy response", 1600);
        } catch (error) {
            showAssistantResponse(text + "\n\n(Copy was not available in this browser. You can select the text and copy it manually.)");
        }
    });
}


// ==========================================
// EXAM PREPARATION TRACKER
// Uses its own localStorage key; existing notes, tasks and rewards are untouched.
// ==========================================
const EXAM_STORAGE_KEY = "campusNotesExamsV1";
let examRecords = [];

function loadExamRecords() {
    try {
        const saved = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY) || "[]");
        examRecords = Array.isArray(saved) ? saved : [];
    } catch (error) {
        examRecords = [];
    }
}

function saveExamRecords() {
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(examRecords));
}

function getLocalTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function renderExamTracker() {
    const list = $("examList");
    if (!list) return;

    const today = getLocalTodayString();
    const filter = $("examFilter")?.value || "all";
    const total = examRecords.length;
    const completed = examRecords.filter(exam => exam.completed).length;
    const upcoming = examRecords.filter(exam => !exam.completed && exam.date >= today).length;
    const avg = total ? Math.round(examRecords.reduce((sum, exam) => sum + (Number(exam.progress) || 0), 0) / total) : 0;

    if ($("examTotalCount")) $("examTotalCount").textContent = total;
    if ($("examUpcomingCount")) $("examUpcomingCount").textContent = upcoming;
    if ($("examCompletedCount")) $("examCompletedCount").textContent = completed;
    if ($("examAverageProgress")) $("examAverageProgress").textContent = `${avg}%`;

    const visible = examRecords
        .filter(exam => filter === "all" || (filter === "completed" ? exam.completed : (!exam.completed && exam.date >= today)))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (!visible.length) {
        list.innerHTML = '<div class="exam-empty">No exams match this filter. Add an exam or choose another filter.</div>';
        return;
    }

    list.innerHTML = visible.map(exam => {
        const date = new Date(`${exam.date}T00:00:00`);
        const dateLabel = Number.isNaN(date.getTime()) ? exam.date : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
        const status = exam.completed ? "Completed" : (exam.date < today ? "Date passed" : "Upcoming");
        return `
            <article class="exam-card" data-exam-id="${escapeHtml(String(exam.id))}">
                <div class="exam-card-top">
                    <div>
                        <h4>${escapeHtml(exam.subject)}</h4>
                        <div class="exam-card-meta">${escapeHtml(exam.type)} · ${escapeHtml(dateLabel)}</div>
                    </div>
                    <span class="exam-status">${status}</span>
                </div>
                <div class="exam-progress-row"><span>Preparation progress</span><strong>${Number(exam.progress) || 0}%</strong></div>
                <div class="exam-progress-track"><div class="exam-progress-fill" style="width:${Math.max(0, Math.min(100, Number(exam.progress) || 0))}%"></div></div>
                ${exam.notes ? `<p class="exam-card-notes">${escapeHtml(exam.notes)}</p>` : ""}
                <div class="exam-card-actions">
                    ${!exam.completed ? `<input type="range" min="0" max="100" step="5" value="${Math.max(0, Math.min(100, Number(exam.progress) || 0))}" data-exam-progress="${escapeHtml(String(exam.id))}" aria-label="Preparation progress for ${escapeHtml(exam.subject)}">` : ""}
                    ${!exam.completed ? `<button type="button" data-exam-complete="${escapeHtml(String(exam.id))}">Mark complete</button>` : `<button type="button" data-exam-reopen="${escapeHtml(String(exam.id))}">Reopen</button>`}
                    <button type="button" data-exam-delete="${escapeHtml(String(exam.id))}">Delete</button>
                </div>
            </article>`;
    }).join("");
}

function addExamRecord(event) {
    event.preventDefault();
    const subject = $("examSubject")?.value.trim();
    const type = $("examType")?.value || "Other";
    const date = $("examDate")?.value;
    const progress = Number($("examProgress")?.value || 0);
    const notes = $("examNotes")?.value.trim() || "";

    if (!subject || !date) {
        alert("Please enter a subject name and exam date.");
        return;
    }
    examRecords.push({
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `exam-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        subject, type, date, progress, notes, completed: false,
        createdAt: new Date().toISOString()
    });
    saveExamRecords();
    $("examForm").reset();
    if ($("examProgressValue")) $("examProgressValue").textContent = "0%";
    renderExamTracker();
}

function handleExamListAction(event) {
    const progressId = event.target.dataset.examProgress;
    const completeId = event.target.dataset.examComplete;
    const reopenId = event.target.dataset.examReopen;
    const deleteId = event.target.dataset.examDelete;

    if (progressId) {
        const exam = examRecords.find(item => String(item.id) === progressId);
        if (exam) {
            exam.progress = Number(event.target.value);
            saveExamRecords();
            renderExamTracker();
        }
        return;
    }
    if (completeId || reopenId) {
        const id = completeId || reopenId;
        const exam = examRecords.find(item => String(item.id) === id);
        if (exam) {
            exam.completed = Boolean(completeId);
            if (completeId) exam.progress = 100;
            saveExamRecords();
            renderExamTracker();
        }
        return;
    }
    if (deleteId) {
        if (!confirm("Delete this exam from your schedule?")) return;
        examRecords = examRecords.filter(item => String(item.id) !== deleteId);
        saveExamRecords();
        renderExamTracker();
    }
}

if ($("examForm")) $("examForm").addEventListener("submit", addExamRecord);
if ($("examFilter")) $("examFilter").addEventListener("change", renderExamTracker);
if ($("examList")) {
    $("examList").addEventListener("input", handleExamListAction);
    $("examList").addEventListener("click", handleExamListAction);
}
if ($("examProgress") && $("examProgressValue")) {
    $("examProgress").addEventListener("input", () => {
        $("examProgressValue").textContent = `${$("examProgress").value}%`;
    });
}

// ==========================================
// INITIALISE CAMPUSNOTES
// ==========================================

function initialiseCampusNotes() {
    // Preserve previously saved notes.
    if (!Array.isArray(notes)) notes = [];
    if (!Array.isArray(tasks)) tasks = [];

    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(savedTheme === "dark");

    updateProfileDisplay();
    renderSubjects();
    renderNotes();
    renderCalendar();
    renderTasks();
    updateStats();
    renderRewards();
    renderFocusTimer();
    renderAssistantNoteOptions();
    loadExamRecords();
    renderExamTracker();

    changePage("dashboard");

    console.log("CampusNotes loaded successfully!");
}

initialiseCampusNotes();
