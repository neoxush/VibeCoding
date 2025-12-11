// ==UserScript==
// @name         Split Tab Manager (Dev)
// @namespace    http://tampermonkey.net/
// @version      0.21
// @description  FIX: Drag-to-pair now only sets the currently visible tab as Target, preventing background tabs from being accidentally paired.
// @author       You
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_addStyle
// @grant        GM_notification
// ==/UserScript==

(function () {
    'use strict';

    console.log('Split Tab (Dev): Script initialized (v0.21)');

    // --- Configuration & Keys ---
    const STATE_PREFIX = 'STM_STATE_V18=';
    const SESSION_KEY_ROLE = 'stm_role_v18';
    const SESSION_KEY_ID = 'stm_id_v18';

    const GM_PREFIX = 'stm_gm_v18_';
    const KEY_LATEST_SOURCE = `${GM_PREFIX}latest_source`;
    const KEY_DRAG_PAIR_REQUEST = `${GM_PREFIX}drag_pair_request`;
    const KEY_CONFIG = `${GM_PREFIX}config`;
    const getTargetUrlKey = (id) => `${GM_PREFIX}url_${id}`;
    const getTimestampKey = (id) => `${GM_PREFIX}ts_${id}`;
    const getDisconnectKey = (id) => `${GM_PREFIX}disconnect_${id}`;

    // Default configuration
    const DEFAULT_CONFIG = {
        sourceKey: { button: 1, ctrl: true, alt: false, shift: false },
        targetKey: { button: 1, ctrl: false, alt: true, shift: false }
    };

    // --- State Management ---
    let myRole = 'idle';
    let myId = null;
    let ui = null;
    let configPanel = null;
    let activeListeners = [];
    let config = null;

    function loadConfig() {
        config = GM_getValue(KEY_CONFIG, DEFAULT_CONFIG);
    }

    function saveConfig(newConfig) {
        config = newConfig;
        GM_setValue(KEY_CONFIG, config);
    }

    function saveState(role, id) {
        myRole = role; myId = id;
        if (role === 'idle') {
            [SESSION_KEY_ROLE, SESSION_KEY_ID].forEach(k => sessionStorage.removeItem(k));
            if (window.name.startsWith(STATE_PREFIX)) window.name = '';
        } else {
            sessionStorage.setItem(SESSION_KEY_ROLE, role);
            sessionStorage.setItem(SESSION_KEY_ID, id);
            window.name = STATE_PREFIX + JSON.stringify({ role, id });
        }
        updateUI();
        attachRoleSpecificListeners();
    }

    function loadState() {
        const sessionRole = sessionStorage.getItem(SESSION_KEY_ROLE);
        const sessionId = sessionStorage.getItem(SESSION_KEY_ID);

        if (sessionRole && sessionId) {
            return { role: sessionRole, id: sessionId };
        }

        return { role: 'idle', id: null };
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

    function updateUI() {
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
        if (myRole !== 'idle') {
            ui.menu.innerHTML = `<div class="stm-menu-item" data-action="disconnect">Disconnect</div>`;
        }
    }

    function toggleMenu() { if(ui && ui.menu) ui.menu.style.display = ui.menu.style.display === 'block' ? 'none' : 'block'; }
    function pulseDot() { if(ui && ui.dot) { ui.dot.classList.add('stm-pulse-animate'); ui.dot.addEventListener('animationend', () => ui.dot.classList.remove('stm-pulse-animate'), { once: true }); } }

    const generateId = () => Math.random().toString(36).substr(2, 9);
    function setRole(role, id = null) {
        if (role === 'source') {
            const newId = id || generateId();
            saveState('source', newId);
            GM_setValue(KEY_LATEST_SOURCE, { sourceId: newId, timestamp: Date.now() });
        } else if (role === 'target') {
            if (!id) { GM_notification({ text: 'Cannot become Target without a Source ID.'}); return; }
            saveState('target', id);
        }
    }
    function broadcastDisconnect() { if (myId) { GM_setValue(getDisconnectKey(myId), Date.now()); saveState('idle', null); } }

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
        if (myRole === 'source') { ui.dot.style.cursor = 'grabbing'; }
    }
    function handleDragEnd(e) {
        window.removeEventListener('mousemove', handleDragMove);
        if (dragState.isClick) {
            toggleMenu();
        } else if (myRole === 'source') {
            GM_setValue(KEY_DRAG_PAIR_REQUEST, { sourceId: myId, timestamp: Date.now() });
        }
        ui.dot.style.cursor = 'grab';
        dragState = {};
    }
    function handleMenuClick(e) { const action = e.target.dataset.action; if (!action) return; if (action === 'disconnect') broadcastDisconnect(); toggleMenu(); }
    function handleLinkClick(e) {
        if (myRole !== 'source') return;
        const link = e.target.closest('a[href]');
        if (!link || link.href.startsWith('javascript:') || link.href.startsWith('#')) return;
        e.preventDefault(); e.stopPropagation();
        GM_setValue(getTargetUrlKey(myId), link.href);
        GM_setValue(getTimestampKey(myId), Date.now());
        pulseDot();
    }

    function matchesKeyConfig(event, keyConfig) {
        return event.button === keyConfig.button && event.ctrlKey === keyConfig.ctrl && event.altKey === keyConfig.alt && event.shiftKey === keyConfig.shift;
    }

    function attachRoleSpecificListeners() {
        activeListeners.forEach(listenerId => GM_removeValueChangeListener(listenerId));
        activeListeners = [];
        if (myRole === 'idle' || !myId) return;
        const disconnectListener = GM_addValueChangeListener(getDisconnectKey(myId), (k, o, n, r) => { if (r) saveState('idle', null); });
        activeListeners.push(disconnectListener);
        if (myRole === 'target') {
            const urlListener = GM_addValueChangeListener(getTimestampKey(myId), (k, o, n, r) => { if (r) { pulseDot(); window.location.href = GM_getValue(getTargetUrlKey(myId)); } });
            activeListeners.push(urlListener);
        }
    }

    function initialize() {
        loadConfig();

        // *** v0.21 FIX ***
        // The listener now checks if the tab is visible (`!document.hidden`).
        // This ensures that only the active tab the user drops on becomes a target,
        // preventing background tabs from being paired accidentally.
        GM_addValueChangeListener(KEY_DRAG_PAIR_REQUEST, (key, oldVal, newVal, remote) => {
            if (remote && myRole === 'idle' && !document.hidden) {
                setRole('target', newVal.sourceId);
            }
        });

        const s = loadState();
        injectStyles();
        saveState(s.role, s.id);
        window.addEventListener('click', handleLinkClick, true);
        GM_registerMenuCommand("STM (Dev): Disconnect", broadcastDisconnect);
        GM_registerMenuCommand("STM (Dev): Configure Keys", showConfigPanel);
        window.addEventListener('mousedown', (e) => {
            if (matchesKeyConfig(e, config.sourceKey)) {
                e.preventDefault(); e.stopPropagation();
                setRole('source');
            } else if (matchesKeyConfig(e, config.targetKey)) {
                e.preventDefault(); e.stopPropagation();
                const l = GM_getValue(KEY_LATEST_SOURCE, null);
                if (l) setRole('target', l.sourceId);
                else GM_notification({text: 'No Source tab found.'});
            }
        }, true);
    }

    initialize();

})();
