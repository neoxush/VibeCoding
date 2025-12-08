// ==UserScript==
// @name         Split Tab Manager
// @namespace    http://tampermonkey.net/
// @version      0.17
// @description  Link two tabs: Auto-Promote Source on Split, Auto-Target. Hybrid Persistence. Debug Dashboard.
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// ==/UserScript==

// --- LAST UPDATED: 2025-12-08 18:25:00 ---

(function () {
    'use strict';

    console.log('Split Tab: Script initialized at document-start (v0.17)');

    // --- Configuration & Keys ---
    const STATE_PREFIX = 'SPLIT_TAB_STATE=';
    const SESSION_KEY_ROLE = 'split_tab_role';
    const SESSION_KEY_ID = 'split_tab_id';

    // Global keys (GM storage)
    const KEY_LATEST_CLICK = 'split_tab_latest_click'; // { sourceId, timestamp }
    const getTargetUrlKey = (id) => `split_tab_url_${id}`;
    const getTimestampKey = (id) => `split_tab_ts_${id}`;

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
        if (!document.body) return;

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

    // Poll for debug updates
    setInterval(updateDebugDashboard, 500);

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
                    <button class="split-btn cancel" id="btn-cancel">Cancel / Disable</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-set-source').onclick = () => setAsSource();
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

        if (myRole === 'source') {
            if (!statusIndicator) {
                statusIndicator = document.createElement('div');
                statusIndicator.id = 'split-status-indicator';
                statusIndicator.title = 'Click to configure';
                statusIndicator.onclick = showConfigOverlay;
                document.body.appendChild(statusIndicator);
            }
            statusIndicator.innerHTML = `<span class="status-dot"></span>SOURCE`;
            statusIndicator.style.display = 'flex';
        } else {
            if (statusIndicator) statusIndicator.style.display = 'none';
        }
        updateDebugDashboard();
    }

    // --- Logic ---

    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function setAsSource() {
        myRole = 'source';
        myId = generateId();
        saveState(myRole, myId);
        closeOverlay();
        updateUI();
    }

    function disableSource() {
        myRole = 'idle';
        myId = null;
        saveState('idle', null);
        closeOverlay();
        updateUI();
    }

    function resetGlobalState() {
        if (confirm("Reset all Split Tab connections for this tab?")) {
            saveState('idle', null);
            window.location.reload();
        }
    }

    // --- Auto-Promote & Click Handling ---

    function recordClick() {
        if (myRole === 'source' && myId) {
            GM_setValue(KEY_LATEST_CLICK, {
                sourceId: myId,
                timestamp: Date.now()
            });
            updateDebugDashboard();
        }
    }

    function autoPromoteIfNeeded(reason) {
        console.log(`Split Tab: Auto-promote check triggered by ${reason}`);
        if (myRole === 'idle') {
            console.log('Split Tab: Auto-promoting to Source');
            setAsSource();
        }
        recordClick();
    }

    // 1. Intercept Link Clicks (Left Click + Modifiers)
    function handleLinkClick(e) {
        const link = e.target.closest('a');
        if (!link || !link.href) return;
        if (link.href.startsWith('javascript:') || link.href.includes('#')) return;

        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            autoPromoteIfNeeded('Modifier Click');
            return;
        }

        if (myRole === 'source' && e.button === 0) {
            e.preventDefault();
            e.stopPropagation();
            recordClick();

            GM_setValue(getTargetUrlKey(myId), link.href);
            GM_setValue(getTimestampKey(myId), Date.now());

            const originalText = statusIndicator.innerHTML;
            statusIndicator.innerHTML = 'Sent! 🚀';
            setTimeout(() => {
                if (myRole === 'source') statusIndicator.innerHTML = originalText;
            }, 1000);
        }
    }

    // 2. Intercept Mousedown (Right Click / Middle Click)
    function handleMouseDown(e) {
        if (e.button === 2 || e.button === 1) {
            const link = e.target.closest('a');
            if (link) {
                autoPromoteIfNeeded('Mouse Button ' + e.button);
            }
        }
    }

    // 3. Intercept Context Menu (Backup)
    function handleContextMenu(e) {
        const link = e.target.closest('a');
        if (link) {
            autoPromoteIfNeeded('Context Menu');
        }
    }

    // 4. Intercept Aux Click
    function handleAuxClick(e) {
        if (e.button === 1) {
            const link = e.target.closest('a');
            if (link) autoPromoteIfNeeded('Aux Click');
        }
    }

    // 5. New Tab: Check for recent Source click
    if (myRole === 'idle') {
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
                }, 100);
                console.log(`Split Tab: Auto-bound to Source ${myId} (Latency: ${timeDiff}ms)`);
            }
        }
    }

    // --- Core Functionality ---

    function setupTargetListener() {
        if (myRole !== 'target' || !myId) return;

        GM_addValueChangeListener(getTimestampKey(myId), function (key, oldVal, newVal, remote) {
            if (!remote) return;
            const url = GM_getValue(getTargetUrlKey(myId));
            if (url) {
                window.location.href = url;
            }
        });
    }

    // Initialization
    window.addEventListener('click', handleLinkClick, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('auxclick', handleAuxClick, true);

    GM_registerMenuCommand("Configure Split Tab", showConfigOverlay);
    GM_registerMenuCommand("⚠️ Reset / Clear Role", resetGlobalState);

    if (myRole === 'target') {
        setupTargetListener();
    }

    updateUI();

})();
