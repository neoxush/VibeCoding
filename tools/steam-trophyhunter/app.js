// Steam Trophy Hunter - Main Application Logic

// State Management
let achievements = [];
let filteredAchievements = [];
let games = [];
let currentGame = 'all'; // 'all' or specific game name

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadAchievements();
    setupEventListeners();
    initializeTheme();
    updateUI();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('filterSelect').addEventListener('change', handleFilter);
}

// Search Handler
function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    applyFilters(query);
}

// Filter Handler
function handleFilter(event) {
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(query);
}

// Apply all filters
function applyFilters(searchQuery = '') {
    const filter = document.getElementById('filterSelect').value;

    // Start with all achievements
    let filtered = [...achievements];

    // Filter by current game
    if (currentGame !== 'all') {
        filtered = filtered.filter(a => a.game === currentGame);
    }

    // Apply search
    if (searchQuery) {
        filtered = filtered.filter(ach =>
            ach.name.toLowerCase().includes(searchQuery) ||
            ach.description.toLowerCase().includes(searchQuery)
        );
    }

    // Apply status filter
    switch (filter) {
        case 'priority':
            filtered = filtered.filter(a =>
                a.priority === 'high' || a.priority === 'medium'
            );
            break;
        case 'favorite':
            filtered = filtered.filter(a => a.favorite);
            break;
        case 'incomplete':
            filtered = filtered.filter(a => !a.achieved);
            break;
        case 'completed':
            filtered = filtered.filter(a => a.achieved);
            break;
    }

    filteredAchievements = filtered;
    renderAchievements();
}

// Switch game tab
function switchGame(gameName, event) {
    currentGame = gameName;

    // Update active tab
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Find and activate the clicked tab
    if (event && event.target) {
        const clickedTab = event.target.closest('.game-tab');
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
    } else {
        // Fallback: find tab by game name
        document.querySelectorAll('.game-tab').forEach(tab => {
            if (tab.textContent.includes(gameName) || (gameName === 'all' && tab.classList.contains('game-tab-all'))) {
                tab.classList.add('active');
            }
        });
    }

    // Apply filters with current game
    const query = document.getElementById('searchInput').value.toLowerCase();
    applyFilters(query);

    // Show/Hide delete button
    const deleteBtn = document.getElementById('deleteGameBtn');
    if (deleteBtn) {
        if (currentGame === 'all') {
            deleteBtn.classList.add('hidden');
        } else {
            deleteBtn.classList.remove('hidden');
        }
    }
}

// Render game tabs
function renderGameTabs() {
    const tabsContainer = document.getElementById('gameTabs');

    if (achievements.length === 0) {
        tabsContainer.innerHTML = '';
        return;
    }

    // Get unique games with counts
    const gameStats = {};
    achievements.forEach(ach => {
        if (!gameStats[ach.game]) {
            gameStats[ach.game] = {
                total: 0,
                completed: 0,
                icon: ach.gameIcon || '�'
            };
        }
        gameStats[ach.game].total++;
        if (ach.achieved) {
            gameStats[ach.game].completed++;
        }
    });

    // Create tabs HTML
    let tabsHTML = `
        <div class="game-tab game-tab-all ${currentGame === 'all' ? 'active' : ''}" onclick="switchGame('all', event)">
            <span class="game-tab-icon">�</span>
            <span class="game-tab-name">All Games</span>
            <span class="game-tab-count">${achievements.length}</span>
        </div>
    `;

    Object.keys(gameStats).sort().forEach(gameName => {
        const stats = gameStats[gameName];
        const escapedName = gameName.replace(/'/g, "\\'");
        tabsHTML += `
            <div class="game-tab ${currentGame === gameName ? 'active' : ''}" onclick="switchGame('${escapedName}', event)">
                <span class="game-tab-icon">${stats.icon}</span>
                <span class="game-tab-name">${gameName}</span>
                <span class="game-tab-count">${stats.completed}/${stats.total}</span>
            </div>
        `;
    });

    tabsContainer.innerHTML = tabsHTML;
}

// Load Demo Data with more games
function loadDemoData() {
    achievements = [
        // Portal 2
        {
            id: '1',
            name: 'Heartbreaker',
            description: 'Complete the game in co-op mode',
            icon: '🎯',
            achieved: false,
            progress: 60,
            priority: 'high',
            favorite: true,
            globalPercentage: 12.5,
            rarity: 'rare',
            game: 'Portal 2',
            gameIcon: '🔵'
        },
        {
            id: '2',
            name: 'Still Alive',
            description: 'Complete the game',
            icon: '🏆',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 78.3,
            rarity: 'common',
            game: 'Portal 2',
            gameIcon: '🔵'
        },
        {
            id: '3',
            name: 'Professor Portal',
            description: 'Complete all test chambers',
            icon: '🎓',
            achieved: false,
            progress: 75,
            priority: 'medium',
            favorite: true,
            globalPercentage: 45.2,
            rarity: 'uncommon',
            game: 'Portal 2',
            gameIcon: '🔵'
        },
        {
            id: '6',
            name: 'Speed Runner',
            description: 'Complete the game in under 2 hours',
            icon: '⚡',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 3.2,
            rarity: 'epic',
            game: 'Portal 2',
            gameIcon: '🔵'
        },
        {
            id: '7',
            name: 'Friendly Fire',
            description: 'Complete co-op without killing your partner',
            icon: '🤝',
            achieved: true,
            progress: 100,
            priority: 'low',
            favorite: false,
            globalPercentage: 56.8,
            rarity: 'common',
            game: 'Portal 2',
            gameIcon: '🔵'
        },

        // Half-Life 2
        {
            id: '4',
            name: 'Lambda Locator',
            description: 'Find all lambda caches',
            icon: '🔍',
            achieved: false,
            progress: 18,
            priority: 'low',
            favorite: false,
            globalPercentage: 23.1,
            rarity: 'uncommon',
            game: 'Half-Life 2',
            gameIcon: '🔶'
        },
        {
            id: '5',
            name: 'Zombie Chopper',
            description: 'Kill 1000 zombies with the gravity gun',
            icon: '⚔️',
            achieved: false,
            progress: 45,
            priority: 'high',
            favorite: false,
            globalPercentage: 8.7,
            rarity: 'rare',
            game: 'Half-Life 2',
            gameIcon: '🔶'
        },
        {
            id: '9',
            name: 'Gravity Master',
            description: 'Kill 50 enemies with physics objects',
            icon: '🌀',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 42.3,
            rarity: 'common',
            game: 'Half-Life 2',
            gameIcon: '🔶'
        },

        // Undertale
        {
            id: '8',
            name: 'Pacifist',
            description: 'Complete the game without killing anyone',
            icon: '☮️',
            achieved: false,
            progress: 30,
            priority: 'medium',
            favorite: true,
            globalPercentage: 15.4,
            rarity: 'rare',
            game: 'Undertale',
            gameIcon: '❤️'
        },
        {
            id: '10',
            name: 'True Hero',
            description: 'Get the true pacifist ending',
            icon: '⭐',
            achieved: false,
            progress: 10,
            priority: 'high',
            favorite: true,
            globalPercentage: 8.9,
            rarity: 'rare',
            game: 'Undertale',
            gameIcon: '❤️'
        },
        {
            id: '11',
            name: 'Determined',
            description: 'Die 100 times',
            icon: '💀',
            achieved: true,
            progress: 100,
            priority: 'low',
            favorite: false,
            globalPercentage: 67.2,
            rarity: 'common',
            game: 'Undertale',
            gameIcon: '❤️'
        },

        // Terraria
        {
            id: '12',
            name: 'Eye on You',
            description: 'Defeat the Eye of Cthulhu',
            icon: '👁️',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 82.5,
            rarity: 'common',
            game: 'Terraria',
            gameIcon: '🌳'
        },
        {
            id: '13',
            name: 'Slayer of Worlds',
            description: 'Defeat every boss',
            icon: '👑',
            achieved: false,
            progress: 35,
            priority: 'high',
            favorite: true,
            globalPercentage: 5.2,
            rarity: 'epic',
            game: 'Terraria',
            gameIcon: '🌳'
        },
        {
            id: '14',
            name: 'Home Sweet Home',
            description: 'Build a house for every NPC',
            icon: '🏠',
            achieved: false,
            progress: 60,
            priority: 'medium',
            favorite: false,
            globalPercentage: 28.7,
            rarity: 'uncommon',
            game: 'Terraria',
            gameIcon: '🌳'
        },

        // Elden Ring (Real Steam Achievements)
        {
            id: '15',
            name: 'Elden Lord',
            description: 'Achieve the "Elden Lord" ending',
            icon: '👑',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 28.4,
            rarity: 'uncommon',
            game: 'Elden Ring',
            gameIcon: '⚔️'
        },
        {
            id: '16',
            name: 'Shardbearer Godrick',
            description: 'Defeated Shardbearer Godrick',
            icon: '🛡️',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 67.8,
            rarity: 'common',
            game: 'Elden Ring',
            gameIcon: '⚔️'
        },
        {
            id: '17',
            name: 'Shardbearer Malenia',
            description: 'Defeated Shardbearer Malenia',
            icon: '⚡',
            achieved: false,
            progress: 15,
            priority: 'high',
            favorite: true,
            globalPercentage: 34.2,
            rarity: 'uncommon',
            game: 'Elden Ring',
            gameIcon: '⚔️'
        },
        {
            id: '18',
            name: 'Legendary Armaments',
            description: 'Acquired all legendary armaments',
            icon: '⚔️',
            achieved: false,
            progress: 40,
            priority: 'medium',
            favorite: false,
            globalPercentage: 8.9,
            rarity: 'rare',
            game: 'Elden Ring',
            gameIcon: '⚔️'
        },
        {
            id: '19',
            name: 'Legendary Ashen Remains',
            description: 'Acquired all legendary ashen remains',
            icon: '🔥',
            achieved: false,
            progress: 25,
            priority: 'low',
            favorite: false,
            globalPercentage: 6.7,
            rarity: 'rare',
            game: 'Elden Ring',
            gameIcon: '⚔️'
        },
        {
            id: '20',
            name: 'Age of the Stars',
            description: 'Achieved the "Age of the Stars" ending',
            icon: '⭐',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 19.3,
            rarity: 'uncommon',
            game: 'Elden Ring',
            gameIcon: '⚔️'
        }
    ];

    filteredAchievements = [...achievements];
    currentGame = 'all';
    saveAchievements();
    updateUI();
    showNotification('Sample data loaded for testing.', 'success');
}

// Render Achievements
function renderAchievements() {
    const listContainer = document.getElementById('achievementList');
    const emptyState = document.getElementById('emptyState');

    if (filteredAchievements.length === 0 && achievements.length === 0) {
        listContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    listContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');

    if (filteredAchievements.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>No achievements match your search</p></div>';
        return;
    }

    listContainer.innerHTML = filteredAchievements.map(ach => createAchievementCard(ach)).join('');
    updateStats();
}

// Create Achievement Card HTML
function createAchievementCard(ach) {
    const completedClass = ach.achieved ? 'completed' : '';
    const priorityClass = `priority-${ach.priority}`;

    return `
        <div class="achievement-card ${completedClass} ${priorityClass}" onclick="toggleAchievement('${ach.id}')">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-content">
                <div class="achievement-header">
                    <span class="achievement-name">${escapeHtml(ach.name)}</span>
                    <div class="achievement-badges">
                        ${ach.favorite ? '<span>⭐</span>' : ''}
                        ${ach.achieved ? '<span style="color: #4caf50;">✓</span>' : ''}
                    </div>
                </div>
                <div class="achievement-description">${escapeHtml(ach.description)}</div>
                ${!ach.achieved ? `
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${ach.progress}%"></div>
                        </div>
                        <span class="progress-text">${ach.progress}%</span>
                    </div>
                ` : ''}
                <div class="achievement-meta">
                    <span class="meta-item">Game: ${escapeHtml(ach.game)}</span>
                    <span class="meta-item">${ach.globalPercentage}% players</span>
                    <span class="meta-item">Rarity: ${ach.rarity}</span>
                </div>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update UI
function updateUI() {
    renderGameTabs();
    renderAchievements();
    updateStats();

    // Sync delete button visibility
    const deleteBtn = document.getElementById('deleteGameBtn');
    if (deleteBtn) {
        if (currentGame === 'all') {
            deleteBtn.classList.add('hidden');
        } else {
            deleteBtn.classList.remove('hidden');
        }
    }
}

// Update Statistics (based on current game filter)
function updateStats() {
    let statsAchievements = achievements;

    // Filter by current game if not "all"
    if (currentGame !== 'all') {
        statsAchievements = achievements.filter(a => a.game === currentGame);
    }

    const total = statsAchievements.length;
    const completed = statsAchievements.filter(a => a.achieved).length;
    const priority = statsAchievements.filter(a => a.priority === 'high' || a.priority === 'medium').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('completedCount').textContent = completed;
}

// Modal Functions
function showAddGameModal() {
    document.getElementById('addGameModal').classList.remove('hidden');
    document.getElementById('appIdInput').value = '';
    document.getElementById('gameNameInput').value = '';
    document.getElementById('appIdInput').focus();
    hideAddGameError();
    hideAddGameLoading();
}

function closeAddGameModal() {
    document.getElementById('addGameModal').classList.add('hidden');
}

function showSettingsModal() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function showAddGameError(message) {
    const errorEl = document.getElementById('addGameError');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideAddGameError() {
    document.getElementById('addGameError').classList.add('hidden');
}

function showAddGameLoading() {
    document.getElementById('addGameLoading').classList.remove('hidden');
}

function hideAddGameLoading() {
    document.getElementById('addGameLoading').classList.add('hidden');
}

// Add Game by App ID - Fetch REAL achievements from Steam
async function addGameByAppId() {
    const appId = document.getElementById('appIdInput').value.trim();
    const gameName = document.getElementById('gameNameInput').value.trim();

    // Validation
    if (!appId) {
        showAddGameError('Please enter a Steam App ID');
        return;
    }

    if (!/^\d+$/.test(appId)) {
        showAddGameError('App ID must be a number');
        return;
    }

    if (!gameName) {
        showAddGameError('Please enter the game name');
        return;
    }

    // Check if game already exists (by name OR by app ID)
    const existingGameByName = achievements.find(a => a.game === gameName);
    if (existingGameByName) {
        showAddGameError(`Game "${gameName}" is already added!`);
        return;
    }

    const existingGameByAppId = achievements.find(a => a.id && a.id.startsWith(appId + '_'));
    if (existingGameByAppId) {
        showAddGameError(`App ID ${appId} is already tracked as "${existingGameByAppId.game}"`);
        return;
    }

    hideAddGameError();
    showAddGameLoading();
    document.getElementById('addGameBtn').disabled = true;

    try {
        // Try to fetch REAL achievements from Steam
        console.log('Fetching real achievements from Steam...');
        const realAchievements = await fetchRealSteamAchievements(appId, gameName);

        if (realAchievements && realAchievements.length > 0) {
            // Add real achievements
            achievements = [...achievements, ...realAchievements];
            filteredAchievements = [...achievements];

            saveAchievements();
            updateUI();
            closeAddGameModal();
            showNotification(`Added ${gameName} with ${realAchievements.length} REAL achievements from Steam!`, 'success');
        } else {
            throw new Error('No achievements found');
        }

    } catch (error) {
        console.error('Add game error:', error);
        // Show specific error message to help debugging
        showAddGameError(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
        hideAddGameLoading();
        document.getElementById('addGameBtn').disabled = false;
    }
}

// Fetch REAL achievements from Steam Community page
async function fetchRealSteamAchievements(appId, gameName) {
    const steamUrl = `https://steamcommunity.com/stats/${appId}/achievements`;

    // Try multiple proxies in order of reliability
    const proxies = [
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(steamUrl)}`, type: 'text' },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(steamUrl)}`, type: 'json' }
    ];

    let html = null;
    let lastError = null;

    for (const proxy of proxies) {
        try {
            console.log(`Trying proxy: ${proxy.url}`);
            const response = await fetch(proxy.url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            if (proxy.type === 'json') {
                const data = await response.json();
                html = data.contents;
            } else {
                html = await response.text();
            }

            if (html && html.includes('achieveRow')) {
                console.log(`Successfully fetched data using ${proxy.url}`);
                break;
            }
        } catch (e) {
            console.warn(`Proxy failed: ${proxy.url}`, e);
            lastError = e;
        }
    }

    if (!html) {
        throw lastError || new Error('All proxies failed to fetch data');
    }

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find achievement rows
    const achievementRows = doc.querySelectorAll('.achieveRow');

    if (achievementRows.length === 0) {
        throw new Error('No achievements found on page or Steam profile is private');
    }

    const realAchievements = [];

    achievementRows.forEach((row, index) => {
        // Get achievement name
        const nameElem = row.querySelector('h3');
        const name = nameElem ? nameElem.textContent.trim() : `Achievement ${index + 1}`;

        // Get description
        const descElem = row.querySelector('h5');
        const description = descElem ? descElem.textContent.trim() : '';

        // Get global percentage
        const percentElem = row.querySelector('.achievePercent');
        let globalPercentage = 0;
        if (percentElem) {
            const percentText = percentElem.textContent.trim().replace('%', '');
            globalPercentage = parseFloat(percentText) || 0;
        }

        // Determine rarity
        let rarity = 'common';
        if (globalPercentage < 5) rarity = 'epic';
        else if (globalPercentage < 15) rarity = 'rare';
        else if (globalPercentage < 40) rarity = 'uncommon';

        // Set consistent icon
        const icon = '🏆';

        realAchievements.push({
            id: `${appId}_${index}`,
            name: name,
            description: description,
            icon: icon,
            achieved: false,
            progress: 0,
            priority: 'medium',
            favorite: false,
            globalPercentage: globalPercentage,
            rarity: rarity,
            game: gameName,
            gameIcon: '🏆'
        });
    });

    console.log(`Successfully fetched ${realAchievements.length} achievements!`);
    return realAchievements;
}

// Create sample achievements for a game
function createAchievementsFromGameData(gameData, appId) {
    // Since we can't get actual achievements without Steam Web API key,
    // we'll create some sample achievements based on the game
    const sampleAchievements = [
        {
            name: 'First Steps',
            description: `Start playing ${gameData.name}`,
            icon: '🎮',
            achieved: false,
            progress: 0,
            priority: 'medium',
            favorite: false,
            globalPercentage: 95.0,
            rarity: 'common'
        },
        {
            name: 'Getting Started',
            description: 'Complete the tutorial or first level',
            icon: '📚',
            achieved: false,
            progress: 0,
            priority: 'medium',
            favorite: false,
            globalPercentage: 75.0,
            rarity: 'common'
        },
        {
            name: 'Dedicated Player',
            description: 'Play for 10 hours',
            icon: '⏰',
            achieved: false,
            progress: 0,
            priority: 'low',
            favorite: false,
            globalPercentage: 45.0,
            rarity: 'uncommon'
        },
        {
            name: 'Master',
            description: 'Complete all main objectives',
            icon: '🏆',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 15.0,
            rarity: 'rare'
        },
        {
            name: 'Perfectionist',
            description: 'Achieve 100% completion',
            icon: '⭐',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 5.0,
            rarity: 'epic'
        }
    ];

    // Generate unique IDs and add game info
    return sampleAchievements.map((ach, index) => ({
        id: `${appId}_${index}`,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        achieved: ach.achieved,
        progress: ach.progress,
        priority: ach.priority,
        favorite: ach.favorite,
        globalPercentage: ach.globalPercentage,
        rarity: ach.rarity,
        game: gameData.name,
        gameIcon: '🎮'
    }));
}

// Clear Data
function clearData() {
    if (confirm('Are you sure you want to clear all data? This will remove all achievements.')) {
        achievements = [];
        filteredAchievements = [];
        currentGame = 'all';
        localStorage.removeItem('achievements');
        closeDataModal();
        updateUI();
        showNotification('All data cleared', 'info');
    }
}

// Theme Management
let currentTheme = 'light';

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    currentTheme = savedTheme;
    applyTheme(currentTheme);
}

function toggleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    currentTheme = themes[nextIndex];

    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);

    const themeNames = { light: '☀️', dark: '🌙', auto: '🔄' };
    document.getElementById('themeBtn').textContent = themeNames[currentTheme];
    showNotification(`Theme: ${currentTheme}`, 'info');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeNames = { light: '☀️', dark: '🌙', auto: '🔄' };
    document.getElementById('themeBtn').textContent = themeNames[theme];
}

// Toggle Achievement Completion
function toggleAchievement(achievementId) {
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement) {
        achievement.achieved = !achievement.achieved;
        achievement.progress = achievement.achieved ? 100 : 0;

        saveAchievements();
        updateUI();

        const status = achievement.achieved ? 'completed' : 'incomplete';
        showNotification(`${achievement.name} marked as ${status}`, 'success');
    }
}

// Copy All Data
function copyAllData() {
    const gameStats = {};
    achievements.forEach(ach => {
        if (!gameStats[ach.game]) {
            gameStats[ach.game] = { total: 0, completed: 0, achievements: [] };
        }
        gameStats[ach.game].total++;
        if (ach.achieved) gameStats[ach.game].completed++;
        gameStats[ach.game].achievements.push({
            name: ach.name,
            description: ach.description,
            completed: ach.achieved,
            priority: ach.priority,
            favorite: ach.favorite,
            globalPercentage: ach.globalPercentage
        });
    });

    let report = '🏆 STEAM TROPHY HUNTER - PROGRESS REPORT\n';
    report += '='.repeat(50) + '\n\n';

    Object.keys(gameStats).forEach(gameName => {
        const stats = gameStats[gameName];
        const percentage = Math.round((stats.completed / stats.total) * 100);

        report += `🎮 ${gameName}\n`;
        report += `   Progress: ${stats.completed}/${stats.total} (${percentage}%)\n`;
        report += `   Achievements:\n`;

        stats.achievements.forEach(ach => {
            const status = ach.completed ? '✅' : '⏳';
            const priority = ach.priority === 'high' ? '🔥' : ach.priority === 'medium' ? '⚡' : '📝';
            const favorite = ach.favorite ? '⭐' : '';
            report += `   ${status} ${ach.name} ${priority}${favorite} (${ach.globalPercentage}%)\n`;
        });
        report += '\n';
    });

    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += 'Created with Steam Trophy Hunter';

    navigator.clipboard.writeText(report).then(() => {
        showNotification('Progress report copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Could not copy to clipboard', 'error');
    });
}

// Data Persistence
function saveAchievements() {
    // Deduplicate by achievement ID before saving (safety net)
    const seen = new Set();
    achievements = achievements.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
    });
    filteredAchievements = [...achievements];
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function loadAchievements() {
    const saved = localStorage.getItem('achievements');
    if (saved) {
        achievements = JSON.parse(saved);

        // Deduplicate on load (cleans up any prior pollution)
        const before = achievements.length;
        const seen = new Set();
        achievements = achievements.filter(a => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            return true;
        });
        if (achievements.length < before) {
            console.log(`Cleaned ${before - achievements.length} duplicate achievements on load`);
            localStorage.setItem('achievements', JSON.stringify(achievements));
        }

        filteredAchievements = [...achievements];
    }
}
// Data Management
function showDataModal() {
    const data = JSON.stringify(achievements);
    document.getElementById('exportInput').value = data;
    document.getElementById('importInput').value = '';
    document.getElementById('importError').classList.add('hidden');
    document.getElementById('dataModal').classList.remove('hidden');
}

function closeDataModal() {
    document.getElementById('dataModal').classList.add('hidden');
}

function exportData() {
    const data = document.getElementById('exportInput').value;
    navigator.clipboard.writeText(data).then(() => {
        closeDataModal();
        showNotification('Data copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Modal stays open — user can manually select & copy
        showNotification('Clipboard not available. Please select the text and copy manually.', 'error');
    });
}

function importData() {
    const input = document.getElementById('importInput').value.trim();
    if (!input) {
        showImportError('Please paste data code first');
        return;
    }

    try {
        const data = JSON.parse(input);

        // Basic validation
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        if (confirm('This will OVERWRITE your current progress. Are you sure?')) {
            achievements = data;
            filteredAchievements = [...achievements];
            saveAchievements();
            updateUI();
            closeDataModal();
            showNotification(`Imported ${achievements.length} achievements!`, 'success');
        }

    } catch (e) {
        console.error(e);
        showImportError('Invalid data format');
    }
}

function showImportError(msg) {
    const el = document.getElementById('importError');
    el.textContent = msg;
    el.classList.remove('hidden');
}


function showAboutModal() {
    document.getElementById('aboutModal').classList.remove('hidden');
}

function closeAboutModal() {
    document.getElementById('aboutModal').classList.add('hidden');
}

// Confirm Delete Game
function confirmDeleteGame() {
    if (currentGame === 'all') return;

    if (confirm(`Are you sure you want to delete "${currentGame}" and all its achievements? This cannot be undone.`)) {
        // Remove achievements for this game
        const initialCount = achievements.length;
        achievements = achievements.filter(a => a.game !== currentGame);
        const deletedCount = initialCount - achievements.length;

        filteredAchievements = [...achievements];
        const deletedGameName = currentGame;

        // Reset to all games
        currentGame = 'all';
        saveAchievements();
        updateUI(); // This will re-render tabs and hide the delete button

        showNotification(`Deleted "${deletedGameName}" and ${deletedCount} achievements.`, 'success');
    }
}

// Notification System
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    // Make errors persistent by default unless duration overrides
    if (type === 'error' && duration === 3000) {
        duration = 0; // Persistent
    }

    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 2000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        cursor: pointer;
    `;

    // Add click to close
    notification.onclick = () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    };

    document.body.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
