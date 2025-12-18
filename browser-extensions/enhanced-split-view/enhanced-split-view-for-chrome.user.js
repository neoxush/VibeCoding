// ==UserScript==
// @name         Enhanced Split View for Chrome
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  This scripts adds extra control over Chrome's native split view function, which allows to pin a source tab to open new content on the side.
// @author       https://github.com/neoxush/VibeCoding/tree/master/browser-extensions/enhanced-split-view
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
    'use strict';

    // Note: You can reorder the right-click menu items by editing the 'contextMenuItems' array in the updateUI function.

    // --- Configuration & Keys ---
    const GM_PREFIX = 'stm_gm_v18_';
    const KEY_LATEST_SOURCE = `${GM_PREFIX}latest_source`;
    const KEY_DRAG_PAIR_REQUEST = `${GM_PREFIX}drag_pair_request`;
    const KEY_DRAG_SOURCE_REQUEST = `${GM_PREFIX}drag_source_request`;
    const KEY_CONFIG = `${GM_PREFIX}config`;
    const PAIR_MAX_AGE_MS = 5000;
    const getTargetUrlKey = (id) => `${GM_PREFIX}url_${id}`;
    const getTimestampKey = (id) => `${GM_PREFIX}ts_${id}`;
    const getDisconnectKey = (id) => `${GM_PREFIX}disconnect_${id}`;
    const getSourceListKey = (id) => `${GM_PREFIX}sources_${id}`;

    // Default configuration
    const DEFAULT_CONFIG = {
        sourceKey: { button: 1, ctrl: true, alt: false, shift: false },
        targetKey: { button: 1, ctrl: false, alt: true, shift: false }
    };

    // --- State Management ---
    const generateId = () => Math.random().toString(36).substring(2, 11);
    const myInstanceId = generateId();
    let lastFocusTime = 0; // Initialize to 0 so fresh tabs don't tie with Date.now()
    const updateFocus = () => { lastFocusTime = Date.now(); };
    window.addEventListener('focus', updateFocus);
    window.addEventListener('mousedown', updateFocus, true);
    window.addEventListener('pointerdown', updateFocus, true);

    let myRole = 'idle';
    let myId = null;
    let myLastTs = 0;
    let mySourceTabId = null; // Unique ID for this source tab instance
    let stateLoaded = false;
    let ui = null;
    let configPanel = null;
    let activeListeners = [];
    let config = null;

    // Lightweight, synchronous prime from window.name so navigation retains role/id even before async loadState finishes.
    function primeStateFromWindowName() {
        try {
            const parsed = JSON.parse(window.name || '{}');
            if (parsed.stmRole && parsed.stmId) {
                myRole = parsed.stmRole;
                myId = parsed.stmId;
                myLastTs = parsed.stmLastTs || 0;
                mySourceTabId = parsed.stmSourceTabId;
                updateUI();
                attachRoleSpecificListeners();
            }
        } catch (err) { /* ignore */ }
    }

    function loadConfig() {
        config = GM_getValue(KEY_CONFIG, DEFAULT_CONFIG);
    }

    function saveConfig(newConfig) {
        config = newConfig;
        GM_setValue(KEY_CONFIG, config);
    }

    function saveState(role, id, lastTs = 0, sourceTabId = null) {
        myRole = role; myId = id; myLastTs = lastTs; mySourceTabId = sourceTabId;
        // Simplified Logic: Save directly to the Tab Object
        // GM_saveTab persists even across domain changes in the same tab.
        GM_saveTab({
            role: role,
            id: id,
            lastTs: lastTs,
            sourceTabId: sourceTabId
        });

        // Secondary fallback persistence using window.name to survive edge cases.
        try {
            const payload = { stmRole: role, stmId: id, stmLastTs: lastTs, stmSourceTabId: sourceTabId };
            window.name = JSON.stringify(payload);
            sessionStorage.setItem('stm_state', JSON.stringify(payload));
        } catch (err) { /* ignore */ }

        updateUI();
        attachRoleSpecificListeners();
    }

    function loadState() {
        // Direct retrieval from the Tab Object
        return new Promise((resolve) => {
            GM_getTab((tab) => {
                if (tab && tab.role && tab.id) {
                    resolve({ role: tab.role, id: tab.id, lastTs: tab.lastTs || 0, sourceTabId: tab.sourceTabId });
                    return;
                }
                // Fallback: attempt to parse window.name if it holds our state
                try {
                    const parsed = JSON.parse(window.name || '{}');
                    if (parsed.stmRole && parsed.stmId) {
                        resolve({ role: parsed.stmRole, id: parsed.stmId, lastTs: parsed.stmLastTs || 0, sourceTabId: parsed.stmSourceTabId });
                        return;
                    }
                } catch (err) { /* ignore */ }
                // Fallback: sessionStorage (survives same-tab navigations)
                try {
                    const parsed = JSON.parse(sessionStorage.getItem('stm_state') || '{}');
                    if (parsed.stmRole && parsed.stmId) {
                        resolve({ role: parsed.stmRole, id: parsed.stmId, lastTs: parsed.stmLastTs || 0, sourceTabId: parsed.stmSourceTabId });
                        return;
                    }
                } catch (err) { /* ignore */ }
                resolve({ role: 'idle', id: null, lastTs: 0, sourceTabId: null });
            });
        });
    }


    // --- UI Logic ---
    function injectStyles() {
        GM_addStyle(`
            @keyframes stm-pulse { 0% {transform: scale(1);} 50% {transform: scale(1.2);} 100% {transform: scale(1);} }
            .stm-pulse-animate { animation: stm-pulse 0.5s ease-out; }
            #stm-ui-container { position: fixed; top: 85px; z-index: 2147483647; user-select: none; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
            #stm-ui-container.stm-side-right { right: 0; }
            #stm-ui-container.stm-side-left { left: 0; }
            #stm-status-dot { width: 100%; height: 100%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 14px; font-weight: bold; color: white; cursor: grab; transition: transform 0.2s, background-color 0.3s; border: 1px solid rgba(255,255,255,0.5); }
            #stm-status-dot:active { cursor: grabbing; }
            #stm-ui-container.stm-side-right #stm-status-dot { background-color: #28a745; border-radius: 8px 0 0 8px; border-right: none; }
            #stm-ui-container.stm-side-left #stm-status-dot { background-color: #007bff; border-radius: 0 8px 8px 0; border-left: none; }
            #stm-ui-container.stm-side-right:hover #stm-status-dot { transform: translateX(-3px); }
            #stm-ui-container.stm-side-left:hover #stm-status-dot { transform: translateX(3px); }
            #stm-menu { display: none; position: absolute; top: 100%; background-color: #333; border-radius: 4px; width: 120px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif; font-size: 12px; }
            #stm-ui-container.stm-side-right #stm-menu { right: 0; border-top-right-radius: 0; }
            #stm-ui-container.stm-side-left #stm-menu { left: 0; border-top-left-radius: 0; }
            .stm-menu-item { padding: 8px 12px; color: #fff; cursor: pointer; transition: background-color 0.2s; }
            .stm-menu-item:hover { background-color: #555; }
            #stm-config-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2c2c2c; border-radius: 8px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); z-index: 2147483648; font-family: sans-serif; color: #fff; min-width: 400px; }
            #stm-config-panel h3 { margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #444; padding-bottom: 10px; }
            .stm-config-section { margin-bottom: 20px; padding: 15px; background: #333; border-radius: 4px; }
            .stm-config-section h4 { margin: 0 0 10px 0; font-size: 14px; color: #4CAF50; }
            .stm-config-row { display: flex; gap: 10px; margin-bottom: 8px; }
            .stm-config-label { flex: 1; font-size: 13px; display: flex; align-items: center; }
            .stm-config-input { display: flex; gap: 5px; align-items: center; }
            .stm-config-input label { font-size: 12px; cursor: pointer; }
            .stm-config-input input[type="checkbox"] { cursor: pointer; }
            .stm-config-input select { background: #444; color: #fff; border: 1px solid #555; border-radius: 3px; padding: 3px 5px; cursor: pointer; }
            .stm-config-buttons { display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px; }
            .stm-config-btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; transition: background-color 0.2s; }
            .stm-config-btn-save { background-color: #4CAF50; color: white; }
            .stm-config-btn-save:hover { background-color: #45a049; }
            .stm-config-btn-cancel { background-color: #666; color: white; }
            .stm-config-btn-cancel:hover { background-color: #555; }
            .stm-config-btn-reset { background-color: #f44336; color: white; }
            .stm-config-btn-reset:hover { background-color: #da190b; }
            #stm-config-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2147483647; }
        `);
    }

    function createConfigPanel() {
        const overlay = document.createElement('div');
        overlay.id = 'stm-config-overlay';
        const panel = document.createElement('div');
        panel.id = 'stm-config-panel';
        panel.innerHTML = `
            <h3>Split Tab Manager - Key Configuration</h3>
            <div class="stm-config-section">
                <h4>Create Source Tab</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Mouse Button:</div>
                    <div class="stm-config-input">
                        <select id="stm-source-button">
                            <option value="0">Left (0)</option>
                            <option value="1">Middle (1)</option>
                            <option value="2">Right (2)</option>
                        </select>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Modifiers:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-source-ctrl"> Ctrl</label>
                        <label><input type="checkbox" id="stm-source-alt"> Alt</label>
                        <label><input type="checkbox" id="stm-source-shift"> Shift</label>
                    </div>
                </div>
            </div>
            <div class="stm-config-section">
                <h4>Create Target Tab</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Mouse Button:</div>
                    <div class="stm-config-input">
                        <select id="stm-target-button">
                            <option value="0">Left (0)</option>
                            <option value="1">Middle (1)</option>
                            <option value="2">Right (2)</option>
                        </select>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Modifiers:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-target-ctrl"> Ctrl</label>
                        <label><input type="checkbox" id="stm-target-alt"> Alt</label>
                        <label><input type="checkbox" id="stm-target-shift"> Shift</label>
                    </div>
                </div>
            </div>
            <div class="stm-config-buttons">
                <button class="stm-config-btn stm-config-btn-reset" id="stm-config-reset">Reset to Default</button>
                <button class="stm-config-btn stm-config-btn-cancel" id="stm-config-cancel">Cancel</button>
                <button class="stm-config-btn stm-config-btn-save" id="stm-config-save">Save</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        overlay.addEventListener('click', hideConfigPanel);
        panel.querySelector('#stm-config-cancel').addEventListener('click', hideConfigPanel);
        panel.querySelector('#stm-config-save').addEventListener('click', saveConfigFromPanel);
        panel.querySelector('#stm-config-reset').addEventListener('click', resetConfigToDefault);
        return { overlay, panel };
    }

    function showConfigPanel() {
        if (!configPanel) { configPanel = createConfigPanel(); }
        document.getElementById('stm-source-button').value = config.sourceKey.button;
        document.getElementById('stm-source-ctrl').checked = config.sourceKey.ctrl;
        document.getElementById('stm-source-alt').checked = config.sourceKey.alt;
        document.getElementById('stm-source-shift').checked = config.sourceKey.shift;
        document.getElementById('stm-target-button').value = config.targetKey.button;
        document.getElementById('stm-target-ctrl').checked = config.targetKey.ctrl;
        document.getElementById('stm-target-alt').checked = config.targetKey.alt;
        document.getElementById('stm-target-shift').checked = config.targetKey.shift;
        configPanel.overlay.style.display = 'block';
        configPanel.panel.style.display = 'block';
    }

    function hideConfigPanel() {
        if (configPanel) {
            configPanel.overlay.style.display = 'none';
            configPanel.panel.style.display = 'none';
        }
    }

    function saveConfigFromPanel() {
        const newConfig = {
            sourceKey: { button: parseInt(document.getElementById('stm-source-button').value), ctrl: document.getElementById('stm-source-ctrl').checked, alt: document.getElementById('stm-source-alt').checked, shift: document.getElementById('stm-source-shift').checked },
            targetKey: { button: parseInt(document.getElementById('stm-target-button').value), ctrl: document.getElementById('stm-target-ctrl').checked, alt: document.getElementById('stm-target-alt').checked, shift: document.getElementById('stm-target-shift').checked }
        };
        saveConfig(newConfig);
        hideConfigPanel();
        GM_notification({ text: 'Configuration saved!' });
    }

    function resetConfigToDefault() {
        saveConfig(DEFAULT_CONFIG);
        showConfigPanel();
        GM_notification({ text: 'Configuration reset to defaults!' });
    }

    function resetAllRoles() {
        const confirmed = window.confirm('Reset all Split Tab roles across tabs? This will clear Source/Target links. Continue?');
        if (!confirmed) return;
        const keys = GM_listValues().filter(k => k.startsWith(GM_PREFIX));
        const ids = new Set();
        const urlPrefix = `${GM_PREFIX}url_`;
        const tsPrefix = `${GM_PREFIX}ts_`;
        const disconnectPrefix = `${GM_PREFIX}disconnect_`;
        keys.forEach(k => {
            if (k.startsWith(urlPrefix)) ids.add(k.slice(urlPrefix.length));
            else if (k.startsWith(tsPrefix)) ids.add(k.slice(tsPrefix.length));
            else if (k.startsWith(disconnectPrefix)) ids.add(k.slice(disconnectPrefix.length));
        });
        // Notify other tabs to drop their roles.
        ids.forEach(id => GM_setValue(getDisconnectKey(id), Date.now()));
        // Remove all role-related stored values while preserving configuration.
        keys.forEach(k => {
            if (k === KEY_CONFIG) return;
            GM_deleteValue(k);
        });
        // Clear tab-specific state and session storage
        GM_saveTab({});
        try {
            window.name = '';
            sessionStorage.removeItem('stm_state');
        } catch (err) { /* ignore */ }
        saveState('idle', null, 0, null);
        GM_notification({ text: 'All roles have been reset.' });
    }

    function updateUI() {
        if (window !== window.top) return; // Only show UI in the top-level window
        if (!document.body) { window.addEventListener('DOMContentLoaded', updateUI, { once: true }); return; }
        if (!ui) {
            ui = { container: document.createElement('div'), dot: document.createElement('div'), menu: document.createElement('div') };
            ui.container.id = 'stm-ui-container';
            ui.dot.id = 'stm-status-dot';
            ui.menu.id = 'stm-menu';
            ui.container.append(ui.menu, ui.dot);
            document.body.appendChild(ui.container);
            ui.dot.addEventListener('mousedown', handleDragStart);
            ui.menu.addEventListener('click', handleMenuClick);
            ui.container.addEventListener('mouseleave', handleContainerMouseLeave);
            window.addEventListener('click', (e) => { if (ui && ui.menu.style.display === 'block' && !ui.container.contains(e.target)) toggleMenu(); }, true);
        }
        ui.container.style.display = (myRole === 'idle') ? 'none' : 'flex';
        ui.container.classList.remove('stm-side-left', 'stm-side-right');
        if (myRole === 'source') {
            ui.container.classList.add('stm-side-right');
            ui.dot.textContent = 'S';
        } else if (myRole === 'target') {
            ui.container.classList.add('stm-side-left');
            ui.dot.textContent = 'T';
        }

        // --- CONTEXT MENU ---
        // You can reorder these items to change the order in the menu.
        const contextMenuItems = [
            { text: "Revoke", action: "revoke" },
            { text: "Disconnect", action: "disconnect" }
        ];

        // Add "Join Group" option for idle tabs when sources exist
        if (myRole === 'idle') {
            const latestSource = GM_getValue(KEY_LATEST_SOURCE, null);
            if (latestSource) {
                contextMenuItems.unshift({ text: "Join as Source", action: "join-source" });
            }
        }

        if (myRole !== 'idle' || (myRole === 'idle' && GM_getValue(KEY_LATEST_SOURCE, null))) {
            ui.menu.innerHTML = contextMenuItems.map(item =>
                `<div class="stm-menu-item" data-action="${item.action}">${item.text}</div>`
            ).join('');
        }
    }

    function toggleMenu() { if (ui && ui.menu) ui.menu.style.display = ui.menu.style.display === 'block' ? 'none' : 'block'; }
    function hideMenu() { if (ui && ui.menu) ui.menu.style.display = 'none'; }
    function handleContainerMouseLeave(e) { if (!ui || !ui.container) return; const toEl = e.relatedTarget; if (!toEl || !ui.container.contains(toEl)) hideMenu(); }
    function pulseDot() { if (ui && ui.dot) { ui.dot.classList.add('stm-pulse-animate'); ui.dot.addEventListener('animationend', () => ui.dot.classList.remove('stm-pulse-animate'), { once: true }); } }

    // --- Helpers ---
    function bidForDrop(requestId, onWin) {
        const myInterestKey = `${GM_PREFIX}interest_${requestId}_${myInstanceId}`;
        // Score is primarily focus time, with a huge bonus if we currently have focus
        const score = lastFocusTime + (document.hasFocus() ? 1e12 : 0);

        GM_setValue(myInterestKey, {
            score: score,
            id: myInstanceId,
            url: window.location.hostname,
            ts: Date.now()
        });

        // Wait for other tabs to also post their interest (increased delay for sync)
        setTimeout(() => {
            const allKeys = GM_listValues();
            const interestKeys = allKeys.filter(k => k.startsWith(`${GM_PREFIX}interest_${requestId}_`));
            const interests = interestKeys.map(k => GM_getValue(k)).filter(Boolean);

            // Sort by score (descending), then by ID as tie-breaker
            interests.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return b.id < a.id ? -1 : 1;
            });

            const winner = interests[0];
            const iWon = winner && winner.id === myInstanceId;

            if (interests.length > 1) {
                console.log(`[SplitView] Bidding for ${requestId}:`, {
                    iWon,
                    myScore: score,
                    winner: winner,
                    allBids: interests
                });
            }

            if (iWon) {
                onWin();
            }

            // Cleanup our interest key after a short grace period
            setTimeout(() => GM_deleteValue(myInterestKey), 1000);
        }, 200);
    }

    function publishNavigation(url) {
        // Ensure monotonic timestamp to guarantee listener fires even on rapid/same-URL clicks.
        const current = GM_getValue(getTimestampKey(myId), 0);
        const now = Date.now();
        const ts = now > current ? now : current + 1;
        GM_setValue(getTargetUrlKey(myId), url);
        GM_setValue(getTimestampKey(myId), ts);
    }

    function addSourceToGroup(groupId, sourceTabId) {
        const sources = GM_getValue(getSourceListKey(groupId), []);
        if (!sources.includes(sourceTabId)) {
            sources.push(sourceTabId);
            GM_setValue(getSourceListKey(groupId), sources);
        }
    }

    function removeSourceFromGroup(groupId, sourceTabId) {
        const sources = GM_getValue(getSourceListKey(groupId), []);
        const filtered = sources.filter(id => id !== sourceTabId);
        if (filtered.length > 0) {
            GM_setValue(getSourceListKey(groupId), filtered);
        } else {
            GM_deleteValue(getSourceListKey(groupId));
        }
    }
    function setRole(role, id = null, joinExisting = false) {
        if (role === 'source') {
            let groupId;
            if (joinExisting && id) {
                // Join existing group
                groupId = id;
            } else {
                // Create new group or use provided ID
                groupId = id || generateId();
            }

            const sourceTabId = generateId(); // Unique ID for this source tab
            saveState('source', groupId, 0, sourceTabId);
            addSourceToGroup(groupId, sourceTabId);
            GM_setValue(KEY_LATEST_SOURCE, { sourceId: groupId, timestamp: Date.now() });
        } else if (role === 'target') {
            if (!id) { GM_notification({ text: 'Cannot become Target without a Source ID.' }); return; }
            saveState('target', id);
        }
    }
    // Disconnects just this tab, leaving the other tab in its role.
    function revokeRole() {
        if (myRole === 'source' && myId && mySourceTabId) {
            removeSourceFromGroup(myId, mySourceTabId);
        }
        saveState('idle', null, 0, null);
    }

    // Disconnects both tabs.
    function broadcastDisconnect() {
        if (myRole === 'source' && myId && mySourceTabId) {
            removeSourceFromGroup(myId, mySourceTabId);
        }
        if (myId) {
            GM_setValue(getDisconnectKey(myId), Date.now());
            saveState('idle', null, 0, null);
        }
    }

    let dragState = {};
    function handleDragStart(e) {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        dragState = { isClick: true, startX: e.clientX, startY: e.clientY };
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd, { once: true });
    }
    function handleDragMove(e) {
        if (dragState.isClick && (Math.abs(e.clientX - dragState.startX) > 5 || Math.abs(e.clientY - dragState.startY) > 5)) {
            dragState.isClick = false;
        }
        if (myRole === 'source' || myRole === 'target') { ui.dot.style.cursor = 'grabbing'; }
    }
    function handleDragEnd(e) {
        window.removeEventListener('mousemove', handleDragMove);
        if (dragState.isClick) {
            toggleMenu();
        } else if (myRole === 'source') {
            GM_setValue(KEY_DRAG_PAIR_REQUEST, {
                requestId: generateId(),
                sourceId: myId,
                timestamp: Date.now(),
                dropX: e.screenX,
                dropY: e.screenY
            });
        } else if (myRole === 'target') {
            GM_setValue(KEY_DRAG_SOURCE_REQUEST, {
                requestId: generateId(),
                targetId: myId,
                timestamp: Date.now(),
                dropX: e.screenX,
                dropY: e.screenY
            });
        }
        ui.dot.style.cursor = 'grab';
        dragState = {};
    }
    function handleMenuClick(e) {
        const action = e.target.dataset.action;
        if (!action) return;

        if (action === 'disconnect') {
            broadcastDisconnect();
        } else if (action === 'revoke') {
            revokeRole();
        } else if (action === 'join-source') {
            const latestSource = GM_getValue(KEY_LATEST_SOURCE, null);
            if (latestSource) {
                setRole('source', latestSource.sourceId, true);
            }
        }
        toggleMenu();
    }
    function handleLinkClick(e) {
        if (myRole !== 'source' || !myId) return;
        const link = e.target.closest('a[href]');
        if (!link || link.href.startsWith('javascript:') || link.href.startsWith('#')) return;
        // Only intercept if we can publish; otherwise let the navigation proceed normally.
        try {
            publishNavigation(link.href);
            e.preventDefault(); e.stopPropagation();
            pulseDot();
        } catch (err) {
            // If publishing fails for any reason, fall back to normal navigation.
        }
    }

    function matchesKeyConfig(event, keyConfig) {
        return event.button === keyConfig.button && event.ctrlKey === keyConfig.ctrl && event.altKey === keyConfig.alt && event.shiftKey === keyConfig.shift;
    }

    function isDropInsideThisWindow(dropX, dropY) {
        // Use window position and size to decide whether the drop point is inside this window.
        const left = window.screenX;
        const top = window.screenY;
        const right = left + window.outerWidth;
        const bottom = top + window.outerHeight;
        return dropX >= left && dropX <= right && dropY >= top && dropY <= bottom;
    }

    function attachRoleSpecificListeners() {
        activeListeners.forEach(listenerId => GM_removeValueChangeListener(listenerId));
        activeListeners = [];
        if (myRole === 'idle' || !myId) return;
        const disconnectListener = GM_addValueChangeListener(getDisconnectKey(myId), (k, o, n, r) => { if (r) saveState('idle', null, 0, null); });
        activeListeners.push(disconnectListener);
        if (myRole === 'target') {
            // Some managers may not flag `remote` reliably; rely on timestamp monotonicity instead.
            const urlListener = GM_addValueChangeListener(getTimestampKey(myId), (k, o, n) => {
                if (n > myLastTs) {
                    // Pulse and save state before navigating
                    pulseDot();
                    saveState('target', myId, n);
                    window.location.href = GM_getValue(getTargetUrlKey(myId));
                }
            });
            activeListeners.push(urlListener);

            // Listen for retargeting requests (when dragged to create new source)
            const retargetListener = GM_addValueChangeListener(`${GM_PREFIX}retarget_${myId}`, (k, o, n) => {
                if (n && n.newSourceId) {
                    // Switch to the new source
                    saveState('target', n.newSourceId);
                    // Clean up the retarget request
                    GM_deleteValue(`${GM_PREFIX}retarget_${myId}`);
                }
            });
            activeListeners.push(retargetListener);

            // Initial Check for missed updates (Latency/Race condition fix)
            const serverTs = GM_getValue(getTimestampKey(myId), 0);
            if (serverTs > myLastTs) {
                pulseDot();
                saveState('target', myId, serverTs);
                window.location.href = GM_getValue(getTargetUrlKey(myId));
            }
        }
    }

    function initialize() {
        loadConfig();
        injectStyles();
        primeStateFromWindowName();
        // Attach link interception immediately so early clicks are captured even before state restore completes.
        window.addEventListener('click', handleLinkClick, true);

        // Restore state, then arm listeners to avoid transient "idle" pairing.
        loadState().then(s => {
            // Merge with any primed state to avoid overwriting an existing Source/Target.
            const mergedRole = (myRole && myRole !== 'idle') ? myRole : s.role;
            const mergedId = myId || s.id;
            const mergedTs = myLastTs || s.lastTs;
            const mergedSourceTabId = mySourceTabId || s.sourceTabId;
            saveState(mergedRole, mergedId, mergedTs, mergedSourceTabId);
            stateLoaded = true;

            // Drag-pair listener: only pair the window under the drop point (ignore stale/coordless).
            GM_addValueChangeListener(KEY_DRAG_PAIR_REQUEST, (key, oldVal, newVal, remote) => {
                if (!remote || !stateLoaded || myRole !== 'idle' || !newVal || document.hidden) return;
                const { dropX, dropY, sourceId, timestamp, requestId } = newVal;
                const hasCoords = typeof dropX === 'number' && typeof dropY === 'number';
                if (!hasCoords) return;
                if (typeof timestamp === 'number' && Date.now() - timestamp > PAIR_MAX_AGE_MS) return;

                if (isDropInsideThisWindow(dropX, dropY)) {
                    bidForDrop(requestId || 'legacy', () => {
                        setRole('target', sourceId);
                    });
                }
            });

            // Drag-source listener: create source when target is dragged to idle window
            GM_addValueChangeListener(KEY_DRAG_SOURCE_REQUEST, (key, oldVal, newVal, remote) => {
                if (!remote || !stateLoaded || myRole !== 'idle' || !newVal || document.hidden) return;
                const { dropX, dropY, targetId, timestamp, requestId } = newVal;
                const hasCoords = typeof dropX === 'number' && typeof dropY === 'number';
                if (!hasCoords) return;
                if (typeof timestamp === 'number' && Date.now() - timestamp > PAIR_MAX_AGE_MS) return;

                if (isDropInsideThisWindow(dropX, dropY)) {
                    bidForDrop(requestId || 'legacy', () => {
                        // Join the existing group instead of creating a new one
                        setRole('source', targetId, true);
                    });
                }
            });

            // Cleanup any stale interest keys from previous sessions
            const staleInterests = GM_listValues().filter(k => k.startsWith(`${GM_PREFIX}interest_`));
            staleInterests.forEach(k => GM_deleteValue(k));

            // --- Menu Configuration ---
            const menuCommands = [
                { name: "Create Source", func: () => setRole('source') },
                { name: "Configure Keys", func: showConfigPanel },
                { name: "Reset Roles", func: resetAllRoles }
            ];
            menuCommands.forEach(cmd => GM_registerMenuCommand(cmd.name, cmd.func));

            window.addEventListener('mousedown', (e) => {
                if (matchesKeyConfig(e, config.sourceKey)) {
                    e.preventDefault(); e.stopPropagation();
                    setRole('source');
                } else if (matchesKeyConfig(e, config.targetKey)) {
                    e.preventDefault(); e.stopPropagation();
                    const l = GM_getValue(KEY_LATEST_SOURCE, null);
                    if (l) setRole('target', l.sourceId);
                    else GM_notification({ text: 'No Source tab found.' });
                }
            }, true);
        });
    }

    initialize();

    console.log('Split Tab (Dev): Script initialized (v1.0.3)');

})();
