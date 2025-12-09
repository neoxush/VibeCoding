// ==UserScript==
// @name         Split Tab Manager
// @namespace    http://tampermonkey.net/
// @version      0.25
// @description  Link two tabs: Smart auto-promotion. Cross-origin persistence. Auto-Target. Auto-Reset on Close.
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// ==/UserScript==

// --- LAST UPDATED: 2025-12-09 10:26:00 ---

(function () {
    'use strict';

    console.log('Split Tab: Script initialized at document-start (v0.25)');

    // --- Configuration & Keys ---
    const STATE_PREFIX = 'SPLIT_TAB_STATE=';
    const SESSION_KEY_ROLE = 'split_tab_role';
    const SESSION_KEY_ID = 'split_tab_id';

    // Debug mode detection (check for -debug in URL)
    const DEBUG_MODE = window.location.href.includes('-debug');

    // Global keys (GM storage)
    const KEY_LATEST_CLICK = 'split_tab_latest_click'; // { sourceId, timestamp }
    const KEY_TARGET_STATE = 'split_tab_target_state'; // { sourceId, timestamp } - for cross-origin persistence
    const getTargetUrlKey = (id) => `split_tab_url_${id}`;
    const getTimestampKey = (id) => `split_tab_ts_${id}`;
    const getCloseSignalKey = (id) => `split_tab_close_${id}`;

    // --- State Management (Hybrid: Session + Window.name) ---

    function saveState(role, id) {
        if (role === 'idle') {
            sessionStorage.removeItem(SESSION_KEY_ROLE);
            sessionStorage.removeItem(SESSION_KEY_ID);
        } else {
            sessionStorage.setItem(SESSION_KEY_ROLE, role);
            sessionStorage.setItem(SESSION_KEY_ID, id);
        }

        if (role !== 'idle') {
            const state = { role, id };
            window.name = STATE_PREFIX + JSON.stringify(state);
        } else {
            if (window.name && window.name.startsWith(STATE_PREFIX)) {
                window.name = '';
            }
        }
    }

    function loadState() {
        const sessionRole = sessionStorage.getItem(SESSION_KEY_ROLE);
        const sessionId = sessionStorage.getItem(SESSION_KEY_ID);

        if (sessionRole && sessionId) {
            return { role: sessionRole, id: sessionId };
        }

        if (window.name && window.name.startsWith(STATE_PREFIX)) {
            try {
                const state = JSON.parse(window.name.substring(STATE_PREFIX.length));
                sessionStorage.setItem(SESSION_KEY_ROLE, state.role);
                sessionStorage.setItem(SESSION_KEY_ID, state.id);
                return state;
            } catch (e) {
                console.error('Split Tab: Failed to parse window.name', e);
            }
        }

        return { role: 'idle', id: null };
    }

    // Load current state
    const currentState = loadState();
    let myRole = currentState.role;
    let myId = currentState.id;
    let statusIndicator = null;
    let isIntentionalNavigation = false; // Flag to prevent false close signals

    console.log(`Split Tab: Loaded state - Role: ${myRole}, ID: ${myId}`);

    // --- Styles (Injected safely) ---
    function injectStyles() {
        if (document.head) {
            GM_addStyle(`
                #split-tab-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.6); z-index: 2147483647;
                    display: flex; justify-content: center; align-items: center;
                }
                #split-tab-modal {
                    background: #222; color: #fff; padding: 25px; border-radius: 12px;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4); text-align: center;
                    font-family: sans-serif; min-width: 320px;
                }
                #split-tab-modal h2 { margin-top: 0; font-size: 20px; margin-bottom: 15px; }
                .split-btn {
                    background: #444; color: #fff; border: 1px solid #555;
                    padding: 12px 24px; margin: 8px; cursor: pointer;
                    border-radius: 6px; font-size: 14px; transition: all 0.2s; font-weight: bold;
                }
                .split-btn:hover { background: #555; transform: translateY(-1px); }
                .split-btn.source { background: #28a745; border-color: #1e7e34; }
                .split-btn.source:hover { background: #218838; }
                .split-btn.cancel { background: transparent; border: 1px solid #666; color: #aaa; }
                .split-btn.cancel:hover { background: #333; color: #fff; }
                
                #split-status-indicator {
                    position: fixed; bottom: 20px; right: 0;
                    padding: 8px 16px; 
                    font-family: sans-serif; font-size: 13px; font-weight: bold;
                    z-index: 2147483647;
                    cursor: pointer; user-select: none;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: transform 0.2s;
                    display: flex; align-items: center;
                    background: #28a745; color: #fff;
                    border-radius: 20px 0 0 20px;
                    margin-right: -5px;
                }
                #split-status-indicator:hover { transform: scale(1.05); }
                .status-dot {
                    display: inline-block; width: 10px; height: 10px;
                    border-radius: 50%; margin-right: 8px; background: #fff;
                }
                
                /* Debug Dashboard */
                #split-debug-dashboard {
                    position: fixed; bottom: 10px; left: 10px;
                    background: rgba(0, 0, 0, 0.85); color: #0f0;
                    padding: 10px; border-radius: 8px;
                    font-family: monospace; font-size: 11px;
                    z-index: 2147483647; pointer-events: none;
                    border: 1px solid #333;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    min-width: 200px;
                }
                #split-debug-dashboard table { width: 100%; }
                #split-debug-dashboard td { padding: 2px 5px; }
                #split-debug-dashboard .label { color: #aaa; }
                #split-debug-dashboard .val { font-weight: bold; }
            `);
        } else {
            setTimeout(injectStyles, 100);
        }
    }
    injectStyles();

    // --- Debug Dashboard ---
    function updateDebugDashboard() {
        if (!document.body || !DEBUG_MODE) return;

        let dashboard = document.getElementById('split-debug-dashboard');
        if (!dashboard) {
            dashboard = document.createElement('div');
            dashboard.id = 'split-debug-dashboard';
            document.body.appendChild(dashboard);
        }

        const latestClick = GM_getValue(KEY_LATEST_CLICK) || { sourceId: 'None', timestamp: 0 };
        const timeAgo = latestClick.timestamp ? ((Date.now() - latestClick.timestamp) / 1000).toFixed(1) + 's' : 'Never';

        dashboard.innerHTML = `
            <table>
                <tr><td class="label">Role:</td><td class="val" style="color: ${myRole === 'source' ? '#0f0' : (myRole === 'target' ? '#00f' : '#fff')}">${myRole.toUpperCase()}</td></tr>
                <tr><td class="label">My ID:</td><td class="val">${myId || '-'}</td></tr>
                <tr><td colspan="2"><hr style="border-color:#333"></td></tr>
                <tr><td class="label">Global Source:</td><td class="val">${latestClick.sourceId}</td></tr>
                <tr><td class="label">Last Click:</td><td class="val">${timeAgo} ago</td></tr>
            </table>
        `;
    }

    // Poll for debug updates only in debug mode
    if (DEBUG_MODE) {
        setInterval(updateDebugDashboard, 500);
    }

    // --- UI Functions ---

    function showConfigOverlay() {
        if (document.getElementById('split-tab-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'split-tab-overlay';
        overlay.innerHTML = `
            <div id="split-tab-modal">
                <h2>Split Tab Manager</h2>
                <p>Set this tab as a Source to control new tabs.</p>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="split-btn source" id="btn-set-source">Set as SOURCE</button>
                    <button class="split-btn" id="btn-switch-source" style="background: #007bff; border-color: #0056b3;">Switch Source to Other Window</button>
                    <button class="split-btn cancel" id="btn-cancel">Cancel / Disable</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-set-source').onclick = () => setAsSource();
        document.getElementById('btn-switch-source').onclick = () => switchSourceToOtherWindow();
        document.getElementById('btn-cancel').onclick = () => disableSource();
    }

    function closeOverlay() {
        const overlay = document.getElementById('split-tab-overlay');
        if (overlay) overlay.remove();
    }

    function updateUI() {
        if (!document.body) {
            setTimeout(updateUI, 100);
            return;
        }

        // Remove existing indicator to force refresh
        if (statusIndicator && statusIndicator.parentNode) {
            statusIndicator.remove();
            statusIndicator = null;
        }

        // Only show badge for SOURCE tabs
        if (myRole === 'source') {
            statusIndicator = document.createElement('div');
            statusIndicator.id = 'split-status-indicator';
            statusIndicator.title = 'Click to configure';
            statusIndicator.onclick = showConfigOverlay;
            statusIndicator.innerHTML = `<span class="status-dot"></span>SOURCE`;
            document.body.appendChild(statusIndicator);
        }
        updateDebugDashboard();
    }

    // --- Logic ---

    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function setAsSource() {
        // If we're currently a Target or Source in an existing group, keep the same ID
        if (myId && (myRole === 'target' || myRole === 'source')) {
            // Signal the other tab to become TARGET
            const swapKey = `split_tab_swap_${myId}`;
            GM_setValue(swapKey, {
                action: 'become_target',
                timestamp: Date.now()
            });

            // Set this tab as SOURCE (keep same ID)
            myRole = 'source';
            saveState(myRole, myId);
            closeOverlay();
            updateUI();
            recordClick();
            console.log('Split Tab: Set as SOURCE (replaced), ID:', myId);
            return;
        }

        // Otherwise, create a new Source with new ID (idle tab)
        myRole = 'source';
        myId = generateId();
        saveState(myRole, myId);
        closeOverlay();
        updateUI();

        // Record click so new tabs can auto-bind
        recordClick();
        console.log('Split Tab: Manually set as SOURCE (new), ID:', myId);
    }

    function disableSource() {
        myRole = 'idle';
        myId = null;
        saveState('idle', null);
        closeOverlay();
        updateUI();
    }

    function switchSourceToOtherWindow() {
        if (myRole === 'source' && myId) {
            // Signal the target tab to become source, then become target ourselves
            const swapKey = `split_tab_swap_${myId}`;
            GM_setValue(swapKey, {
                action: 'swap',
                timestamp: Date.now()
            });

            // Immediately swap roles locally
            myRole = 'target';
            saveState(myRole, myId);
            closeOverlay();
            updateUI();
            setupTargetListener();
            console.log('Split Tab: Switched to Target role');
        } else if (myRole === 'target' && myId) {
            // We're the target, become source and signal the other tab
            const swapKey = `split_tab_swap_${myId}`;
            GM_setValue(swapKey, {
                action: 'become_target',
                timestamp: Date.now()
            });

            myRole = 'source';
            saveState(myRole, myId);
            closeOverlay();
            updateUI();
            recordClick();
            console.log('Split Tab: Switched to Source role');
        } else {
            // If idle, just set as source
            setAsSource();
        }
    }

    function resetGlobalState() {
        if (confirm("Reset all Split Tab connections for this tab?")) {
            saveState('idle', null);
            window.location.reload();
        }
    }

    function cleanupOnClose() {
        // Only send close signal if NOT an intentional navigation
        if (isIntentionalNavigation) {
            console.log('Split Tab: Skipping close signal (intentional navigation)');
            return;
        }

        // Signal the paired tab that we're actually closing
        if (myId && (myRole === 'source' || myRole === 'target')) {
            const closeKey = getCloseSignalKey(myId);
            GM_setValue(closeKey, {
                action: 'tab_closed',
                timestamp: Date.now()
            });
            console.log('Split Tab: Sent close signal to paired tab');
        }
    }

    // --- Auto-Promote & Click Handling ---

    function recordClick() {
        if (myRole !== 'source' || !myId) return;
        GM_setValue(KEY_LATEST_CLICK, {
            sourceId: myId,
            timestamp: Date.now()
        });
        if (DEBUG_MODE) updateDebugDashboard();
    }

    function autoPromoteOnSplitView() {
        if (myRole === 'idle') {
            console.log('Split Tab: Auto-promoting to Source (split view detected)');
            setAsSource();
        }
        recordClick();
    }

    // Intercept Link Clicks (Left Click only for SOURCE tabs)
    function handleLinkClick(e) {
        if (myRole !== 'source' || e.button !== 0) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;

        const link = e.target.closest('a');
        if (!link || !link.href) return;
        if (link.href.startsWith('javascript:') || link.href.includes('#')) return;

        e.preventDefault();
        e.stopPropagation();
        recordClick();

        GM_setValue(getTargetUrlKey(myId), link.href);
        GM_setValue(getTimestampKey(myId), Date.now());

        if (statusIndicator) {
            const originalText = statusIndicator.innerHTML;
            statusIndicator.innerHTML = 'Sent! 🚀';
            setTimeout(() => {
                if (myRole === 'source' && statusIndicator) {
                    statusIndicator.innerHTML = originalText;
                }
            }, 1000);
        }
    }

    // Context menu handler - auto-promote on right-click on links (Chrome split view)
    function handleContextMenu(e) {
        const link = e.target.closest('a');
        if (link && link.href && !link.href.startsWith('javascript:')) {
            autoPromoteOnSplitView();
        }
    }

    // New Tab / Navigation: Restore TARGET state first, then check for new binding
    if (myRole === 'idle') {
        // First, check if we're a TARGET tab that just navigated (cross-origin)
        const savedTargetState = GM_getValue(KEY_TARGET_STATE);
        if (savedTargetState && savedTargetState.sourceId && (Date.now() - savedTargetState.timestamp) < 10000) {
            // Restore TARGET state after cross-origin navigation
            myRole = 'target';
            myId = savedTargetState.sourceId;
            saveState(myRole, myId);
            console.log(`Split Tab: Restored TARGET state after navigation (ID: ${myId})`);
            setTimeout(() => {
                updateUI();
                setupTargetListener();
                setupSwapListener();
                setupCloseListener();
            }, 100);
        } else {
            // Check for new tab auto-binding
            const latestClick = GM_getValue(KEY_LATEST_CLICK);
            if (latestClick && latestClick.sourceId) {
                const timeDiff = Date.now() - latestClick.timestamp;
                if (timeDiff < 3000) {
                    myRole = 'target';
                    myId = latestClick.sourceId;
                    saveState(myRole, myId);
                    setTimeout(() => {
                        updateUI();
                        setupTargetListener();
                        setupSwapListener();
                        setupCloseListener();
                    }, 100);
                    console.log(`Split Tab: Auto-bound to Source ${myId} (Latency: ${timeDiff}ms)`);
                }
            }
        }
    }

    // --- Core Functionality ---

    function setupSwapListener() {
        if (!myId) return;

        const swapKey = `split_tab_swap_${myId}`;
        GM_addValueChangeListener(swapKey, function (key, oldVal, newVal, remote) {
            if (!remote) return;

            if (newVal && newVal.action === 'swap') {
                // The source tab initiated swap, we (target) become source
                if (myRole === 'target') {
                    myRole = 'source';
                    saveState(myRole, myId);
                    updateUI();
                    console.log('Split Tab: Received swap signal, became Source');
                }
            } else if (newVal && newVal.action === 'become_target') {
                // The target tab became source, we (source) become target
                if (myRole === 'source') {
                    myRole = 'target';
                    saveState(myRole, myId);
                    updateUI();
                    setupTargetListener();
                    console.log('Split Tab: Received become_target signal, became Target');
                }
            }
        });
    }

    function setupCloseListener() {
        if (!myId) return;

        const closeKey = getCloseSignalKey(myId);
        GM_addValueChangeListener(closeKey, function (key, oldVal, newVal, remote) {
            if (!remote) return;

            if (newVal && newVal.action === 'tab_closed') {
                // The paired tab was closed, reset our state
                console.log('Split Tab: Paired tab closed, resetting state');
                myRole = 'idle';
                myId = null;
                saveState('idle', null);
                updateUI();
            }
        });
    }

    function setupTargetListener() {
        if (myRole !== 'target' || !myId) return;

        GM_addValueChangeListener(getTimestampKey(myId), function (key, oldVal, newVal, remote) {
            if (!remote) return;
            const url = GM_getValue(getTargetUrlKey(myId));
            if (url) {
                // Mark as intentional navigation to prevent false close signal
                isIntentionalNavigation = true;

                // Save TARGET state to GM storage before navigation
                GM_setValue(KEY_TARGET_STATE, {
                    sourceId: myId,
                    timestamp: Date.now()
                });
                console.log('Split Tab: Navigating to:', url);
                window.location.href = url;
            }
        });
    }

    // Initialization
    window.addEventListener('click', handleLinkClick, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    // Cleanup on tab close
    window.addEventListener('beforeunload', cleanupOnClose);
    window.addEventListener('unload', cleanupOnClose);

    GM_registerMenuCommand("Configure Split Tab", showConfigOverlay);
    GM_registerMenuCommand("⚠️ Reset / Clear Role", resetGlobalState);

    if (myRole === 'target') {
        console.log('Split Tab: Setting up target listener for ID:', myId);
        setupTargetListener();
    }

    // Setup swap listener for both source and target
    if (myId) {
        setupSwapListener();
        setupCloseListener();
    }

    updateUI();

})();
