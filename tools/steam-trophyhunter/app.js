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
    updateUI();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('filterSelect').addEventListener('change', handleFilter);
    document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
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
                icon: ach.gameIcon || '🎮'
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
            <span class="game-tab-icon">🎮</span>
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
    showNotification('Demo data loaded! Now showing 5 games with 20 achievements', 'success');
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
        <div class="achievement-card ${completedClass} ${priorityClass}">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-content">
                <div class="achievement-header">
                    <span class="achievement-name">${ach.name}</span>
                    <div class="achievement-badges">
                        ${ach.favorite ? '<span>⭐</span>' : ''}
                        ${ach.achieved ? '<span style="color: #4caf50;">✓</span>' : ''}
                    </div>
                </div>
                <div class="achievement-description">${ach.description}</div>
                ${!ach.achieved ? `
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${ach.progress}%"></div>
                        </div>
                        <span class="progress-text">${ach.progress}%</span>
                    </div>
                ` : ''}
                <div class="achievement-meta">
                    <span class="meta-item">🎮 ${ach.game}</span>
                    <span class="meta-item">🌍 ${ach.globalPercentage}% global</span>
                    <span class="meta-item">💎 ${ach.rarity}</span>
                </div>
            </div>
        </div>
    `;
}

// Update UI
function updateUI() {
    renderGameTabs();
    renderAchievements();
    updateStats();
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
    document.getElementById('priorityCount').textContent = priority;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
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
    
    // Check if game already exists
    const existingGame = achievements.find(a => a.game === gameName);
    if (existingGame) {
        showAddGameError('This game is already added!');
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
        console.error('Error fetching real achievements:', error);
        console.log('Falling back to sample achievements...');
        
        // Fallback: Create sample achievements
        const gameData = { appId: appId, name: gameName, type: 'game' };
        const newAchievements = createAchievementsFromGameData(gameData, appId);
        
        achievements = [...achievements, ...newAchievements];
        filteredAchievements = [...achievements];
        
        saveAchievements();
        updateUI();
        closeAddGameModal();
        showNotification(`Added ${gameName} with ${newAchievements.length} sample achievements (couldn't fetch real data)`, 'info');
        
    } finally {
        hideAddGameLoading();
        document.getElementById('addGameBtn').disabled = false;
    }
}

// Fetch REAL achievements from Steam Community page
async function fetchRealSteamAchievements(appId, gameName) {
    try {
        // Use CORS proxy to fetch Steam achievements page
        const corsProxy = 'https://api.allorigins.win/get?url=';
        const steamUrl = `https://steamcommunity.com/stats/${appId}/achievements`;
        const proxyUrl = corsProxy + encodeURIComponent(steamUrl);
        
        console.log('Fetching from:', steamUrl);
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (!data.contents) {
            throw new Error('No data received');
        }
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        
        // Find achievement rows
        const achievementRows = doc.querySelectorAll('.achieveRow');
        
        if (achievementRows.length === 0) {
            throw new Error('No achievements found on page');
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
            
            // Get icon (use emoji for now)
            let icon = '🏆';
            if (globalPercentage < 10) icon = '⭐';
            else if (globalPercentage < 30) icon = '💎';
            else if (globalPercentage < 60) icon = '🎯';
            else icon = '🎮';
            
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
                gameIcon: '🎮'
            });
        });
        
        console.log(`Successfully fetched ${realAchievements.length} real achievements!`);
        return realAchievements;
        
    } catch (error) {
        console.error('Failed to fetch real achievements:', error);
        throw error;
    }
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
        updateUI();
        showNotification('All data cleared', 'info');
    }
}

// Data Persistence
function saveAchievements() {
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function loadAchievements() {
    const saved = localStorage.getItem('achievements');
    if (saved) {
        achievements = JSON.parse(saved);
        filteredAchievements = [...achievements];
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
