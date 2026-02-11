// Steam Trophy Hunter - Main Application Logic

// State Management
let achievements = [];
let filteredAchievements = [];
let games = [];
let currentGame = 'all'; // 'all' or specific game name
let aiPreference = 'gemini'; // Default AI provider
let guideLanguage = 'Chinese'; // Default language for AI guides
let selectedAchievementId = null; // Track which achievement opened the modal

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing sync...');
    try {
        loadAchievements();
        loadAiPreference(); // Restore AI settings
        setupEventListeners();
        initializeTheme();

        // Final sync of the UI state
        updateUI();

        console.log(`[App] Started. Tracking ${achievements.length} achievements.`);
    } catch (e) {
        console.error("[App] Fatal startup error:", e);
    }
});

// Event Listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('paste', handleSearchPaste);
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', handleFilter);
    }
}

// Search Handler
function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    applyFilters(query);
}

// Filter Handler
function handleFilter(event) {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    applyFilters(query);
}

// Paste Handler for Search Bar (Smart Sync Detection)
function handleSearchPaste(event) {
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');

    // Detect Steam Achievement list or JSON Data
    const isSteamText = pastedText.length > 300 && (pastedText.includes('Unlocked') || pastedText.includes('earned') || pastedText.includes('@'));
    const isJson = (pastedText.trim().startsWith('[') || pastedText.trim().startsWith('{')) && pastedText.length > 50;

    if (isSteamText || isJson) {
        event.preventDefault(); // Don't put the huge text in the search box
        showSyncModal(pastedText);
    }
}

// Apply all filters
function applyFilters(searchQuery = '') {
    const filterSelect = document.getElementById('filterSelect');
    const filter = filterSelect ? filterSelect.value : '';

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

    // Use the centralized UI update function to ensure all elements are consistent
    // This fixes bugs where some buttons (like Pasteboard Sync) would show/hide inconsistently
    updateUI();

    // Persist current game selection
    if (currentGame) {
        localStorage.setItem('currentGame', currentGame);
    }
}

// Render game tabs
function renderGameTabs() {
    const tabsContainer = document.getElementById('gameTabs');

    if (!tabsContainer) {
        console.error("Game tabs container not found.");
        return;
    }

    if (achievements.length === 0) {
        tabsContainer.innerHTML = '';
        return;
    }

    try {
        // Get unique games with counts
        const gameStats = {};
        achievements.forEach(ach => {
            const name = ach.game || 'Unknown Game';
            if (!gameStats[name]) {
                gameStats[name] = {
                    total: 0,
                    completed: 0,
                    icon: ach.gameIcon || '🏆'
                };
            }
            gameStats[name].total++;
            if (ach.achieved) {
                gameStats[name].completed++;
            }
        });

        // Create tabs HTML
        let tabsHTML = `
            <div class="game-tab game-tab-all ${currentGame === 'all' ? 'active' : ''}" onclick="switchGame('all', event)">
                <span class="game-tab-icon">🏆</span>
                <span class="game-tab-name">All Games</span>
                <span class="game-tab-count">${achievements.length}</span>
            </div>
        `;

        Object.keys(gameStats).sort().forEach(gameName => {
            const stats = gameStats[gameName];
            const escapedName = gameName.replace(/'/g, "\\'");
            const isActive = currentGame === gameName;

            tabsHTML += `
                <div class="game-tab ${isActive ? 'active' : ''}" onclick="switchGame('${escapedName}', event)">
                    <span class="game-tab-icon">${stats.icon}</span>
                    <span class="game-tab-name">${gameName}</span>
                    <span class="game-tab-count">${stats.completed}/${stats.total}</span>
                </div>
            `;
        });

        tabsContainer.innerHTML = tabsHTML;
    } catch (e) {
        console.error("Error rendering game tabs:", e);
        tabsContainer.innerHTML = '<div class="error-message">Error loading game tabs.</div>';
    }
}

// Load Demo Data with more games
function loadDemoData() {
    achievements = [
        // Portal 2
        {
            id: '1',
            name: 'Heartbreaker',
            description: 'Complete the game in co-op mode',
            icon: '🏆',
            achieved: false,
            progress: 60,
            priority: 'high',
            favorite: true,
            globalPercentage: 12.5,
            rarity: 'rare',
            game: 'Portal 2',
            gameIcon: '🏆'
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
            gameIcon: '🏆'
        },
        {
            id: '3',
            name: 'Professor Portal',
            description: 'Complete all test chambers',
            icon: '🏆',
            achieved: false,
            progress: 75,
            priority: 'medium',
            favorite: true,
            globalPercentage: 45.2,
            rarity: 'uncommon',
            game: 'Portal 2',
            gameIcon: '🏆'
        },
        {
            id: '6',
            name: 'Speed Runner',
            description: 'Complete the game in under 2 hours',
            icon: '🏆',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 3.2,
            rarity: 'epic',
            game: 'Portal 2',
            gameIcon: '🏆'
        },
        {
            id: '7',
            name: 'Friendly Fire',
            description: 'Complete co-op without killing your partner',
            icon: '🏆',
            achieved: true,
            progress: 100,
            priority: 'low',
            favorite: false,
            globalPercentage: 56.8,
            rarity: 'common',
            game: 'Portal 2',
            gameIcon: '🏆'
        },

        // Half-Life 2
        {
            id: '4',
            name: 'Lambda Locator',
            description: 'Find all lambda caches',
            icon: '🏆',
            achieved: false,
            progress: 18,
            priority: 'low',
            favorite: false,
            globalPercentage: 23.1,
            rarity: 'uncommon',
            game: 'Half-Life 2',
            gameIcon: '🏆'
        },
        {
            id: '5',
            name: 'Zombie Chopper',
            description: 'Kill 1000 zombies with the gravity gun',
            icon: '🏆',
            achieved: false,
            progress: 45,
            priority: 'high',
            favorite: false,
            globalPercentage: 8.7,
            rarity: 'rare',
            game: 'Half-Life 2',
            gameIcon: '🏆'
        },
        {
            id: '9',
            name: 'Gravity Master',
            description: 'Kill 50 enemies with physics objects',
            icon: '🏆',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 42.3,
            rarity: 'common',
            game: 'Half-Life 2',
            gameIcon: '🏆'
        },

        // Undertale
        {
            id: '8',
            name: 'Pacifist',
            description: 'Complete the game without killing anyone',
            icon: '🏆',
            achieved: false,
            progress: 30,
            priority: 'medium',
            favorite: true,
            globalPercentage: 15.4,
            rarity: 'rare',
            game: 'Undertale',
            gameIcon: '🏆'
        },
        {
            id: '10',
            name: 'True Hero',
            description: 'Get the true pacifist ending',
            icon: '🏆',
            achieved: false,
            progress: 10,
            priority: 'high',
            favorite: true,
            globalPercentage: 8.9,
            rarity: 'rare',
            game: 'Undertale',
            gameIcon: '🏆'
        },
        {
            id: '11',
            name: 'Determined',
            description: 'Die 100 times',
            icon: '🏆',
            achieved: true,
            progress: 100,
            priority: 'low',
            favorite: false,
            globalPercentage: 67.2,
            rarity: 'common',
            game: 'Undertale',
            gameIcon: '🏆'
        },

        // Terraria
        {
            id: '12',
            name: 'Eye on You',
            description: 'Defeat the Eye of Cthulhu',
            icon: '🏆',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 82.5,
            rarity: 'common',
            game: 'Terraria',
            gameIcon: '🏆'
        },
        {
            id: '13',
            name: 'Slayer of Worlds',
            description: 'Defeat every boss',
            icon: '🏆',
            achieved: false,
            progress: 35,
            priority: 'high',
            favorite: true,
            globalPercentage: 5.2,
            rarity: 'epic',
            game: 'Terraria',
            gameIcon: '🏆'
        },
        {
            id: '14',
            name: 'Home Sweet Home',
            description: 'Build a house for every NPC',
            icon: '🏆',
            achieved: false,
            progress: 60,
            priority: 'medium',
            favorite: false,
            globalPercentage: 28.7,
            rarity: 'uncommon',
            game: 'Terraria',
            gameIcon: '🏆'
        },

        // Elden Ring (Real Steam Achievements)
        {
            id: '15',
            name: 'Elden Lord',
            description: 'Achieve the "Elden Lord" ending',
            icon: '🏆',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 28.4,
            rarity: 'uncommon',
            game: 'Elden Ring',
            gameIcon: '🏆'
        },
        {
            id: '16',
            name: 'Shardbearer Godrick',
            description: 'Defeated Shardbearer Godrick',
            icon: '🏆',
            achieved: true,
            progress: 100,
            priority: 'medium',
            favorite: false,
            globalPercentage: 67.8,
            rarity: 'common',
            game: 'Elden Ring',
            gameIcon: '🏆'
        },
        {
            id: '17',
            name: 'Shardbearer Malenia',
            description: 'Defeated Shardbearer Malenia',
            icon: '🏆',
            achieved: false,
            progress: 15,
            priority: 'high',
            favorite: true,
            globalPercentage: 34.2,
            rarity: 'uncommon',
            game: 'Elden Ring',
            gameIcon: '🏆'
        },
        {
            id: '18',
            name: 'Legendary Armaments',
            description: 'Acquired all legendary armaments',
            icon: '🏆',
            achieved: false,
            progress: 40,
            priority: 'medium',
            favorite: false,
            globalPercentage: 8.9,
            rarity: 'rare',
            game: 'Elden Ring',
            gameIcon: '🏆'
        },
        {
            id: '19',
            name: 'Legendary Ashen Remains',
            description: 'Acquired all legendary ashen remains',
            icon: '🏆',
            achieved: false,
            progress: 25,
            priority: 'low',
            favorite: false,
            globalPercentage: 6.7,
            rarity: 'rare',
            game: 'Elden Ring',
            gameIcon: '🏆'
        },
        {
            id: '20',
            name: 'Age of the Stars',
            description: 'Achieved the "Age of the Stars" ending',
            icon: '🏆',
            achieved: false,
            progress: 0,
            priority: 'high',
            favorite: true,
            globalPercentage: 19.3,
            rarity: 'uncommon',
            game: 'Elden Ring',
            gameIcon: '🏆'
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

    if (!listContainer || !emptyState) {
        console.error("Achievement list or empty state container not found.");
        return;
    }

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
    const displayProgress = ach.achieved ? 100 : ach.progress;

    return `
        <div class="achievement-card ${completedClass} ${priorityClass}" onclick="toggleAchievement('${ach.id}')">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-content">
                <div class="achievement-header">
                    <span class="achievement-name">${escapeHtml(ach.name)}</span>
                    <div class="achievement-badges">
                        ${ach.favorite ? '<span>⭐</span>' : ''}
                    </div>
                </div>
                <div class="achievement-description">${escapeHtml(ach.description)}</div>
                <div class="achievement-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${displayProgress}%; background: ${ach.achieved ? 'var(--success-color)' : ''}"></div>
                    </div>
                    <span class="progress-text" style="${ach.achieved ? 'color: var(--success-color); font-weight: bold;' : ''}">${displayProgress}%</span>
                </div>
                <div class="achievement-meta">
                    <span class="meta-item">Game: ${escapeHtml(ach.game)}</span>
                    <span class="meta-item">${ach.globalPercentage}% players</span>
                    <span class="meta-item">Rarity: ${ach.rarity}</span>
                </div>
            </div>
            ${!ach.achieved ? `
                <button class="btn-guide" onclick="event.stopPropagation(); openGuideModal('${ach.id}')" title="Ask AI for a guide">
                    🧠 Guide
                </button>
            ` : ''}
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
    // Ensure data is filtered correctly before rendering
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    applyFilters(searchQuery);

    renderGameTabs();
    renderAchievements();
    updateStats();

    // Sync buttons visibility
    const deleteBtn = document.getElementById('deleteGameBtn');
    const syncBtn = document.getElementById('syncProgressBtn');
    const isAll = currentGame === 'all';

    if (deleteBtn) deleteBtn.classList.toggle('hidden', isAll);
    if (syncBtn) syncBtn.classList.toggle('hidden', isAll || achievements.length === 0);
}

// Update Statistics (based on current view/filter)
function updateStats() {
    const total = filteredAchievements.length;
    const completed = filteredAchievements.filter(a => a.achieved).length;

    const totalCountEl = document.getElementById('totalCount');
    const completedCountEl = document.getElementById('completedCount');

    if (totalCountEl) totalCountEl.textContent = total;
    if (completedCountEl) completedCountEl.textContent = completed;
}

// Modal Functions
function showAddGameModal() {
    const modal = document.getElementById('addGameModal');
    const appIdInput = document.getElementById('appIdInput');
    const gameNameInput = document.getElementById('gameNameInput');

    if (modal) modal.classList.remove('hidden');
    if (appIdInput) appIdInput.value = '';
    if (gameNameInput) gameNameInput.value = '';
    if (appIdInput) appIdInput.focus();
    hideAddGameError();
    hideAddGameLoading();
}

function closeAddGameModal() {
    const modal = document.getElementById('addGameModal');
    if (modal) modal.classList.add('hidden');
}

function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('hidden');
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('hidden');
}

function showAddGameError(message) {
    const errorEl = document.getElementById('addGameError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideAddGameError() {
    const errorEl = document.getElementById('addGameError');
    if (errorEl) errorEl.classList.add('hidden');
}

function showAddGameLoading() {
    const loadingEl = document.getElementById('addGameLoading');
    if (loadingEl) loadingEl.classList.remove('hidden');
}

function hideAddGameLoading() {
    const loadingEl = document.getElementById('addGameLoading');
    if (loadingEl) loadingEl.classList.add('hidden');
}

// Sync Modal Functions
function showSyncModal(initialText = '') {
    const syncInput = document.getElementById('syncInput');
    const syncModal = document.getElementById('syncModal');

    if (syncInput) syncInput.value = initialText;
    if (syncModal) syncModal.classList.remove('hidden');

    if (!initialText && syncInput) {
        syncInput.focus();
    }
}

function closeSyncModal() {
    const syncModal = document.getElementById('syncModal');
    if (syncModal) syncModal.classList.add('hidden');
}

function processBulkSync(overwrite = false) {
    const syncInput = document.getElementById('syncInput');
    const text = syncInput ? syncInput.value : '';
    if (!text.trim()) {
        showNotification('Please paste some text first.', 'warning');
        return;
    }

    // Confirmation for overwrite (Reuse import logic behavior)
    if (overwrite) {
        const scope = currentGame === 'all' ? 'ALL games' : `"${currentGame}"`;
        if (!confirm(`This will OVERWRITE your current progress for ${scope}. All achievements not found as "Unlocked" in your paste will be reset. Are you sure?`)) {
            return;
        }
    }

    // 1. Check if it's JSON (Import-style sync)
    try {
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const jsonData = JSON.parse(text);
            const dataToProcess = Array.isArray(jsonData) ? jsonData : (jsonData.achievements || null);

            if (dataToProcess && Array.isArray(dataToProcess)) {
                handleJsonSync(dataToProcess, overwrite);
                return;
            }
        }
    } catch (e) {
        console.log('[Sync] Not JSON, falling back to text parsing');
    }

    // 2. Text-based Steam Sync
    const gameAchievements = currentGame === 'all' ? achievements : achievements.filter(a => a.game === currentGame);
    if (gameAchievements.length === 0) {
        showNotification(currentGame === 'all' ? 'No achievements found.' : 'No achievements found for the current game.', 'error');
        return;
    }

    // If overwriting, reset all targeted achievements first
    if (overwrite) {
        gameAchievements.forEach(ach => {
            ach.achieved = false;
            ach.progress = 0;
        });
    }

    let syncedCount = 0;
    let progressUpdatedCount = 0;
    const fullText = text.toLowerCase();
    const months = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december';

    gameAchievements.forEach(ach => {
        const achName = ach.name.toLowerCase();

        // Find name in text
        const nameIdx = fullText.indexOf(achName);
        if (nameIdx !== -1) {
            // Find in a window after the name
            const excerpt = fullText.substring(nameIdx, nameIdx + 300);

            // 1. Check for 100% completion
            const completionRegex = new RegExp(`(unlocked|earned)\\s+(\\d+|${months})\\s+(\\d+|${months})`, 'i');
            const isCompleted = completionRegex.test(excerpt) && !excerpt.includes('once unlocked');

            if (isCompleted) {
                if (!ach.achieved) {
                    ach.achieved = true;
                    ach.progress = 100;
                    syncedCount++;
                }
            } else if (!ach.achieved) {
                // 2. Check for progress (e.g. "5 / 10" or "50%")
                const progressRegex = /(\d+)\s*\/\s*(\d+)/;
                const progressMatch = excerpt.match(progressRegex);

                if (progressMatch) {
                    const current = parseInt(progressMatch[1]);
                    const target = parseInt(progressMatch[2]);
                    if (target > 0) {
                        const newProgress = Math.min(99, Math.round((current / target) * 100)); // Cap at 99% if not 'Unlocked'
                        if (newProgress > ach.progress) {
                            ach.progress = newProgress;
                            progressUpdatedCount++;
                        }
                    }
                }
            }
        }
    });

    if (syncedCount > 0 || progressUpdatedCount > 0 || overwrite) {
        saveAchievements();
        updateUI();
        closeSyncModal();
        let msg = '';
        if (overwrite) {
            msg = `Fresh sync complete for ${currentGame === 'all' ? 'all games' : currentGame}!`;
        } else if (syncedCount > 0 && progressUpdatedCount > 0) {
            msg = `Synced ${syncedCount} completed and updated progress for ${progressUpdatedCount} achievements!`;
        } else if (syncedCount > 0) {
            msg = `Synced ${syncedCount} new achievements!`;
        } else {
            msg = `Updated progress for ${progressUpdatedCount} achievements!`;
        }
        showNotification(msg, 'success');
    } else {
        showNotification('No updates detected. Make sure you copied the "Unlocked" status or progress counters.', 'info');
    }
}

// Help handle JSON-based sync (Import-style)
function handleJsonSync(jsonData, overwrite) {
    // Basic validation
    if (!Array.isArray(jsonData)) {
        showNotification('Invalid format: Data must be an array of achievements.', 'error');
        return;
    }

    if (jsonData.length > 0 && !jsonData[0].name) {
        showNotification('Invalid data: Achievements must have a name property.', 'error');
        return;
    }

    if (currentGame === 'all') {
        if (overwrite) {
            achievements = jsonData;
        } else {
            // Merge logic
            jsonData.forEach(newAch => {
                const existing = achievements.find(a => a.id === newAch.id);
                if (existing) {
                    Object.assign(existing, newAch);
                } else {
                    achievements.push(newAch);
                }
            });
        }
    } else {
        // Scope to current game
        if (overwrite) {
            // Remove old ones for this game, add new ones
            achievements = achievements.filter(a => a.game !== currentGame);
            jsonData.forEach(a => {
                const newAch = { ...a, game: currentGame }; // Force current game
                achievements.push(newAch);
            });
        } else {
            // Merge per achievement
            jsonData.forEach(newAch => {
                const existing = achievements.find(a => a.id === newAch.id || (a.name === newAch.name && a.game === currentGame));
                if (existing) {
                    Object.assign(existing, newAch);
                } else {
                    achievements.push({ ...newAch, game: currentGame });
                }
            });
        }
    }

    saveAchievements();
    updateUI();
    closeSyncModal();
    showNotification(overwrite ? 'Data overwritten for current view!' : 'Progress updated from JSON!', 'success');
}

// Add Game by App ID - Fetch REAL achievements from Steam
async function addGameByAppId() {
    const appIdInput = document.getElementById('appIdInput');
    const gameNameInput = document.getElementById('gameNameInput');
    const addGameBtn = document.getElementById('addGameBtn');

    const appId = appIdInput ? appIdInput.value.trim() : '';
    const gameName = gameNameInput ? gameNameInput.value.trim() : '';

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
    if (addGameBtn) addGameBtn.disabled = true;

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
        if (addGameBtn) addGameBtn.disabled = false;
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
        const icon = '🏆'; // Generic game controller icon

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
            gameIcon: '🏆' // Generic game controller icon
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
            icon: '🏆',
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
            icon: '🏆',
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
            icon: '🏆',
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
            icon: '🏆',
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
        gameIcon: '🏆'
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

// Data Compression for Export
function compressAchievements(data) {
    const COMPACT_KEYS = ['id', 'game', 'name', 'description', 'icon', 'achieved', 'progress', 'priority', 'favorite', 'globalPercentage', 'rarity', 'gameIcon'];

    // Map to a strict array format to eliminate repeated keys
    const compact = data.map(ach => COMPACT_KEYS.map(key => {
        if (key === 'achieved' || key === 'favorite') return ach[key] ? 1 : 0;
        return ach[key] ?? '';
    }));

    // Encode to Base64 with a version prefix
    // unescape(encodeURIComponent) makes it safe for UTF-8 (emojis etc)
    return 'STH1:' + btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
}

// Data Decompression for Import
function decompressAchievements(code) {
    const COMPACT_KEYS = ['id', 'game', 'name', 'description', 'icon', 'achieved', 'progress', 'priority', 'favorite', 'globalPercentage', 'rarity', 'gameIcon'];

    // Support legacy JSON format
    if (!code.startsWith('STH1:')) {
        return JSON.parse(code);
    }

    try {
        const raw = JSON.parse(decodeURIComponent(escape(atob(code.substring(5)))));
        if (!Array.isArray(raw)) return [];

        return raw.map(arr => {
            const obj = {};
            COMPACT_KEYS.forEach((key, i) => {
                if (key === 'achieved' || key === 'favorite') obj[key] = arr[i] === 1;
                else obj[key] = arr[i];
            });
            return obj;
        });
    } catch (e) {
        console.error('[Import] Decompression failed:', e);
        throw new Error('Invalid code format');
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
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.textContent = themeNames[currentTheme];
    showNotification(`Theme: ${currentTheme}`, 'info');
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeNames = { light: '☀️', dark: '🌙', auto: '🔄' };
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.textContent = themeNames[theme];
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
    console.log('[Cache] Reading data...');
    const saved = localStorage.getItem('achievements');
    const savedGame = localStorage.getItem('currentGame');

    if (saved) {
        try {
            const parsed = JSON.parse(saved);

            // Critical check: Ensure achievements is always an array
            if (Array.isArray(parsed)) {
                achievements = parsed;

                // Deduplicate on load
                const seen = new Set();
                achievements = achievements.filter(a => {
                    if (!a.id || seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true;
                });

                filteredAchievements = [...achievements];
                console.log(`[Cache] Successfully loaded ${achievements.length} records.`);
            } else {
                console.warn('[Cache] Data format invalid, resetting cache.');
                achievements = [];
            }
        } catch (e) {
            console.error('[Cache] Parse error, resetting cache:', e);
            achievements = [];
        }
    }

    // Reconcile tab selection
    if (savedGame && achievements.some(a => a.game === savedGame)) {
        currentGame = savedGame;
    } else {
        currentGame = 'all';
    }
}
// Data Management
function showDataModal() {
    // Generate a compact code instead of raw JSON
    const data = compressAchievements(achievements);
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
        // Automatically detect and decompress code or parse legacy JSON
        const data = decompressAchievements(input);

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
        showImportError('Invalid or corrupted data code');
    }
}

function showImportError(msg) {
    const el = document.getElementById('importError');
    el.textContent = msg;
    el.classList.remove('hidden');
}


// AI Guide Integration
function openGuideModal(id) {
    selectedAchievementId = id;
    const checkbox = document.getElementById('includeAllIncomplete');

    // Reset checkbox
    if (checkbox) {
        checkbox.checked = false;
        // Remove old listener to avoid duplicates, then add new one
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        newCheckbox.addEventListener('change', updateGuidePrompt);
    }

    updateGuidePrompt();

    // Show modal
    const modal = document.getElementById('guideModal');
    if (modal) {
        modal.classList.remove('hidden');
        const textarea = document.getElementById('guidePromptInput');
        if (textarea) textarea.focus();
    }
}

function updateGuidePrompt() {
    const textarea = document.getElementById('guidePromptInput');
    const checkbox = document.getElementById('includeAllIncomplete');

    if (!textarea) return;

    if (checkbox && checkbox.checked) {
        // Bulk Prompt
        const incomplete = achievements.filter(a => a.game === currentGame && !a.achieved);
        const list = incomplete.map(a => `${a.name}: ${a.description}`).join('\n');

        textarea.value = `INSTRUCTION: COMPREHENSIVE ACHIEVEMENT MASTER STRATEGY SHEET
GAME: "${currentGame}"
DATASET:
${list}

STRICT OUTPUT RULES:
1. FORMAT: A SINGLE unified Markdown Table for all data.
2. COLUMNS: | Achievement | Step | Technical Task | Location/Prerequisite | Optimization Notes |
3. EXHAUSTIVE FACTORIZATION: You MUST deconstruct every achievement into its FULL technical roadmap. 
4. NO SUMMARIES: If an achievement needs 5 actions to solve, it MUST occupy 5 separate rows. Do not collapse details into "Step 1".
5. SORTING: All rows MUST be grouped by Achievement Name. All steps for a single achievement must appear consecutively from Step 1 to Final Step.
6. NO LISTS: Use only table rows. No checkboxes, no bullets.
7. MISSABLES: Put "!!MISSABLE!!" in the Notes column for critical steps.
8. LANGUAGE: Generate the entire response, including headers and descriptions, in ${guideLanguage}.

EXAMPLE MASTER SHEET (IN ${guideLanguage}):
| Achievement | Step | Technical Task | Location/Prerequisite | Optimization Notes |
| :--- | :--- | :--- | :--- | :--- |
| Treasure Hunter | 1 | Unlock [Skill: Sight] | Skill Menu | Required to see hidden chests |
| Treasure Hunter | 2 | Secure [Chest A] | [Area 1] | !!MISSABLE!! Before boss fight |
| Combat Master | 1 | Kill 10 [Enemy X] | [Area 1] | Use [Weapon A] |
| Treasure Hunter | 3 | Secure [Chest B] | [Area 2] | Use Key from Area 1 |`;
    } else {
        // Single Prompt
        const achievement = achievements.find(a => a.id === selectedAchievementId);
        if (achievement) {
            const game = achievement.game;
            const name = achievement.name;
            const desc = achievement.description;
            textarea.value = `INSTRUCTION: SINGLE ACHIEVEMENT DATA SHEET
GAME: "${game}"
ACHIEVEMENT: "${name}"
DESCRIPTION: "${desc}"

STRICT OUTPUT RULES:
1. FORMAT: A single Markdown Table.
2. COLUMNS: | Step | Technical Task | Location/Prerequisite | Optimization Notes |
3. EXHAUSTIVE FACTORIZATION: Deconstruct the solution into its full technical roadmap. 
4. TONE: Command-line style. No intro/outro text.
5. NO LISTS: Use only the table format for the guide content.
6. LANGUAGE: Generate the entire response in ${guideLanguage}.

EXAMPLE (IN ${guideLanguage}):
| Step | Technical Task | Location/Prerequisite | Optimization Notes |
| :--- | :--- | :--- | :--- |
| 1 | Unlock [Skill] | Skill Tree | Required for Step 2 |
| 2 | Execute [Action] | [Specific Location] | Must be done during Night |`;
        }
    }
}

function closeGuideModal() {
    const modal = document.getElementById('guideModal');
    if (modal) modal.classList.add('hidden');
}

function confirmGuideLaunch() {
    const textarea = document.getElementById('guidePromptInput');
    const prompt = textarea ? textarea.value : '';

    if (!prompt.trim()) {
        showNotification('Please enter a prompt first.', 'warning');
        return;
    }

    const provider = localStorage.getItem('aiProvider') || 'gemini';
    let url = '';

    switch (provider) {
        case 'claude':
            url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
            break;
        case 'gemini':
            url = `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`;
            break;
        case 'perplexity':
            url = `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`;
            break;
        case 'chatgpt':
        default:
            url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
            break;
    }

    // Close modal
    closeGuideModal();

    // Proactively copy to clipboard for reliability
    navigator.clipboard.writeText(prompt).then(() => {
        showNotification('Prompt copied! Paste it in the chat if needed.', 'info', 4000);
    }).catch(() => {
        // Ignore clipboard errors
    });

    // Open in new tab
    window.open(url, '_blank');
}

// Settings Management
function saveSettings() {
    const provider = document.getElementById('aiProviderSelect').value;
    const language = document.getElementById('aiLanguageSelect').value;

    aiPreference = provider;
    guideLanguage = language;

    localStorage.setItem('aiProvider', provider);
    localStorage.setItem('guideLanguage', language);
}

function loadAiPreference() {
    aiPreference = localStorage.getItem('aiProvider') || 'gemini';
    guideLanguage = localStorage.getItem('guideLanguage') || 'Chinese';

    const providerSelect = document.getElementById('aiProviderSelect');
    const languageSelect = document.getElementById('aiLanguageSelect');

    if (providerSelect) providerSelect.value = aiPreference;
    if (languageSelect) languageSelect.value = guideLanguage;
}

function showSettingsModal() {
    loadAiPreference(); // Ensure UI matches state
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
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
        success: '#26de81',
        error: '#eb3b5a',
        info: '#4b6584',
        warning: '#fed330'
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
