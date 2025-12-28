// ==UserScript==
// @name         Enhanced Split View for Chrome
// @namespace    http://tampermonkey.net/
// @version      1.0.7
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
// Notification system replaces GM_notification
// ==/UserScript==

(function () {
    'use strict';

    // --- Modern Notification System ---
    const Notify = {
        show(type, message, title = '') {
            const notification = document.createElement('div');
            notification.className = `esv-notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                min-width: 200px;
                max-width: 500px;
                width: fit-content;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateX(120%);
                transition: transform 0.3s ease-out, opacity 0.3s ease-out;
                opacity: 0;
                display: flex;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
                backdrop-filter: blur(10px);
                background-color: ${{
                    success: 'rgba(46, 204, 113, 0.95)',
                    error: 'rgba(231, 76, 60, 0.95)',
                    info: 'rgba(52, 152, 219, 0.95)',
                    warning: 'rgba(241, 196, 15, 0.95)'
                }[type]};
            `;

            const icon = {
                success: '✓',
                error: '✕',
                info: 'ℹ',
                warning: '⚠'
            }[type] || 'ℹ';

            notification.innerHTML = `
                <span style="margin-right: 12px; font-size: 18px; flex-shrink: 0;">${icon}</span>
                <div style="flex: 1;">
                    ${title ? `<div style="font-weight: 600; margin: 0 0 4px 0; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word;">${title}</div>` : ''}
                    <div style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word;">${message}</div>
                </div>
                <span class="esv-notification-close" style="margin-left: 12px; cursor: pointer; opacity: 0.7; font-size: 16px; line-height: 1; transition: opacity 0.2s;" title="Dismiss">&times;</span>
            `;

            document.body.appendChild(notification);

            // Trigger reflow
            void notification.offsetWidth;

            // Show notification
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';

            // Auto-remove after 4 seconds
            const removeNotification = () => {
                notification.style.transform = 'translateX(120%)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            };
            const timeout = setTimeout(removeNotification, 4000);

            // Close button
            const closeBtn = notification.querySelector('.esv-notification-close');
            closeBtn.onclick = () => {
                clearTimeout(timeout);
                removeNotification();
            };

            return notification;
        },

        success(message, title = 'Success') {
            return this.show('success', message, title);
        },

        error(message, title = 'Error') {
            return this.show('error', message, title);
        },

        info(message, title = 'Information') {
            return this.show('info', message, title);
        },

        warning(message, title = 'Warning') {
            return this.show('warning', message, title);
        }
    };

    // Note: You can reorder the right-click menu items by editing the 'contextMenuItems' array in the updateUI function.

    // --- Configuration & Keys ---
    const GM_PREFIX = 'stm_gm_v18_';
    const KEY_LATEST_SOURCE = `${GM_PREFIX}latest_source`;
    const KEY_CONFIG = `${GM_PREFIX}config`;
    const KEY_GLOBAL_RESET = `${GM_PREFIX}global_reset`;
    const KEY_UI_POS = `${GM_PREFIX}ui_pos`;
    const KEY_MUTE_LAZYLOAD = `${GM_PREFIX}mute_lazyload_activated`;
    const getMuteStateKey = (id, role) => `${GM_PREFIX}mute_${role}_${id}`;
    const getLazyloadKey = (id, role) => `${GM_PREFIX}lazyload_${role}_${id}`;
    const getTargetUrlKey = (id) => `${GM_PREFIX}url_${id}`;
    const getTimestampKey = (id) => `${GM_PREFIX}ts_${id}`;
    const getDisconnectKey = (id) => `${GM_PREFIX}disconnect_${id}`;
    const getSourceListKey = (id) => `${GM_PREFIX}sources_${id}`;
    const getRoleNotificationKey = (id) => `${GM_PREFIX}role_notification_${id}`;

    // Default configuration
    const DEFAULT_CONFIG = {
        sourceKey: { button: 1, ctrl: true, alt: false, shift: false },
        targetKey: { button: 1, ctrl: false, alt: true, shift: false },
        notifications: {
            newSourceRole: true,
            newTargetRole: true,
            revokeRole: true
        }
    };

    // --- State Management ---
    const generateId = () => Math.random().toString(36).substring(2, 11);
    const myInstanceId = generateId();
    let myRole = 'idle';
    let myId = null;
    let myLastTs = 0;
    let mySourceTabId = null; // Unique ID for this source tab instance
    let myIsMuted = false;
    let stateLoaded = false;
    let ui = null;
    let configPanel = null;
    let activeListeners = [];
    let config = null;

    // --- Lazyload Mute Control ---
    let muteLazyloadActivated = false;

    // Load persistent lazyload state for current tab/role
    function loadMuteLazyloadState() {
        if (myRole !== 'idle' && myId) {
            muteLazyloadActivated = GM_getValue(getLazyloadKey(myId, myRole), false);
        }
    }

    // Save persistent lazyload state for current tab/role
    function saveMuteLazyloadState() {
        if (myRole !== 'idle' && myId) {
            GM_setValue(getLazyloadKey(myId, myRole), muteLazyloadActivated);
        }
    }

    // Load tab-specific mute state
    function loadTabMuteState() {
        if (myRole !== 'idle' && myId) {
            myIsMuted = GM_getValue(getMuteStateKey(myId, myRole), false);
        }
    }

    // Save tab-specific mute state
    function saveTabMuteState() {
        if (myRole !== 'idle' && myId) {
            GM_setValue(getMuteStateKey(myId, myRole), myIsMuted);
        }
    }

    // Lazyload activation function (one-time per tab/role)
    function activateMuteLazyload() {
        if (muteLazyloadActivated) return;

        muteLazyloadActivated = true;
        saveMuteLazyloadState();
        Notify.info('Mute control activated');

        // Apply current mute state to all media elements immediately
        if (mediaManager) {
            if (mediaManager.elements) {
                mediaManager.elements.forEach(el => {
                    el.muted = myIsMuted;
                });
            }
            if (mediaManager.muteAllIframes) {
                mediaManager.muteAllIframes(myIsMuted);
            }
        }

        updateUI(); // Update UI to show active volume button
    }

    // Lightweight, synchronous prime from window.name so navigation retains role/id even before async loadState finishes.
    function primeStateFromWindowName() {
        try {
            // Try window.name first
            let payloadStr = window.name;
            let parsed = null;

            try {
                parsed = JSON.parse(payloadStr || '{}');
            } catch (e) { /* not JSON */ }

            // Fallback to sessionStorage if window.name is empty or not ours
            if (!parsed || !parsed.stmRole) {
                payloadStr = sessionStorage.getItem('stm_state');
                parsed = JSON.parse(payloadStr || '{}');
            }

            if (parsed && parsed.stmRole && parsed.stmId) {
                myRole = parsed.stmRole;
                myId = parsed.stmId;
                myLastTs = parsed.stmLastTs || 0;
                mySourceTabId = parsed.stmSourceTabId;
                loadTabMuteState(); // Load tab-specific mute state
                loadMuteLazyloadState(); // Load tab-specific lazyload state
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
        // Reattach listeners with new configuration
        if (myRole !== 'idle' && myId) {
            attachRoleSpecificListeners();
        }
    }

    function saveState(role, id, lastTs = 0, sourceTabId = null, isMuted = null) {
        myRole = role; myId = id; myLastTs = lastTs; mySourceTabId = sourceTabId;

        // If we are becoming idle, we must unmute.
        // Otherwise, we only update mute state if explicitly provided.
        if (myRole === 'idle') {
            myIsMuted = false;
        } else if (isMuted !== null) {
            myIsMuted = isMuted;
            saveTabMuteState(); // Save tab-specific mute state
        }

        // Apply mute state to all tracked media elements only if lazyload is activated
        if (mediaManager && muteLazyloadActivated) {
            if (mediaManager.elements) {
                mediaManager.elements.forEach(el => {
                    el.muted = myIsMuted;
                });
            }
            if (mediaManager.muteAllIframes) {
                mediaManager.muteAllIframes(myIsMuted);
            }
        }

        // Save current UI position when establishing a new role
        if (role !== 'idle' && ui && ui.container) {
            const currentPos = GM_getValue(KEY_UI_POS, {});
            currentPos[role] = {
                top: ui.container.style.top || '85px',
                left: ui.container.style.left || 'auto',
                right: ui.container.style.right || 'auto',
                side: ui.container.classList.contains('stm-side-left') ? 'left' :
                    ui.container.classList.contains('stm-side-right') ? 'right' :
                        (role === 'target' ? 'left' : 'right')
            };
            GM_setValue(KEY_UI_POS, currentPos);
        }

        // Simplified Logic: Save directly to the Tab Object
        // GM_saveTab persists even across domain changes in the same tab.
        GM_saveTab({
            role: myRole,
            id: myId,
            lastTs: myLastTs,
            sourceTabId: mySourceTabId,
            isMuted: myIsMuted
        });

        // Secondary fallback persistence using window.name and sessionStorage to survive edge cases.
        try {
            const payload = { stmRole: myRole, stmId: myId, stmLastTs: myLastTs, stmSourceTabId: mySourceTabId, stmIsMuted: myIsMuted };
            const payloadStr = JSON.stringify(payload);
            const currentName = window.name;
            let canWrite = false;

            if (!currentName) {
                canWrite = true;
            } else {
                try {
                    const parsed = JSON.parse(currentName);
                    if (parsed && parsed.stmRole) {
                        canWrite = true;
                    }
                } catch (e) {
                    // window.name is not JSON or not ours - preserve it
                }
            }

            if (canWrite) {
                window.name = payloadStr;
            }
            sessionStorage.setItem('stm_state', payloadStr);
        } catch (err) { /* ignore */ }

        updateUI();
        attachRoleSpecificListeners();
    }

    function loadState() {
        // Direct retrieval from the Tab Object
        return new Promise((resolve) => {
            GM_getTab((tab) => {
                if (tab && tab.role) {
                    resolve({
                        role: tab.role,
                        id: tab.id,
                        lastTs: tab.lastTs || 0,
                        sourceTabId: tab.sourceTabId,
                        isMuted: GM_getValue(getMuteStateKey(tab.id, tab.role), false)
                    });
                    return;
                }
                // Fallback: attempt to parse window.name if it holds our state
                try {
                    const parsed = JSON.parse(window.name || '{}');
                    if (parsed.stmRole) {
                        resolve({
                            role: parsed.stmRole,
                            id: parsed.stmId,
                            lastTs: parsed.stmLastTs || 0,
                            sourceTabId: parsed.stmSourceTabId,
                            isMuted: GM_getValue(getMuteStateKey(parsed.stmId, parsed.stmRole), false)
                        });
                        return;
                    }
                } catch (err) { /* ignore */ }
                // Fallback: sessionStorage (survives same-tab navigations)
                try {
                    const parsed = JSON.parse(sessionStorage.getItem('stm_state') || '{}');
                    if (parsed.stmRole) {
                        resolve({
                            role: parsed.stmRole,
                            id: parsed.stmId,
                            lastTs: parsed.stmLastTs || 0,
                            sourceTabId: parsed.stmSourceTabId,
                            isMuted: GM_getValue(getMuteStateKey(parsed.stmId, parsed.stmRole), false)
                        });
                        return;
                    }
                } catch (err) { /* ignore */ }
                resolve({ role: 'idle', id: null, lastTs: 0, sourceTabId: null, isMuted: false });
            });
        });
    }


    // --- UI Logic ---
    function injectStyles() {
        GM_addStyle(`
            @keyframes stm-pulse { 0% {transform: scale(1);} 50% {transform: scale(1.2);} 100% {transform: scale(1);} }
            .stm-pulse-animate { animation: stm-pulse 0.5s ease-out; }

            #stm-ui-container {
                position: fixed;
                z-index: 2147483647;
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0;
                background: rgba(20, 20, 20, 0.7);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 4px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05);
                transition: gap 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s, background-color 0.3s, transform 0.2s;
            }

            #stm-ui-container.stm-collapsed {
                background: rgba(20, 20, 20, 0.4);
                padding: 2px;
                border-color: rgba(255, 255, 255, 0.05);
            }

            #stm-ui-container.stm-side-right { border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: none; }
            #stm-ui-container.stm-side-left { border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: none; }

            #stm-status-dot {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-size: 14px;
                font-weight: 800;
                color: white;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: 50%;
                position: relative;
                z-index: 2;
            }

            .stm-side-right #stm-status-dot { background: linear-gradient(135deg, #28a745, #1e7e34); box-shadow: 0 2px 10px rgba(40, 167, 69, 0.3); }
            .stm-side-left #stm-status-dot { background: linear-gradient(135deg, #007bff, #0056b3); box-shadow: 0 2px 10px rgba(0, 123, 255, 0.3); }

            .stm-collapsed #stm-status-dot { transform: scale(0.85); opacity: 0.7; }
            #stm-ui-container:hover #stm-status-dot { transform: scale(1); opacity: 1; }

            #stm-grip {
                width: 12px;
                height: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                cursor: grab;
                padding: 0 4px;
                opacity: 0;
                transition: opacity 0.3s, width 0.3s;
                width: 0;
                overflow: hidden;
            }
            #stm-grip:active { cursor: grabbing; }
            #stm-ui-container:not(.stm-collapsed) #stm-grip { opacity: 0.5; width: 20px; }
            #stm-grip:hover { opacity: 1 !important; }
            .stm-grip-dot { width: 3px; height: 3px; background: white; border-radius: 50%; }

            #stm-status-dot.stm-drag-over { background: #ffc107 !important; transform: scale(1.1) !important; box-shadow: 0 0 20px rgba(255, 193, 7, 0.6); }
            #stm-status-dot.stm-global-drag-over { background: #17a2b8 !important; transform: scale(1.05); box-shadow: 0 0 15px rgba(23, 162, 184, 0.5); }

            #stm-volume-btn {
                width: 28px;
                height: 28px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                opacity: 0;
                width: 0;
                overflow: hidden;
            }
            #stm-ui-container:not(.stm-collapsed) #stm-volume-btn { opacity: 1; width: 28px; margin: 0 4px; }
            #stm-volume-btn:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.1); }
            #stm-volume-btn svg { width: 16px; height: 16px; fill: #fff; }

            #stm-menu {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                background: rgba(30, 30, 30, 0.95);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                width: 140px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 13px;
                z-index: 3;
            }
            #stm-ui-container.stm-side-right #stm-menu { right: 0; }
            #stm-ui-container.stm-side-left #stm-menu { left: 0; }
            .stm-menu-item {
                display: block;
                width: 100%;
                padding: 10px 16px;
                background: none;
                border: none;
                text-align: left;
                color: #eee;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
                font-size: 13px;
                line-height: 1.4;
            }
            .stm-menu-item:hover, .stm-menu-item:focus {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                outline: none;
            }
            .stm-menu-item:focus-visible {
                outline: 2px solid #4CAF50;
                outline-offset: -2px;
            }
            .stm-menu-item:not(:last-child) {
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            #stm-config-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a1a; border: 1px solid #333; border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); z-index: 2147483648; font-family: 'Inter', system-ui, sans-serif; color: #fff; min-width: 400px; }
            #stm-config-panel h3 { margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #fff; }
            .stm-config-section { margin-bottom: 24px; padding: 16px; background: #252525; border-radius: 12px; border: 1px solid #333; }
            .stm-config-section h4 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #4CAF50; text-transform: uppercase; letter-spacing: 0.5px; }
            .stm-config-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
            .stm-config-label { flex: 1; font-size: 14px; color: #bbb; }
            .stm-config-input select { background: #333; color: #fff; border: 1px solid #444; border-radius: 6px; padding: 6px 10px; cursor: pointer; outline: none; }
            .stm-config-input select:focus { border-color: #4CAF50; }
            .stm-config-buttons { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
            .stm-config-btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
            .stm-config-btn-save { background: #4CAF50; color: white; }
            .stm-config-btn-save:hover { background: #45a049; transform: translateY(-1px); }
            .stm-config-btn-cancel { background: #444; color: white; }
            .stm-config-btn-cancel:hover { background: #555; }
            .stm-config-btn-reset { background: #f44336; color: white; }
            .stm-config-btn-reset:hover { background: #da190b; }
            #stm-config-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 2147483647; }
        `);
    }

    function createConfigPanel() {
        const overlay = document.createElement('div');
        overlay.id = 'stm-config-overlay';
        const panel = document.createElement('div');
        panel.id = 'stm-config-panel';
        panel.innerHTML = `
            <h3>Preference</h3>
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
                        <label for="stm-source-ctrl"><input type="checkbox" id="stm-source-ctrl"> Ctrl</label>
                        <label for="stm-source-alt"><input type="checkbox" id="stm-source-alt"> Alt</label>
                        <label for="stm-source-shift"><input type="checkbox" id="stm-source-shift"> Shift</label>
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
                        <label for="stm-target-ctrl"><input type="checkbox" id="stm-target-ctrl"> Ctrl</label>
                        <label for="stm-target-alt"><input type="checkbox" id="stm-target-alt"> Alt</label>
                        <label for="stm-target-shift"><input type="checkbox" id="stm-target-shift"> Shift</label>
                    </div>
                </div>
            </div>
            <div class="stm-config-section">
                <h4>Notifications</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Source Role:</div>
                    <div class="stm-config-input">
                        <label for="stm-notify-new-source"><input type="checkbox" id="stm-notify-new-source"> Notify when new source tab joins</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Target Role:</div>
                    <div class="stm-config-input">
                        <label for="stm-notify-new-target"><input type="checkbox" id="stm-notify-new-target"> Notify when new target tab joins</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Revoke Role:</div>
                    <div class="stm-config-input">
                        <label for="stm-notify-revoke"><input type="checkbox" id="stm-notify-revoke"> Notify when a tab revokes its role</label>
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

        // Load notification settings
        const notifications = config.notifications || { newSourceRole: true, newTargetRole: true, revokeRole: true };
        document.getElementById('stm-notify-new-source').checked = notifications.newSourceRole;
        document.getElementById('stm-notify-new-target').checked = notifications.newTargetRole;
        document.getElementById('stm-notify-revoke').checked = notifications.revokeRole;

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
            targetKey: { button: parseInt(document.getElementById('stm-target-button').value), ctrl: document.getElementById('stm-target-ctrl').checked, alt: document.getElementById('stm-target-alt').checked, shift: document.getElementById('stm-target-shift').checked },
            notifications: {
                newSourceRole: document.getElementById('stm-notify-new-source').checked,
                newTargetRole: document.getElementById('stm-notify-new-target').checked,
                revokeRole: document.getElementById('stm-notify-revoke').checked
            }
        };
        saveConfig(newConfig);
        hideConfigPanel();
        Notify.success('Configuration saved!');
    }

    function resetConfigToDefault() {
        saveConfig(DEFAULT_CONFIG);
        showConfigPanel();
        Notify.info('Configuration reset to defaults!');
    }

    function resetAllRoles() {
        const keys = GM_listValues().filter(k => k.startsWith(GM_PREFIX));
        const ids = new Set();
        const urlPrefix = `${GM_PREFIX}url_`;
        const tsPrefix = `${GM_PREFIX}ts_`;
        const disconnectPrefix = `${GM_PREFIX}disconnect_`;
        const sourcesPrefix = `${GM_PREFIX}sources_`;
        const mutePrefix = `${GM_PREFIX}mute_`;
        const lazyloadPrefix = `${GM_PREFIX}lazyload_`;

        keys.forEach(k => {
            if (k.startsWith(urlPrefix)) ids.add(k.slice(urlPrefix.length));
            else if (k.startsWith(tsPrefix)) ids.add(k.slice(tsPrefix.length));
            else if (k.startsWith(disconnectPrefix)) ids.add(k.slice(disconnectPrefix.length));
            else if (k.startsWith(sourcesPrefix)) ids.add(k.slice(sourcesPrefix.length));
            else if (k.startsWith(mutePrefix) || k.startsWith(lazyloadPrefix)) {
                // Remove tab-specific mute and lazyload states
                GM_deleteValue(k);
            }
        });

        // Also check the latest source key
        const latestSource = GM_getValue(KEY_LATEST_SOURCE, null);
        if (latestSource && latestSource.sourceId) ids.add(latestSource.sourceId);

        // Notify other tabs to drop their roles via specific IDs.
        ids.forEach(id => GM_setValue(getDisconnectKey(id), Date.now()));

        // Broadcast a global reset signal as a fallback for tabs without discovered IDs.
        GM_setValue(KEY_GLOBAL_RESET, Date.now());
        // Remove all role-related stored values while preserving configuration.
        keys.forEach(k => {
            if (k === KEY_CONFIG) return;
            GM_deleteValue(k);
        });
        // Clear tab-specific state and session storage
        GM_saveTab({});
        try {
            // Only clear window.name if it belongs to us
            const currentName = window.name;
            if (currentName) {
                try {
                    const parsed = JSON.parse(currentName);
                    if (parsed && parsed.stmRole) {
                        window.name = '';
                    }
                } catch (e) { /* not ours */ }
            }
            sessionStorage.removeItem('stm_state');
        } catch (err) { /* ignore */ }
        saveState('idle', null, 0, null);
    }

    function applySavedPosition() {
        if (!ui || !ui.container) return;

        const savedPos = GM_getValue(KEY_UI_POS, null);
        let side, top;

        if (savedPos && savedPos[myRole]) {
            // Use role-specific saved position
            const rolePos = savedPos[myRole];
            side = rolePos.side || ((myRole === 'target') ? 'left' : 'right');
            top = rolePos.top || '85px';
        } else if (savedPos && savedPos.side) {
            // Fallback to legacy single position format
            side = savedPos.side;
            top = savedPos.top || '85px';
        } else {
            // Default position based on role
            side = (myRole === 'target') ? 'left' : 'right';
            top = '85px';
        }

        ui.container.classList.remove('stm-side-left', 'stm-side-right');
        ui.container.classList.add(`stm-side-${side}`);

        // Apply positioning based on side
        if (side === 'left') {
            ui.container.style.left = '0';
            ui.container.style.right = 'auto';
            ui.container.style.flexDirection = 'row-reverse';
        } else {
            ui.container.style.right = '0';
            ui.container.style.left = 'auto';
            ui.container.style.flexDirection = 'row';
        }

        // Apply vertical position
        ui.container.style.top = top;
    }

    function updateUI() {
        if (window !== window.top) return; // Only show UI in the top-level window
        if (!document.body) { window.addEventListener('DOMContentLoaded', updateUI, { once: true }); return; }

        // Hide UI in fullscreen mode
        const isFullscreen = !!document.fullscreenElement;

        if (!ui) {
            ui = {
                container: document.createElement('div'),
                dot: document.createElement('div'),
                menu: document.createElement('div'),
                volume: document.createElement('div'),
                grip: document.createElement('div')
            };
            ui.container.id = 'stm-ui-container';
            ui.container.classList.add('stm-collapsed');
            ui.dot.id = 'stm-status-dot';
            ui.menu.id = 'stm-menu';
            ui.volume.id = 'stm-volume-btn';
            ui.grip.id = 'stm-grip';
            ui.grip.innerHTML = '<div class="stm-grip-dot"></div><div class="stm-grip-dot"></div><div class="stm-grip-dot"></div>';

            ui.container.append(ui.grip, ui.volume, ui.dot, ui.menu);
            document.body.appendChild(ui.container);

            // Native Drag & Click (Role Assignment)
            ui.dot.setAttribute('draggable', 'true');
            ui.dot.addEventListener('click', (e) => { if (e.button === 0) toggleMenu(); });
            ui.dot.addEventListener('dragstart', handleRoleDragStart);

            // UI Movement (Custom Dragging)
            ui.grip.addEventListener('mousedown', handleGripMouseDown);

            // Hover Expansion
            ui.container.addEventListener('mouseenter', () => ui.container.classList.remove('stm-collapsed'));
            ui.container.addEventListener('mouseleave', (e) => {
                if (!ui.menu.style.display || ui.menu.style.display === 'none') {
                    ui.container.classList.add('stm-collapsed');
                }
                handleContainerMouseLeave(e);
            });

            // Link Drop Support
            ui.dot.addEventListener('dragover', handleLinkDragOver);
            ui.dot.addEventListener('dragleave', handleLinkDragLeave);
            ui.dot.addEventListener('drop', handleLinkDrop);

            ui.menu.addEventListener('click', handleMenuClick);
            ui.volume.addEventListener('click', () => {
                if (!muteLazyloadActivated) {
                    activateMuteLazyload();
                } else {
                    mediaManager.toggleMute();
                }
            });
            window.addEventListener('click', (e) => {
                if (ui && ui.menu.style.display === 'block' && !ui.container.contains(e.target)) {
                    toggleMenu();
                    ui.container.classList.add('stm-collapsed');
                }
            }, true);

            // Global Drop Support (for pairing)
            window.addEventListener('dragover', handleGlobalDragOver, true);
            window.addEventListener('dragleave', handleGlobalDragLeave, true);
            window.addEventListener('drop', handleGlobalDrop, true);
        }

        const hasMedia = mediaManager && mediaManager.hasMedia;
        // The UI container is ONLY shown if the tab has an active role (Source or Target) AND not in fullscreen.
        ui.container.style.display = (myRole === 'idle' || isFullscreen) ? 'none' : 'flex';

        // Apply saved position or update if needed
        if (myRole !== 'idle' && !isFullscreen) {
            applySavedPosition();
        } else if (myRole === 'idle') {
            // Hide container when idle
            if (ui.container) {
                ui.container.style.display = 'none';
            }
        }

        if (myRole === 'source') {
            ui.dot.textContent = 'S';
            ui.dot.style.display = 'flex';
        } else if (myRole === 'target') {
            ui.dot.textContent = 'T';
            ui.dot.style.display = 'flex';
        } else {
            // This block is mostly for safety if the container display logic changes.
            ui.dot.style.display = 'none';
            ui.dot.textContent = '';
        }

        // Update Volume Button
        // Only show the volume button if there is active media, but maintain the mute state
        // in the background (tab-based mute).
        updateVolumeButton(hasMedia);

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
            ui.menu.innerHTML = `
                <div role="menu" aria-label="Split View Menu">
                    ${contextMenuItems.map(item =>
                `<button role="menuitem" tabindex="0" data-action="${item.action}" class="stm-menu-item">
                            ${item.text}
                        </button>`
            ).join('')}
                </div>
            `;
        }
    }

    function toggleMenu() {
        if (ui && ui.menu) {
            const isVisible = ui.menu.style.display === 'block';
            ui.menu.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                ui.container.classList.remove('stm-collapsed');
            }
        }
    }
    function hideMenu() {
        if (ui && ui.menu) {
            ui.menu.style.display = 'none';
            ui.container.classList.add('stm-collapsed');
        }
    }
    function handleContainerMouseLeave(e) {
        if (!ui || !ui.container) return;
        const toEl = e.relatedTarget;
        if (!toEl || !ui.container.contains(toEl)) {
            if (ui.menu.style.display !== 'block') {
                hideMenu();
            }
        }
    }
    function pulseDot() { if (ui && ui.dot) { ui.dot.classList.add('stm-pulse-animate'); ui.dot.addEventListener('animationend', () => ui.dot.classList.remove('stm-pulse-animate'), { once: true }); } }

    // --- UI Movement Logic ---
    let isDraggingUI = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let isHorizontalSwipe = false;
    const SWIPE_THRESHOLD = 50; // Minimum horizontal movement to trigger swipe

    function handleGripMouseDown(e) {
        if (e.button !== 0) return;
        isDraggingUI = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialLeft = ui.container.offsetLeft;
        initialTop = ui.container.offsetTop;
        isHorizontalSwipe = false;

        ui.grip.style.cursor = 'grabbing';
        document.addEventListener('mousemove', handleGripMouseMove);
        document.addEventListener('mouseup', handleGripMouseUp);
        e.preventDefault();
    }

    function handleGripMouseMove(e) {
        if (!isDraggingUI) return;
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        // Check if this is a horizontal swipe gesture
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
            isHorizontalSwipe = true;
            // Don't move the container during swipe detection
            return;
        }

        // Regular vertical movement
        let newTop = initialTop + deltaY;

        // Boundary checks
        const containerHeight = ui.container.offsetHeight;
        const windowHeight = window.innerHeight;
        newTop = Math.max(10, Math.min(newTop, windowHeight - containerHeight - 10));

        ui.container.style.top = `${newTop}px`;
    }

    function handleGripMouseUp(e) {
        if (!isDraggingUI) return;
        isDraggingUI = false;
        ui.grip.style.cursor = 'grab';
        document.removeEventListener('mousemove', handleGripMouseMove);
        document.removeEventListener('mouseup', handleGripMouseUp);

        // Handle horizontal swipe for side snapping
        if (isHorizontalSwipe) {
            const deltaX = e.clientX - dragStartX;
            snapToSide(deltaX > 0 ? 'right' : 'left');
        }

        // Save position for current role
        const currentPos = GM_getValue(KEY_UI_POS, {});
        currentPos[myRole] = {
            top: ui.container.style.top,
            left: ui.container.style.left,
            right: ui.container.style.right,
            side: ui.container.classList.contains('stm-side-left') ? 'left' : 'right'
        };
        GM_setValue(KEY_UI_POS, currentPos);
    }

    function snapToSide(side) {
        if (!ui || !ui.container) return;

        const currentTop = ui.container.offsetTop;

        // Remove existing side classes
        ui.container.classList.remove('stm-side-left', 'stm-side-right');

        // Apply new side class and positioning
        if (side === 'left') {
            ui.container.classList.add('stm-side-left');
            ui.container.style.left = '0';
            ui.container.style.right = 'auto';
            ui.container.style.flexDirection = 'row-reverse';
        } else {
            ui.container.classList.add('stm-side-right');
            ui.container.style.right = '0';
            ui.container.style.left = 'auto';
            ui.container.style.flexDirection = 'row';
        }

        // Pulse to indicate snap
        pulseDot();

        // Save new position with role-specific structure
        const currentPos = GM_getValue(KEY_UI_POS, {});
        currentPos[myRole] = {
            top: `${currentTop}px`,
            left: side === 'left' ? '0' : 'auto',
            right: side === 'right' ? '0' : 'auto',
            side: side
        };
        GM_setValue(KEY_UI_POS, currentPos);
    }

    /**
     * Extracts a valid URL from DataTransfer object with priority and filtering.
     * This ensures links from images, sidebars, and various browsers are captured.
     */
    function extractUrlFromDataTransfer(dt) {
        // 1. Ignore if it's an internal role-request drag
        if (dt.types.includes('application/stm-role-request')) return null;
        const plainText = dt.getData('text/plain');
        if (plainText && plainText.trim().startsWith('STM_ROLE:')) return null;

        // 2. Try text/uri-list (Standard for links)
        const uriList = dt.getData('text/uri-list');
        if (uriList) {
            const lines = uriList.split(/[\r\n]+/);
            for (let line of lines) {
                line = line.trim();
                if (line && !line.startsWith('#')) return line;
            }
        }

        // 3. Try "URL" (IE/Legacy)
        const urlProp = dt.getData('URL');
        if (urlProp) return urlProp.trim();

        // 4. Try application/x-moz-url (Firefox)
        const mozUrl = dt.getData('text/x-moz-url');
        if (mozUrl) {
            const url = mozUrl.split(/[\r\n]+/)[0].trim();
            if (url) return url;
        }

        // 5. Try text/html (Extract <a> href or <img> src)
        const html = dt.getData('text/html');
        if (html) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const link = doc.querySelector('a[href]');
                if (link && link.href) return link.href;
                const img = doc.querySelector('img[src]');
                if (img && img.src) return img.src;
            } catch (ignore) { }
        }

        // 6. Fallback to text/plain regex match
        if (plainText) {
            const match = plainText.match(/https?:\/\/[^\s"']+/);
            if (match) return match[0];
            const trimmed = plainText.trim();
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        }

        return null;
    }

    // --- Helpers ---

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

    function updateVolumeButton(hasMedia) {
        if (!ui || !ui.volume) return;

        // Always show volume button when there is active media and tab has a role
        // Show different icons and styles for sleep vs active modes
        if (myRole !== 'idle' && hasMedia) {
            ui.volume.style.display = 'flex';

            if (!muteLazyloadActivated) {
                // Sleep mode - show activation icon with visual indicator
                ui.volume.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
                ui.volume.style.background = 'rgba(255, 193, 7, 0.2)'; // Amber background for sleep mode
                ui.volume.title = 'Click to activate mute control (currently in sleep mode)';
            } else {
                // Active mode - show normal volume icons
                ui.volume.style.background = 'rgba(255, 255, 255, 0.1)'; // Normal background
                const volIcon = myIsMuted
                    ? `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
                    : `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
                ui.volume.innerHTML = volIcon;
                ui.volume.title = myIsMuted ? 'Click to unmute' : 'Click to mute';
            }
        } else {
            ui.volume.style.display = 'none';
        }
    }

    // --- Media Management (Volume/Mute) ---
    const mediaManager = {
        hasMedia: false,
        elements: new Set(),
        iframes: new Set(),
        initialized: false,

        // Known media iframe patterns and their postMessage configurations
        iframeConfigs: {
            youtube: {
                patterns: [/youtube\.com\/embed/, /youtube-nocookie\.com\/embed/],
                getMuteCommand: (muted) => JSON.stringify({
                    event: 'command',
                    func: muted ? 'mute' : 'unMute',
                    args: []
                }),
                // YouTube requires enablejsapi=1 to receive commands
                requiresApiParam: 'enablejsapi=1',
                targetOrigin: 'https://www.youtube.com'
            },
            vimeo: {
                patterns: [/player\.vimeo\.com\/video/],
                getMuteCommand: (muted) => JSON.stringify({
                    method: 'setVolume',
                    value: muted ? 0 : 1
                }),
                targetOrigin: 'https://player.vimeo.com'
            },
            dailymotion: {
                patterns: [/dailymotion\.com\/embed/],
                getMuteCommand: (muted) => JSON.stringify({
                    command: 'muted',
                    parameters: [muted]
                }),
                targetOrigin: 'https://www.dailymotion.com'
            },
            twitch: {
                patterns: [/player\.twitch\.tv/, /clips\.twitch\.tv/],
                getMuteCommand: (muted) => JSON.stringify({
                    eventName: 'setMuted',
                    params: { muted: muted }
                }),
                targetOrigin: 'https://player.twitch.tv'
            },
            spotify: {
                patterns: [/open\.spotify\.com\/embed/],
                // Spotify embed doesn't have a postMessage API for muting
                useFallback: true,
                targetOrigin: 'https://open.spotify.com'
            },
            soundcloud: {
                patterns: [/w\.soundcloud\.com\/player/],
                getMuteCommand: (muted) => JSON.stringify({
                    method: muted ? 'setVolume' : 'setVolume',
                    value: muted ? 0 : 100
                }),
                targetOrigin: 'https://w.soundcloud.com'
            },
            facebook: {
                patterns: [/facebook\.com\/plugins\/video/],
                useFallback: true,
                targetOrigin: 'https://www.facebook.com'
            },
            twitter: {
                patterns: [/platform\.twitter\.com\/embed/, /twitter\.com\/i\/videos/],
                useFallback: true,
                targetOrigin: 'https://platform.twitter.com'
            }
        },

        init() {
            if (this.initialized) return;
            this.initialized = true;
            this.scan();
            this.scanIframes();
            this.observe();
            // Periodically check for playing state and new iframes
            setInterval(() => {
                this.updateState();
                this.scanIframes();
            }, 1000);
        },

        scan() {
            document.querySelectorAll('video, audio').forEach(el => this.track(el));
        },

        scanIframes() {
            document.querySelectorAll('iframe').forEach(iframe => this.trackIframe(iframe));
        },

        track(el) {
            if (this.elements.has(el)) return;
            this.elements.add(el);

            const update = () => this.updateState();
            el.addEventListener('play', update);
            el.addEventListener('pause', update);
            el.addEventListener('volumechange', update);

            // Sync with current mute state only if lazyload is activated
            if (muteLazyloadActivated) {
                el.muted = myIsMuted;
            }
        },

        trackIframe(iframe) {
            if (this.iframes.has(iframe)) return;

            const src = iframe.src || '';
            if (!src) return;

            // Check if this iframe matches any known media platform
            let matchedConfig = null;
            let configName = null;

            for (const [name, config] of Object.entries(this.iframeConfigs)) {
                for (const pattern of config.patterns) {
                    if (pattern.test(src)) {
                        matchedConfig = config;
                        configName = name;
                        break;
                    }
                }
                if (matchedConfig) break;
            }

            if (matchedConfig) {
                this.iframes.add(iframe);
                iframe._stmConfig = matchedConfig;
                iframe._stmConfigName = configName;

                // Ensure YouTube iframes have enablejsapi=1
                if (configName === 'youtube' && matchedConfig.requiresApiParam) {
                    this.ensureYouTubeApiEnabled(iframe);
                }

                // Sync with current mute state only if lazyload is activated
                if (muteLazyloadActivated) {
                    this.muteIframe(iframe, myIsMuted);
                }

                // Consider iframe as potential media source
                this.hasMedia = true;
                updateVolumeButton(true);
            }
        },

        ensureYouTubeApiEnabled(iframe) {
            const src = iframe.src || '';
            if (!src.includes('enablejsapi=1')) {
                const separator = src.includes('?') ? '&' : '?';
                // Only modify if we can (same-origin or CORS allows)
                try {
                    iframe.src = src + separator + 'enablejsapi=1';
                } catch (e) {
                    console.log('[STM] Could not enable YouTube JS API:', e);
                }
            }
        },

        muteIframe(iframe, muted) {
            const config = iframe._stmConfig;
            if (!config) return;

            if (config.useFallback) {
                // Fallback: Try to access iframe content if same-origin
                this.tryDirectIframeMute(iframe, muted);
                return;
            }

            if (config.getMuteCommand) {
                try {
                    const message = config.getMuteCommand(muted);
                    iframe.contentWindow?.postMessage(message, config.targetOrigin);

                    // Also try with wildcard for cross-origin cases
                    iframe.contentWindow?.postMessage(message, '*');
                } catch (e) {
                    console.log('[STM] postMessage failed for iframe:', e);
                }
            }
        },

        tryDirectIframeMute(iframe, muted) {
            try {
                // This only works for same-origin iframes
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    iframeDoc.querySelectorAll('video, audio').forEach(el => {
                        el.muted = muted;
                    });
                }
            } catch (e) {
                // Cross-origin iframe, can't access directly
            }
        },

        muteAllIframes(muted) {
            this.iframes.forEach(iframe => {
                this.muteIframe(iframe, muted);
            });
        },

        observe() {
            const observer = new MutationObserver(mutations => {
                for (const m of mutations) {
                    for (const node of m.addedNodes) {
                        if (node.nodeName === 'VIDEO' || node.nodeName === 'AUDIO') {
                            this.track(node);
                        } else if (node.nodeName === 'IFRAME') {
                            this.trackIframe(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('video, audio').forEach(el => this.track(el));
                            node.querySelectorAll('iframe').forEach(iframe => this.trackIframe(iframe));
                        }
                    }
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        },

        updateState() {
            // Enforce mute state on all tracked elements if the tab has a role AND lazyload is activated
            // This prevents websites from programmatically changing their mute state.
            if (myRole !== 'idle' && muteLazyloadActivated) {
                this.elements.forEach(el => {
                    if (el.muted !== myIsMuted) el.muted = myIsMuted;
                });
                // Re-send mute commands to iframes periodically to ensure they stay in sync
                this.muteAllIframes(myIsMuted);
            }

            let active = false;

            // Check native video/audio elements
            for (const el of this.elements) {
                // Consider it a "sound source" if it's playing and has volume
                if (!el.paused && el.volume > 0 && !el.ended && el.readyState >= 2) {
                    active = true;
                    break;
                }
            }

            // If we have tracked iframes, consider having media
            if (!active && this.iframes.size > 0) {
                active = true;
            }

            if (active !== this.hasMedia) {
                this.hasMedia = active;
                updateVolumeButton(active);
            }
        },

        toggleMute() {
            // Auto-activate lazyload on first mute toggle
            if (!muteLazyloadActivated) {
                activateMuteLazyload();
            }

            const newMutedState = !myIsMuted;
            myIsMuted = newMutedState;
            saveTabMuteState(); // Save tab-specific mute state

            // Apply to all iframes immediately
            this.muteAllIframes(newMutedState);

            // Apply mute state to all tracked media elements
            if (this.elements) {
                this.elements.forEach(el => {
                    el.muted = newMutedState;
                });
            }

            // Save state and update UI
            saveState(myRole, myId, myLastTs, mySourceTabId, newMutedState);
        }
    };
    // Broadcast role notification to all tabs in the same connection
    function broadcastRoleNotification(groupId, newRole, tabId) {
        const notification = {
            groupId: groupId,
            newRole: newRole,
            tabId: tabId,
            timestamp: Date.now(),
            type: 'role_joined'
        };

        // Set notification for the group ID so all tabs can see it
        GM_setValue(getRoleNotificationKey(groupId), notification);

        // Also set a general notification key for broader visibility
        GM_setValue(`${GM_PREFIX}latest_role_notification`, notification);
    }

    function setRole(role, id = null, joinExisting = false) {
        if (role === 'source') {
            let groupId;
            if (joinExisting && id) {
                // Join existing group
                groupId = id;
                // Broadcast notification when joining existing group
                broadcastRoleNotification(groupId, 'source', myInstanceId);
            } else {
                // Create new group or use provided ID
                groupId = id || generateId();
            }

            const sourceTabId = generateId(); // Unique ID for this source tab
            saveState('source', groupId, 0, sourceTabId);
            addSourceToGroup(groupId, sourceTabId);
            GM_setValue(KEY_LATEST_SOURCE, { sourceId: groupId, timestamp: Date.now() });

            // Broadcast notification for new source if not joining existing
            if (!joinExisting) {
                broadcastRoleNotification(groupId, 'source', myInstanceId);
            }
        } else if (role === 'target') {
            if (!id) { Notify.error('Cannot become Target without a Source ID.'); return; }
            saveState('target', id);
            // Broadcast notification when target joins
            broadcastRoleNotification(id, 'target', myInstanceId);
        }
    }
    // Disconnects just this tab, leaving the other tab in its role.
    function revokeRole() {
        if (myRole === 'source' && myId && mySourceTabId) {
            removeSourceFromGroup(myId, mySourceTabId);
        }

        // Broadcast disconnection notification
        if (myRole !== 'idle' && myId) {
            const notification = {
                groupId: myId,
                disconnectedRole: myRole,
                tabId: myInstanceId,
                timestamp: Date.now(),
                type: 'role_disconnected'
            };
            GM_setValue(getRoleNotificationKey(myId), notification);
            GM_setValue(`${GM_PREFIX}latest_role_notification`, notification);
        }

        // Clean up tab-specific storage when revoking role
        if (myRole !== 'idle' && myId) {
            GM_deleteValue(getMuteStateKey(myId, myRole));
            GM_deleteValue(getLazyloadKey(myId, myRole));
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
        }

        // Broadcast disconnection notification
        if (myRole !== 'idle' && myId) {
            const notification = {
                groupId: myId,
                disconnectedRole: myRole,
                tabId: myInstanceId,
                timestamp: Date.now(),
                type: 'role_disconnected'
            };
            GM_setValue(getRoleNotificationKey(myId), notification);
            GM_setValue(`${GM_PREFIX}latest_role_notification`, notification);
        }

        // Clean up tab-specific storage when disconnecting
        if (myRole !== 'idle' && myId) {
            GM_deleteValue(getMuteStateKey(myId, myRole));
            GM_deleteValue(getLazyloadKey(myId, myRole));
        }
        saveState('idle', null, 0, null);
    }

    function handleLinkDragOver(e) {
        // Allow drop if there's any format that might contain a URL
        const types = e.dataTransfer.types;
        const hasUrlCandidate = types.includes('text/uri-list') ||
            types.includes('text/plain') ||
            types.includes('text/html') ||
            types.includes('URL') ||
            types.includes('text/x-moz-url');

        if (hasUrlCandidate && !types.includes('application/stm-role-request')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (ui && ui.dot) ui.dot.classList.add('stm-drag-over');
        }
    }

    function handleLinkDragLeave(e) {
        if (ui && ui.dot) ui.dot.classList.remove('stm-drag-over');
    }

    function handleLinkDrop(e) {
        if (ui && ui.dot) ui.dot.classList.remove('stm-drag-over');

        const url = extractUrlFromDataTransfer(e.dataTransfer);
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            // ALWAYS navigate the current tab, regardless of role (S or T).
            // This maintains the existing user expectation of local navigation.
            e.preventDefault();
            e.stopPropagation();
            window.location.href = url;
        }
    }

    // --- Role Drag & Drop (Native API) ---
    function handleRoleDragStart(e) {
        if (myRole === 'idle') {
            // If idle, we don't initiate a role request, but we might still allow native drag
            return;
        }
        const payload = {
            sourceId: myId,
            role: myRole,
            instanceId: myInstanceId,
            timestamp: Date.now()
        };
        e.dataTransfer.setData('application/stm-role-request', JSON.stringify(payload));
        // Fallback for cross-browser/process compatibility
        e.dataTransfer.setData('text/plain', `STM_ROLE:${JSON.stringify(payload)}`);
        e.dataTransfer.effectAllowed = 'copyMove';
    }

    function handleGlobalDragOver(e) {
        if (e.dataTransfer.types.includes('application/stm-role-request') ||
            (e.dataTransfer.types.includes('text/plain') && e.dataTransfer.getData('text/plain').startsWith('STM_ROLE:'))) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (ui && ui.dot) ui.dot.classList.add('stm-global-drag-over');
        }
    }

    function handleGlobalDragLeave(e) {
        if (ui && ui.dot) ui.dot.classList.remove('stm-global-drag-over');
    }

    function handleGlobalDrop(e) {
        if (ui && ui.dot) ui.dot.classList.remove('stm-global-drag-over');
        let dataStr = e.dataTransfer.getData('application/stm-role-request');
        if (!dataStr) {
            const plain = e.dataTransfer.getData('text/plain');
            if (plain && plain.startsWith('STM_ROLE:')) {
                dataStr = plain.slice(9);
            }
        }

        if (dataStr) {
            try {
                const data = JSON.parse(dataStr);
                if (data.instanceId === myInstanceId) return; // Don't drop on self

                e.preventDefault();
                if (data.role === 'source') {
                    setRole('target', data.sourceId);
                } else if (data.role === 'target') {
                    setRole('source', data.sourceId, true);
                }
            } catch (err) { /* ignore */ }
        }
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

    function attachRoleSpecificListeners() {
        activeListeners.forEach(listenerId => GM_removeValueChangeListener(listenerId));
        activeListeners = [];
        if (myRole === 'idle' || !myId) return;
        const disconnectListener = GM_addValueChangeListener(getDisconnectKey(myId), (k, o, n, r) => { if (r) saveState('idle', null, 0, null); });
        activeListeners.push(disconnectListener);

        const globalResetListener = GM_addValueChangeListener(KEY_GLOBAL_RESET, (k, o, n, r) => { if (r) saveState('idle', null, 0, null); });
        activeListeners.push(globalResetListener);

        // Listen for role notifications in the same connection
        if (myId) {
            const roleNotificationListener = GM_addValueChangeListener(getRoleNotificationKey(myId), (k, o, n, r) => {
                if (r && n && n.tabId !== myInstanceId) {
                    const notifications = config.notifications || { newSourceRole: true, newTargetRole: true, revokeRole: true };

                    if (n.type === 'role_joined') {
                        if (n.newRole === 'source' && notifications.newSourceRole) {
                            Notify.info('New Source tab joined', 'Role Update');
                        } else if (n.newRole === 'target' && notifications.newTargetRole) {
                            Notify.info('New Target tab joined', 'Role Update');
                        }
                    } else if (n.type === 'role_disconnected' && notifications.revokeRole) {
                        const roleText = n.disconnectedRole === 'source' ? 'Source' : 'Target';
                        Notify.warning(`${roleText} tab revoked its role`, 'Role Update');
                    }
                }
            });
            activeListeners.push(roleNotificationListener);

            // Also listen for general role notifications
            const generalRoleListener = GM_addValueChangeListener(`${GM_PREFIX}latest_role_notification`, (k, o, n, r) => {
                if (r && n && n.tabId !== myInstanceId && n.groupId === myId) {
                    const notifications = config.notifications || { newSourceRole: true, newTargetRole: true, revokeRole: true };

                    if (n.type === 'role_joined') {
                        if (n.newRole === 'source' && notifications.newSourceRole) {
                            Notify.info('New Source tab joined', 'Role Update');
                        } else if (n.newRole === 'target' && notifications.newTargetRole) {
                            Notify.info('New Target tab joined', 'Role Update');
                        }
                    } else if (n.type === 'role_disconnected' && notifications.revokeRole) {
                        const roleText = n.disconnectedRole === 'source' ? 'Source' : 'Target';
                        Notify.warning(`${roleText} tab revoked its role`, 'Role Update');
                    }
                }
            });
            activeListeners.push(generalRoleListener);
        }
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
        loadMuteLazyloadState(); // Load persistent lazyload state
        injectStyles();
        primeStateFromWindowName();

        // Listen for configuration changes to update notification settings
        GM_addValueChangeListener(KEY_CONFIG, (key, oldValue, newValue, remote) => {
            if (remote) {
                config = newValue || DEFAULT_CONFIG;
                // Reattach listeners with new configuration
                if (myRole !== 'idle' && myId) {
                    attachRoleSpecificListeners();
                }
            }
        });
        // Attach link interception immediately so early clicks are captured even before state restore completes.
        window.addEventListener('click', handleLinkClick, true);

        // Restore state, then arm listeners to avoid transient "idle" pairing.
        loadState().then(s => {
            // Merge with any primed state to avoid overwriting an existing Source/Target.
            const mergedRole = (myRole && myRole !== 'idle') ? myRole : s.role;
            const mergedId = myId || s.id;
            const mergedTs = myLastTs || s.lastTs;
            const mergedSourceTabId = mySourceTabId || s.sourceTabId;

            // For mute state, load from tab-specific storage
            loadTabMuteState();
            loadMuteLazyloadState();

            saveState(mergedRole, mergedId, mergedTs, mergedSourceTabId, myIsMuted);
            stateLoaded = true;

            // Initialize media manager after state is loaded
            mediaManager.init();

            // --- Menu Configuration ---
            const menuCommands = [
                { name: "Create Source", func: () => setRole('source') },
                { name: "Reset Roles", func: resetAllRoles },
                { name: "Preference", func: showConfigPanel }
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
                    else Notify.warning('No Source tab found.');
                }
            }, true);

            // Listen for fullscreen changes to hide/show UI
            document.addEventListener('fullscreenchange', () => updateUI());
        });
    }

    initialize();

    console.log('Enhanced Split Tab: Script initialized');

})();
