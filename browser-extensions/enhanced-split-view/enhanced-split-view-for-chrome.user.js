// ==UserScript==
// @name         Enhanced Split View for Chrome
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  This scripts adds extra control over Chrome's native split view function, which allows to pin a source tab to open new content on the side.
// @author       https://github.com/neoxush/VibeCoding/tree/master/browser-extensions/enhanced-split-view
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @match        *://*/*
// @noframes
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_addStyle
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_listValues
// @grant        GM_deleteValue
// Notification system replaces GM_notification
// ==/UserScript==

(function () {
    'use strict';

    // --- Debug logging gate ---
    const DEBUG = false;
    const log = DEBUG ? console.log.bind(console, '[ESV]') : () => { };
    const warn = DEBUG ? console.warn.bind(console, '[ESV]') : () => { };

    // HTML-escape helper for safe string interpolation
    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // --- Modern Notification System ---
    const ttPolicy = (function () {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                return window.trustedTypes.createPolicy('esv-policy-v1', {
                    createHTML: (s) => s,
                    createScript: (s) => s,
                    createScriptURL: (s) => s
                });
            } catch (e) {
                warn('Trusted Types policy creation failed', e);
            }
        }
        return {
            createHTML: (s) => s,
            createScript: (s) => s,
            createScriptURL: (s) => s
        };
    })();

    const Notify = {
        _active: [],
        _queue: [],
        MAX_VISIBLE: 3,

        show(type, message, title = '') {
            if (window !== window.top) return;
            if (this._active.length >= this.MAX_VISIBLE) {
                this._queue.push({ type, message, title });
                return null;
            }
            return this._render(type, message, title);
        },

        _render(type, message, title) {
            const notification = document.createElement('div');
            notification.className = `esv-notification esv-theme-auto ${type}`;
            notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
            notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

            const icon = {
                success: '\u2713',
                error: '\u2715',
                info: 'i',
                warning: '!'
            }[type] || 'i';

            notification.innerHTML = ttPolicy.createHTML(`
                <span class="esv-notification__icon" aria-hidden="true">${icon}</span>
                <div class="esv-notification__body">
                    ${title ? `<div class="esv-notification__title">${escapeHtml(title)}</div>` : ''}
                    <div class="esv-notification__msg">${escapeHtml(message)}</div>
                </div>
                <span class="esv-notification__close" title="Dismiss" aria-label="Dismiss">&times;</span>
            `);

            document.body.appendChild(notification);
            this._active.push(notification);
            this._restack();

            void notification.offsetWidth;
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';

            const removeNotification = () => {
                notification.style.transform = 'translateX(120%)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.remove();
                    this._active = this._active.filter(n => n !== notification);
                    this._restack();
                    if (this._queue.length > 0 && this._active.length < this.MAX_VISIBLE) {
                        const next = this._queue.shift();
                        this._render(next.type, next.message, next.title);
                    }
                }, 320);
            };
            let timeout = setTimeout(removeNotification, 4000);

            const closeBtn = notification.querySelector('.esv-notification__close');
            closeBtn.onclick = () => {
                clearTimeout(timeout);
                removeNotification();
            };

            // Pause on hover, resume on leave
            notification.addEventListener('mouseenter', () => clearTimeout(timeout));
            notification.addEventListener('mouseleave', () => {
                timeout = setTimeout(removeNotification, 1500);
            });

            return notification;
        },

        _restack() {
            let top = 20;
            this._active.forEach(n => {
                n.style.top = `${top}px`;
                top += n.offsetHeight + 10;
            });
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
    const KEY_KNOWN_SOURCES = `${GM_PREFIX}known_sources`; // v1.1 multi-source registry
    const KEY_CONFIG = `${GM_PREFIX}config`;
    const KEY_GLOBAL_RESET = `${GM_PREFIX}global_reset`;
    const KEY_UI_POS = `${GM_PREFIX}ui_pos`;
    const KEY_MUTE_LAZYLOAD = `${GM_PREFIX}mute_lazyload_activated`;
    const getMuteStateKey = (id, role) => `${GM_PREFIX}mute_${role}_${id}`;
    const getLazyloadKey = (id, role) => `${GM_PREFIX}lazyload_${role}_${id}`;
    const getTargetUrlKey = (id) => `${GM_PREFIX}url_${id}`;
    const getTargetTitleKey = (id) => `${GM_PREFIX}urltitle_${id}`;
    const getTimestampKey = (id) => `${GM_PREFIX}ts_${id}`;
    const getDisconnectKey = (id) => `${GM_PREFIX}disconnect_${id}`;
    const getSourceListKey = (id) => `${GM_PREFIX}sources_${id}`;
    const getRoleNotificationKey = (id) => `${GM_PREFIX}role_notification_${id}`;
    const getPlaylistKey = (id) => `${GM_PREFIX}playlist_${id}`;
    const getPlaylistIndexKey = (id) => `${GM_PREFIX}playlist_index_${id}`;

    // Default configuration
    const DEFAULT_CONFIG = {
        sourceKey: { button: 1, ctrl: true, alt: false, shift: false },
        targetKey: { button: 1, ctrl: false, alt: true, shift: false },
        notifications: {
            newSourceRole: true,
            newTargetRole: true,
            revokeRole: true
        },
        shortcuts: {
            mute: true,
            playlistNav: true,
            revokeRole: true,
            esc: true
        },
        theme: 'auto',
        playlistMaxItems: 200
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
    let collapseTimeout = null;

    // --- BroadcastChannel for low-latency cross-tab signaling ---
    let bc = null;
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            bc = new BroadcastChannel('esv-v1');
        }
    } catch (e) { /* ignore */ }

    function bcPost(msg) {
        if (!bc) return;
        try { bc.postMessage(msg); } catch (e) { /* ignore */ }
    }

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
        if (window !== window.top) return;
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
        const stored = GM_getValue(KEY_CONFIG, {}) || {};
        config = {
            sourceKey: Object.assign({}, DEFAULT_CONFIG.sourceKey, stored.sourceKey || {}),
            targetKey: Object.assign({}, DEFAULT_CONFIG.targetKey, stored.targetKey || {}),
            notifications: Object.assign({}, DEFAULT_CONFIG.notifications, stored.notifications || {}),
            shortcuts: Object.assign({}, DEFAULT_CONFIG.shortcuts, stored.shortcuts || {}),
            theme: stored.theme || DEFAULT_CONFIG.theme,
            playlistMaxItems: stored.playlistMaxItems || DEFAULT_CONFIG.playlistMaxItems
        };
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
        if (typeof mediaManager !== 'undefined' && mediaManager && mediaManager.initialized) mediaManager.applyRoleState();
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
            /* =====================================================
             * Enhanced Split View — Design Tokens
             * Single source of truth so every surface looks unified
             * ===================================================== */
            :root {
                --esv-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
                --esv-font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
                --esv-fs-xs: 11px;
                --esv-fs-sm: 12px;
                --esv-fs-md: 13px;
                --esv-fs-lg: 14px;
                --esv-fw-medium: 500;
                --esv-fw-semibold: 600;
                --esv-fw-bold: 700;
                --esv-surface-1: rgba(22, 22, 26, 0.78);
                --esv-surface-1-collapsed: rgba(22, 22, 26, 0.45);
                --esv-surface-2: rgba(28, 28, 33, 0.92);
                --esv-surface-3: rgba(255, 255, 255, 0.06);
                --esv-surface-3-hover: rgba(255, 255, 255, 0.10);
                --esv-surface-4: rgba(255, 255, 255, 0.14);
                --esv-overlay: rgba(0, 0, 0, 0.55);
                --esv-border-1: 1px solid rgba(255, 255, 255, 0.10);
                --esv-border-soft: 1px solid rgba(255, 255, 255, 0.05);
                --esv-fg-1: #f5f5f7;
                --esv-fg-2: #c8c8cd;
                --esv-fg-3: #8a8a92;
                --esv-accent-source: #22c55e;
                --esv-accent-source-grad: linear-gradient(135deg, #22c55e, #15803d);
                --esv-accent-target: #3b82f6;
                --esv-accent-target-grad: linear-gradient(135deg, #3b82f6, #1d4ed8);
                --esv-accent-playlist: #a855f7;
                --esv-accent-playlist-grad: linear-gradient(135deg, #a855f7, #7e22ce);
                --esv-accent-success: #22c55e;
                --esv-accent-info:    #3b82f6;
                --esv-accent-warn:    #f59e0b;
                --esv-accent-error:   #ef4444;
                --esv-radius-sm: 8px;
                --esv-radius-md: 12px;
                --esv-radius-lg: 16px;
                --esv-radius-pill: 999px;
                --esv-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.18);
                --esv-shadow-md: 0 8px 24px rgba(0, 0, 0, 0.32);
                --esv-shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.45);
                --esv-shadow-inner: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
                --esv-ease: cubic-bezier(0.4, 0, 0.2, 1);
                --esv-dur-fast: 150ms;
                --esv-dur-base: 220ms;
                --esv-dur-slow: 320ms;
                --esv-z-base: 2147483600;
                --esv-z-overlay: 2147483646;
                --esv-z-modal: 2147483647;
                --esv-z-toast: 2147483647;
            }

            @keyframes esv-pulse {
                0%   { transform: scale(1); }
                50%  { transform: scale(1.18); }
                100% { transform: scale(1); }
            }
            @keyframes esv-fade-up {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .stm-pulse-animate { animation: esv-pulse 480ms var(--esv-ease); }

            /* =====================================================
             * Floating control: container + dot + grip + volume + mini
             * ===================================================== */
            #stm-ui-container {
                position: fixed;
                z-index: var(--esv-z-base);
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0;
                background: var(--esv-surface-1);
                backdrop-filter: blur(14px) saturate(140%);
                -webkit-backdrop-filter: blur(14px) saturate(140%);
                border: var(--esv-border-1);
                border-radius: var(--esv-radius-pill);
                padding: 4px;
                box-shadow: var(--esv-shadow-md), var(--esv-shadow-inner);
                font-family: var(--esv-font);
                color: var(--esv-fg-1);
                transition: gap var(--esv-dur-base) var(--esv-ease),
                            padding var(--esv-dur-base) var(--esv-ease),
                            background var(--esv-dur-base) var(--esv-ease),
                            border-color var(--esv-dur-base) var(--esv-ease),
                            box-shadow var(--esv-dur-base) var(--esv-ease);
            }
            #stm-ui-container.stm-collapsed {
                background: var(--esv-surface-1-collapsed);
                padding: 2px;
                border-color: rgba(255, 255, 255, 0.06);
                box-shadow: var(--esv-shadow-sm);
            }
            #stm-ui-container.stm-side-right {
                border-top-right-radius: 0;
                border-bottom-right-radius: 0;
                border-right: none;
            }
            #stm-ui-container.stm-side-left {
                border-top-left-radius: 0;
                border-bottom-left-radius: 0;
                border-left: none;
            }

            #stm-status-dot {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: var(--esv-font);
                font-size: var(--esv-fs-lg);
                font-weight: 800;
                color: #fff;
                cursor: pointer;
                border-radius: 50%;
                position: relative;
                z-index: 2;
                background: var(--esv-accent-source-grad);
                box-shadow: 0 2px 10px rgba(34, 197, 94, 0.35);
                transition: transform var(--esv-dur-base) var(--esv-ease),
                            opacity var(--esv-dur-base) var(--esv-ease),
                            box-shadow var(--esv-dur-base) var(--esv-ease),
                            background var(--esv-dur-base) var(--esv-ease);
            }
            .stm-side-right #stm-status-dot {
                background: var(--esv-accent-source-grad);
                box-shadow: 0 2px 10px rgba(34, 197, 94, 0.35);
            }
            .stm-side-left #stm-status-dot {
                background: var(--esv-accent-target-grad);
                box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
            }
            #stm-status-dot.stm-role-p {
                background: var(--esv-accent-playlist-grad);
                box-shadow: 0 2px 10px rgba(168, 85, 247, 0.35);
            }
            .stm-collapsed #stm-status-dot { transform: scale(0.85); opacity: 0.75; }
            #stm-ui-container:hover #stm-status-dot { transform: scale(1); opacity: 1; }
            #stm-status-dot.stm-drag-over {
                background: linear-gradient(135deg, #fbbf24, #d97706) !important;
                transform: scale(1.12) !important;
                box-shadow: 0 0 24px rgba(251, 191, 36, 0.6) !important;
            }
            #stm-status-dot.stm-global-drag-over {
                background: linear-gradient(135deg, #06b6d4, #0e7490) !important;
                transform: scale(1.06) !important;
                box-shadow: 0 0 18px rgba(6, 182, 212, 0.55) !important;
            }

            #stm-grip {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 3px;
                cursor: grab;
                padding: 0 4px;
                opacity: 0;
                width: 0;
                height: 24px;
                overflow: hidden;
                transition: opacity var(--esv-dur-base) var(--esv-ease),
                            width var(--esv-dur-base) var(--esv-ease);
            }
            #stm-grip:active { cursor: grabbing; }
            #stm-ui-container:not(.stm-collapsed) #stm-grip { opacity: 0.55; width: 20px; }
            #stm-grip:hover { opacity: 1 !important; }
            .stm-grip-dot {
                width: 3px; height: 3px;
                background: var(--esv-fg-1);
                border-radius: 50%;
            }

            #stm-volume-btn {
                width: 28px;
                height: 28px;
                background: var(--esv-surface-3);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                width: 0;
                overflow: hidden;
                color: var(--esv-fg-1);
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            transform var(--esv-dur-fast) var(--esv-ease),
                            opacity var(--esv-dur-base) var(--esv-ease),
                            width var(--esv-dur-base) var(--esv-ease);
            }
            #stm-ui-container:not(.stm-collapsed) #stm-volume-btn {
                opacity: 1;
                width: 28px;
                margin: 0 4px;
            }
            #stm-volume-btn:hover {
                background: var(--esv-surface-3-hover);
                transform: scale(1.08);
            }
            #stm-volume-btn:active { transform: scale(0.96); }
            #stm-volume-btn svg { width: 16px; height: 16px; fill: currentColor; }

            #stm-mini-playlist {
                display: none;
                align-items: center;
                gap: 4px;
                margin: 0 2px;
            }
            #stm-ui-container:not(.stm-collapsed) #stm-mini-playlist { display: flex; }
            .stm-mini-btn {
                width: 26px;
                height: 26px;
                background: var(--esv-surface-3);
                border-radius: var(--esv-radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--esv-fg-1);
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            transform var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-mini-btn:hover {
                background: var(--esv-surface-3-hover);
                transform: scale(1.08);
            }
            .stm-mini-btn:active { transform: scale(0.96); }
            .stm-mini-btn svg { width: 14px; height: 14px; fill: currentColor; }

            /* =====================================================
             * Floating menu
             * ===================================================== */
            #stm-menu {
                display: none;
                position: absolute;
                top: calc(100% + 6px);
                background: var(--esv-surface-2);
                backdrop-filter: blur(18px) saturate(140%);
                -webkit-backdrop-filter: blur(18px) saturate(140%);
                border: var(--esv-border-1);
                border-radius: var(--esv-radius-md);
                width: 160px;
                overflow: hidden;
                box-shadow: var(--esv-shadow-md);
                font-family: var(--esv-font);
                font-size: var(--esv-fs-md);
                color: var(--esv-fg-1);
                z-index: 3;
                animation: esv-fade-up var(--esv-dur-base) var(--esv-ease);
            }
            #stm-menu::before {
                content: '';
                position: absolute;
                top: -8px;
                left: 0;
                right: 0;
                height: 8px;
            }
            #stm-ui-container.stm-side-right #stm-menu { right: 0; }
            #stm-ui-container.stm-side-left  #stm-menu { left: 0; }
            .stm-menu-item {
                display: block;
                width: 100%;
                padding: 10px 16px;
                background: none;
                border: none;
                text-align: left;
                color: var(--esv-fg-1);
                cursor: pointer;
                font-family: inherit;
                font-size: var(--esv-fs-md);
                line-height: 1.4;
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            color var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-menu-item:hover, .stm-menu-item:focus {
                background: var(--esv-surface-3-hover);
                color: #fff;
                outline: none;
            }
            .stm-menu-item:focus-visible {
                outline: 2px solid var(--esv-accent-info);
                outline-offset: -2px;
            }
            .stm-menu-item + .stm-menu-item {
                border-top: var(--esv-border-soft);
            }

            /* =====================================================
             * Notifications — same glass/tokens as the rest
             * ===================================================== */
            .esv-notification {
                position: fixed;
                right: 20px;
                min-width: 240px;
                max-width: 420px;
                padding: 12px 14px;
                border-radius: var(--esv-radius-md);
                background: var(--esv-surface-2);
                backdrop-filter: blur(18px) saturate(140%);
                -webkit-backdrop-filter: blur(18px) saturate(140%);
                border: var(--esv-border-1);
                box-shadow: var(--esv-shadow-md);
                color: var(--esv-fg-1);
                font-family: var(--esv-font);
                font-size: var(--esv-fs-md);
                line-height: 1.45;
                display: grid;
                grid-template-columns: 4px 22px 1fr auto;
                align-items: start;
                column-gap: 12px;
                z-index: var(--esv-z-toast);
                opacity: 0;
                transform: translateX(120%);
                transition: transform var(--esv-dur-slow) var(--esv-ease),
                            opacity var(--esv-dur-slow) var(--esv-ease),
                            top var(--esv-dur-base) var(--esv-ease);
            }
            .esv-notification::before {
                content: '';
                grid-column: 1;
                align-self: stretch;
                width: 4px;
                border-radius: var(--esv-radius-sm);
                background: var(--esv-accent-info);
            }
            .esv-notification.success::before { background: var(--esv-accent-success); }
            .esv-notification.info::before    { background: var(--esv-accent-info); }
            .esv-notification.warning::before { background: var(--esv-accent-warn); }
            .esv-notification.error::before   { background: var(--esv-accent-error); }
            .esv-notification__icon {
                grid-column: 2;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                font-weight: var(--esv-fw-bold);
                color: #fff;
                background: var(--esv-accent-info);
                margin-top: 1px;
            }
            .esv-notification.success .esv-notification__icon { background: var(--esv-accent-success); }
            .esv-notification.warning .esv-notification__icon { background: var(--esv-accent-warn); color: #1a1a1a; }
            .esv-notification.error   .esv-notification__icon { background: var(--esv-accent-error); }
            .esv-notification__body  { grid-column: 3; min-width: 0; }
            .esv-notification__title {
                font-weight: var(--esv-fw-semibold);
                font-size: var(--esv-fs-md);
                margin: 0 0 2px 0;
                color: var(--esv-fg-1);
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            .esv-notification__msg {
                margin: 0;
                font-size: var(--esv-fs-sm);
                color: var(--esv-fg-2);
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            .esv-notification__close {
                grid-column: 4;
                cursor: pointer;
                color: var(--esv-fg-3);
                font-size: 18px;
                line-height: 1;
                padding: 2px 6px;
                border-radius: 6px;
                transition: color var(--esv-dur-fast) var(--esv-ease),
                            background var(--esv-dur-fast) var(--esv-ease);
                user-select: none;
            }
            .esv-notification__close:hover {
                color: var(--esv-fg-1);
                background: var(--esv-surface-3-hover);
            }

            /* =====================================================
             * Config panel
             * ===================================================== */
            #stm-config-overlay {
                display: none;
                position: fixed;
                inset: 0;
                background: var(--esv-overlay);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: var(--esv-z-overlay);
            }
            #stm-config-panel {
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--esv-surface-2);
                backdrop-filter: blur(20px) saturate(140%);
                -webkit-backdrop-filter: blur(20px) saturate(140%);
                border: var(--esv-border-1);
                border-radius: var(--esv-radius-lg);
                padding: 24px;
                box-shadow: var(--esv-shadow-lg);
                z-index: var(--esv-z-modal);
                font-family: var(--esv-font);
                color: var(--esv-fg-1);
                width: 95%;
                max-width: 520px;
                max-height: 90vh;
                overflow-y: auto;
                box-sizing: border-box;
            }
            #stm-config-panel::-webkit-scrollbar { width: 8px; }
            #stm-config-panel::-webkit-scrollbar-track { background: transparent; }
            #stm-config-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 4px; }
            #stm-config-panel::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

            #stm-config-panel h3 {
                margin: 0;
                font-size: 20px;
                font-weight: var(--esv-fw-bold);
                color: var(--esv-fg-1);
                letter-spacing: -0.01em;
            }
            .stm-config-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            #stm-config-close-x {
                cursor: pointer;
                font-size: 26px;
                color: var(--esv-fg-3);
                line-height: 1;
                padding: 0 6px;
                border-radius: 8px;
                transition: color var(--esv-dur-fast) var(--esv-ease),
                            background var(--esv-dur-fast) var(--esv-ease);
            }
            #stm-config-close-x:hover {
                color: var(--esv-fg-1);
                background: var(--esv-surface-3-hover);
            }
            .stm-config-section {
                margin-bottom: 14px;
                padding: 14px 16px;
                background: var(--esv-surface-3);
                border-radius: var(--esv-radius-md);
                border: var(--esv-border-soft);
                transition: background var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-config-section:hover { background: var(--esv-surface-3-hover); }
            .stm-config-section h4 {
                margin: 0 0 12px 0;
                font-size: var(--esv-fs-xs);
                font-weight: var(--esv-fw-semibold);
                color: var(--esv-fg-3);
                text-transform: uppercase;
                letter-spacing: 1.2px;
            }
            .stm-config-row {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 12px;
                align-items: flex-start;
            }
            .stm-config-row:last-child { margin-bottom: 0; }
            .stm-config-label {
                flex: 1 1 140px;
                font-size: var(--esv-fs-md);
                color: var(--esv-fg-2);
                font-weight: var(--esv-fw-medium);
                padding-top: 7px;
            }
            .stm-config-input {
                flex: 2 1 220px;
                display: flex;
                flex-wrap: wrap;
                gap: 14px;
                align-items: center;
            }
            .stm-config-input label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: var(--esv-fs-md);
                color: var(--esv-fg-1);
                padding: 4px 0;
                transition: color var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-config-input label:hover { color: #fff; }

            .stm-config-input input[type="checkbox"] {
                appearance: none;
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border: 1.5px solid rgba(255,255,255,0.20);
                border-radius: 5px;
                background: rgba(255,255,255,0.04);
                cursor: pointer;
                position: relative;
                margin: 0;
                outline: none;
                flex-shrink: 0;
                transition: all var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-config-input input[type="checkbox"]:hover {
                border-color: rgba(255,255,255,0.32);
                background: rgba(255,255,255,0.08);
            }
            .stm-config-input input[type="checkbox"]:checked {
                background: var(--esv-accent-info);
                border-color: var(--esv-accent-info);
            }
            .stm-config-input input[type="checkbox"]:checked::after {
                content: '';
                position: absolute;
                left: 5px;
                top: 1px;
                width: 4px;
                height: 9px;
                border: solid #fff;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }
            .stm-config-input input[type="checkbox"]:focus-visible {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
            }
            .stm-config-input select {
                background: rgba(255,255,255,0.06);
                color: var(--esv-fg-1);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: var(--esv-radius-sm);
                padding: 7px 12px;
                cursor: pointer;
                outline: none;
                width: 100%;
                max-width: 240px;
                font-size: var(--esv-fs-md);
                font-family: inherit;
                transition: border-color var(--esv-dur-fast) var(--esv-ease),
                            background var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-config-input select:hover { background: rgba(255,255,255,0.10); }
            .stm-config-input select:focus { border-color: var(--esv-accent-info); }

            .stm-config-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 24px;
            }
            .stm-config-btn {
                padding: 10px 18px;
                border: 1px solid transparent;
                border-radius: var(--esv-radius-sm);
                cursor: pointer;
                font-size: var(--esv-fs-md);
                font-weight: var(--esv-fw-semibold);
                font-family: inherit;
                flex: 0 1 auto;
                min-width: 96px;
                text-align: center;
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            color var(--esv-dur-fast) var(--esv-ease),
                            transform var(--esv-dur-fast) var(--esv-ease),
                            border-color var(--esv-dur-fast) var(--esv-ease),
                            box-shadow var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-config-btn:active { transform: translateY(1px); }
            .stm-config-btn-save {
                background: var(--esv-accent-info);
                color: #fff;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.32);
            }
            .stm-config-btn-save:hover { background: #2563eb; box-shadow: 0 6px 16px rgba(59, 130, 246, 0.42); }
            .stm-config-btn-cancel {
                background: rgba(255,255,255,0.06);
                color: var(--esv-fg-1);
                border-color: rgba(255,255,255,0.10);
            }
            .stm-config-btn-cancel:hover { background: rgba(255,255,255,0.12); }
            .stm-config-btn-reset {
                background: rgba(239, 68, 68, 0.10);
                color: #f87171;
                border-color: rgba(239, 68, 68, 0.28);
            }
            .stm-config-btn-reset:hover {
                background: var(--esv-accent-error);
                color: #fff;
                border-color: var(--esv-accent-error);
            }

            /* =====================================================
             * Playlist panel
             * ===================================================== */
            #stm-playlist-panel {
                display: none;
                position: absolute;
                top: calc(100% + 6px);
                background: var(--esv-surface-2);
                backdrop-filter: blur(18px) saturate(140%);
                -webkit-backdrop-filter: blur(18px) saturate(140%);
                border: var(--esv-border-1);
                border-radius: var(--esv-radius-md);
                width: auto;
                min-width: 280px;
                max-width: min(420px, 85vw);
                max-height: 520px;
                overflow-y: auto;
                box-shadow: var(--esv-shadow-md);
                font-family: var(--esv-font);
                color: var(--esv-fg-1);
                z-index: 2;
                padding: 0;
                animation: esv-fade-up var(--esv-dur-base) var(--esv-ease);
            }
            #stm-playlist-panel::-webkit-scrollbar { width: 8px; }
            #stm-playlist-panel::-webkit-scrollbar-track { background: transparent; }
            #stm-playlist-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 4px; }
            #stm-playlist-panel::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
            .stm-side-right #stm-playlist-panel { right: 0; }
            .stm-side-left  #stm-playlist-panel { left: 0; }

            .stm-playlist-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                color: var(--esv-fg-1);
                cursor: pointer;
                font-size: var(--esv-fs-md);
                line-height: 1.4;
                border-bottom: var(--esv-border-soft);
                position: relative;
                overflow: hidden;
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            padding-left var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-playlist-item:last-child { border-bottom: none; }
            .stm-playlist-item:hover {
                background: var(--esv-surface-3-hover);
                padding-left: 18px;
            }
            .stm-playlist-item.active {
                background: rgba(59, 130, 246, 0.16);
                box-shadow: inset 3px 0 0 0 var(--esv-accent-target);
            }
            .stm-playlist-item.playing {
                background: rgba(34, 197, 94, 0.16);
                box-shadow: inset 3px 0 0 0 var(--esv-accent-source);
            }
            .stm-playlist-item-title {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-weight: var(--esv-fw-medium);
                font-size: var(--esv-fs-md);
            }
            .stm-playlist-item-play-icon {
                width: 12px;
                height: 12px;
                fill: currentColor;
                opacity: 0;
                transition: opacity var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-playlist-item:hover .stm-playlist-item-play-icon,
            .stm-playlist-item.playing .stm-playlist-item-play-icon { opacity: 1; }
            .stm-playlist-item-remove {
                opacity: 0;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 16px;
                color: var(--esv-fg-3);
                transition: all var(--esv-dur-fast) var(--esv-ease);
                user-select: none;
            }
            .stm-playlist-item:hover .stm-playlist-item-remove { opacity: 0.7; }
            .stm-playlist-item-remove:hover {
                opacity: 1 !important;
                background: rgba(239, 68, 68, 0.18);
                color: var(--esv-accent-error);
            }
            .stm-playlist-action-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: var(--esv-radius-sm);
                padding: 7px 10px;
                color: var(--esv-fg-1);
                font-size: var(--esv-fs-sm);
                font-family: inherit;
                font-weight: var(--esv-fw-medium);
                cursor: pointer;
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            color var(--esv-dur-fast) var(--esv-ease),
                            border-color var(--esv-dur-fast) var(--esv-ease);
            }
            .stm-playlist-action-btn:hover {
                background: rgba(255,255,255,0.12);
                color: #fff;
                border-color: rgba(255,255,255,0.18);
            }
            .esv-playlist-search {
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: var(--esv-radius-sm);
                padding: 7px 10px;
                color: var(--esv-fg-1);
                font-family: inherit;
                font-size: var(--esv-fs-sm);
                outline: none;
                width: 100%;
                box-sizing: border-box;
                transition: border-color var(--esv-dur-fast) var(--esv-ease),
                            background var(--esv-dur-fast) var(--esv-ease);
            }
            .esv-playlist-search::placeholder { color: var(--esv-fg-3); }
            .esv-playlist-search:focus {
                border-color: var(--esv-accent-info);
                background: rgba(255,255,255,0.10);
            }

            /* =====================================================
             * Source picker
             * ===================================================== */
            #stm-source-picker {
                position: fixed;
                z-index: var(--esv-z-modal);
                background: var(--esv-surface-2);
                backdrop-filter: blur(18px) saturate(140%);
                -webkit-backdrop-filter: blur(18px) saturate(140%);
                border: var(--esv-border-1);
                border-radius: var(--esv-radius-md);
                min-width: 260px;
                max-width: 400px;
                max-height: 60vh;
                overflow-y: auto;
                box-shadow: var(--esv-shadow-md);
                font-family: var(--esv-font);
                font-size: var(--esv-fs-md);
                color: var(--esv-fg-1);
                padding: 4px 0;
                animation: esv-fade-up var(--esv-dur-base) var(--esv-ease);
            }
            #stm-source-picker .esv-picker-head {
                padding: 10px 14px 8px 14px;
                font-size: var(--esv-fs-xs);
                color: var(--esv-fg-3);
                text-transform: uppercase;
                letter-spacing: 1.2px;
                border-bottom: var(--esv-border-soft);
                font-weight: var(--esv-fw-semibold);
            }
            #stm-source-picker .esv-picker-item {
                padding: 10px 14px;
                cursor: pointer;
                border-bottom: var(--esv-border-soft);
                transition: background var(--esv-dur-fast) var(--esv-ease),
                            padding-left var(--esv-dur-fast) var(--esv-ease);
            }
            #stm-source-picker .esv-picker-item:last-child { border-bottom: none; }
            #stm-source-picker .esv-picker-item:hover {
                background: var(--esv-surface-3-hover);
                padding-left: 18px;
            }
            #stm-source-picker .esv-picker-item-title {
                font-weight: var(--esv-fw-medium);
                color: var(--esv-fg-1);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            #stm-source-picker .esv-picker-meta {
                font-size: var(--esv-fs-xs);
                color: var(--esv-fg-3);
                margin-top: 3px;
            }

            /* =====================================================
             * a11y — reduced motion
             * ===================================================== */
            @media (prefers-reduced-motion: reduce) {
                #stm-ui-container,
                #stm-status-dot,
                #stm-volume-btn,
                .stm-mini-btn,
                .esv-notification,
                .stm-playlist-item,
                .stm-pulse-animate,
                #stm-menu,
                #stm-playlist-panel,
                #stm-source-picker {
                    animation: none !important;
                    transition: none !important;
                }
            }

            /* =====================================================
             * Light theme — auto via .esv-theme-auto on root surfaces
             * ===================================================== */
            @media (prefers-color-scheme: light) {
                .esv-theme-auto {
                    --esv-surface-1: rgba(255, 255, 255, 0.78);
                    --esv-surface-1-collapsed: rgba(255, 255, 255, 0.5);
                    --esv-surface-2: rgba(252, 252, 253, 0.92);
                    --esv-surface-3: rgba(0, 0, 0, 0.045);
                    --esv-surface-3-hover: rgba(0, 0, 0, 0.07);
                    --esv-surface-4: rgba(0, 0, 0, 0.10);
                    --esv-overlay: rgba(15, 15, 20, 0.45);
                    --esv-border-1: 1px solid rgba(0, 0, 0, 0.10);
                    --esv-border-soft: 1px solid rgba(0, 0, 0, 0.06);
                    --esv-fg-1: #18181b;
                    --esv-fg-2: #3f3f46;
                    --esv-fg-3: #71717a;
                    --esv-shadow-sm: 0 2px 8px rgba(15, 15, 20, 0.10);
                    --esv-shadow-md: 0 8px 24px rgba(15, 15, 20, 0.16);
                    --esv-shadow-lg: 0 16px 40px rgba(15, 15, 20, 0.22);
                    --esv-shadow-inner: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
                }
            }
        `);
    }

    function createConfigPanel() {
        if (window !== window.top) return;
        const overlay = document.createElement('div');
        overlay.id = 'stm-config-overlay';
        overlay.classList.add('esv-theme-auto');
        const panel = document.createElement('div');
        panel.id = 'stm-config-panel';
        panel.classList.add('esv-theme-auto');
        panel.innerHTML = ttPolicy.createHTML(`
            <div class="stm-config-header">
                <h3>Preference</h3>
                <span id="stm-config-close-x">&times;</span>
            </div>
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
            <div class="stm-config-section">
                <h4>Notifications</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Source Role:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-notify-new-source"> Notify when new source tab joins</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Target Role:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-notify-new-target"> Notify when new target tab joins</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Revoke Role:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-notify-revoke"> Notify when a tab revokes its role</label>
                    </div>
                </div>
            </div>
            <div class="stm-config-section">
                <h4>Shortcuts</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Mute toggle:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-sc-mute"> Ctrl+Alt+M</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Playlist nav:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-sc-pnav"> Ctrl+Alt+&larr; / &rarr;</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Revoke role:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-sc-revoke"> Ctrl+Alt+R</label>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Esc closes panels:</div>
                    <div class="stm-config-input">
                        <label><input type="checkbox" id="stm-sc-esc"> Esc</label>
                    </div>
                </div>
            </div>
            <div class="stm-config-section">
                <h4>Appearance & Playlist</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Theme:</div>
                    <div class="stm-config-input">
                        <select id="stm-theme">
                            <option value="auto">Auto (follow system)</option>
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Playlist max items:</div>
                    <div class="stm-config-input">
                        <select id="stm-playlist-max">
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                            <option value="1000">1000</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="stm-config-section">
                <h4>Backup & Diagnostics</h4>
                <div class="stm-config-row">
                    <div class="stm-config-label">Config:</div>
                    <div class="stm-config-input">
                        <button class="stm-config-btn stm-config-btn-cancel" id="stm-cfg-export" type="button">Export</button>
                        <button class="stm-config-btn stm-config-btn-cancel" id="stm-cfg-import" type="button">Import</button>
                    </div>
                </div>
                <div class="stm-config-row">
                    <div class="stm-config-label">Diagnostics:</div>
                    <div class="stm-config-input" id="stm-diagnostics" style="font-family:monospace; font-size:11px; color:#aaa; white-space:pre-wrap; line-height:1.5;">(loading…)</div>
                </div>
            </div>
            <div class="stm-config-buttons">
                <button class="stm-config-btn stm-config-btn-reset" id="stm-config-reset">Reset to Default</button>
                <button class="stm-config-btn stm-config-btn-cancel" id="stm-config-cancel">Cancel</button>
                <button class="stm-config-btn stm-config-btn-save" id="stm-config-save">Save</button>
            </div>
        `);
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        overlay.addEventListener('click', hideConfigPanel);
        panel.querySelector('#stm-config-cancel').addEventListener('click', hideConfigPanel);
        panel.querySelector('#stm-config-close-x').addEventListener('click', hideConfigPanel);
        panel.querySelector('#stm-config-save').addEventListener('click', saveConfigFromPanel);
        panel.querySelector('#stm-config-reset').addEventListener('click', resetConfigToDefault);
        panel.querySelector('#stm-cfg-export').addEventListener('click', exportConfigToClipboard);
        panel.querySelector('#stm-cfg-import').addEventListener('click', importConfigFromClipboard);
        return { overlay, panel };
    }

    function showConfigPanel() {
        if (window !== window.top) return;
        if (!configPanel) { configPanel = createConfigPanel(); }
        document.getElementById('stm-source-button').value = config.sourceKey.button;
        document.getElementById('stm-source-ctrl').checked = config.sourceKey.ctrl;
        document.getElementById('stm-source-alt').checked = config.sourceKey.alt;
        document.getElementById('stm-source-shift').checked = config.sourceKey.shift;
        document.getElementById('stm-target-button').value = config.targetKey.button;
        document.getElementById('stm-target-ctrl').checked = config.targetKey.ctrl;
        document.getElementById('stm-target-alt').checked = config.targetKey.alt;
        document.getElementById('stm-target-shift').checked = config.targetKey.shift;

        const notifications = config.notifications || DEFAULT_CONFIG.notifications;
        document.getElementById('stm-notify-new-source').checked = !!notifications.newSourceRole;
        document.getElementById('stm-notify-new-target').checked = !!notifications.newTargetRole;
        document.getElementById('stm-notify-revoke').checked = !!notifications.revokeRole;

        const sc = config.shortcuts || DEFAULT_CONFIG.shortcuts;
        document.getElementById('stm-sc-mute').checked = !!sc.mute;
        document.getElementById('stm-sc-pnav').checked = !!sc.playlistNav;
        document.getElementById('stm-sc-revoke').checked = !!sc.revokeRole;
        document.getElementById('stm-sc-esc').checked = !!sc.esc;

        document.getElementById('stm-theme').value = config.theme || 'auto';
        document.getElementById('stm-playlist-max').value = String(config.playlistMaxItems || 200);

        // Diagnostics
        renderDiagnostics();

        configPanel.overlay.style.display = 'block';
        configPanel.panel.style.display = 'block';
    }

    function renderDiagnostics() {
        const el = document.getElementById('stm-diagnostics');
        if (!el) return;
        try {
            const known = GM_getValue(KEY_KNOWN_SOURCES, []);
            const allKeys = GM_listValues().filter(k => k.startsWith(GM_PREFIX));
            const sources = known.map(s => {
                const tabs = GM_getValue(getSourceListKey(s.id), []);
                return `  · ${s.id.slice(-4)}  ${s.hostname || '?'}  tabs:${tabs.length}`;
            }).join('\n') || '  (none)';
            const lines = [
                `Role: ${myRole}` + (myId ? ` (group ${myId.slice(-4)})` : ''),
                `Instance: ${myInstanceId}`,
                `BroadcastChannel: ${bc ? 'on' : 'off'}`,
                `Known sources:`,
                sources,
                `GM keys in use: ${allKeys.length}`
            ];
            el.textContent = lines.join('\n');
        } catch (e) {
            el.textContent = `(diagnostics error: ${e.message})`;
        }
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
            },
            shortcuts: {
                mute: document.getElementById('stm-sc-mute').checked,
                playlistNav: document.getElementById('stm-sc-pnav').checked,
                revokeRole: document.getElementById('stm-sc-revoke').checked,
                esc: document.getElementById('stm-sc-esc').checked
            },
            theme: document.getElementById('stm-theme').value,
            playlistMaxItems: parseInt(document.getElementById('stm-playlist-max').value, 10) || 200
        };
        saveConfig(newConfig);
        hideConfigPanel();
        Notify.success('Configuration saved!');
    }

    function exportConfigToClipboard() {
        try {
            const json = JSON.stringify(config, null, 2);
            navigator.clipboard.writeText(json).then(() => {
                Notify.success('Config copied to clipboard');
            }).catch(() => {
                window.prompt('Copy this config:', json);
            });
        } catch (e) {
            Notify.error('Export failed');
        }
    }

    function importConfigFromClipboard() {
        const raw = window.prompt('Paste config JSON:');
        if (!raw) return;
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) {
            Notify.error('Invalid JSON');
            return;
        }
        // Merge with defaults so missing fields don't break anything
        const merged = {
            sourceKey: Object.assign({}, DEFAULT_CONFIG.sourceKey, parsed.sourceKey || {}),
            targetKey: Object.assign({}, DEFAULT_CONFIG.targetKey, parsed.targetKey || {}),
            notifications: Object.assign({}, DEFAULT_CONFIG.notifications, parsed.notifications || {}),
            shortcuts: Object.assign({}, DEFAULT_CONFIG.shortcuts, parsed.shortcuts || {}),
            theme: parsed.theme || DEFAULT_CONFIG.theme,
            playlistMaxItems: parsed.playlistMaxItems || DEFAULT_CONFIG.playlistMaxItems
        };
        saveConfig(merged);
        hideConfigPanel();
        Notify.success('Configuration imported!');
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
        const playlistPrefix = `${GM_PREFIX}playlist_`;

        keys.forEach(k => {
            if (k.startsWith(urlPrefix)) ids.add(k.slice(urlPrefix.length));
            else if (k.startsWith(tsPrefix)) ids.add(k.slice(tsPrefix.length));
            else if (k.startsWith(disconnectPrefix)) ids.add(k.slice(disconnectPrefix.length));
            else if (k.startsWith(sourcesPrefix)) ids.add(k.slice(sourcesPrefix.length));
            else if (k.startsWith(mutePrefix) || k.startsWith(lazyloadPrefix) || k.startsWith(playlistPrefix)) {
                // Remove tab-specific mute, lazyload, and playlist states (including index)
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
        // Remove all role-related stored values while preserving configuration and UI position.
        keys.forEach(k => {
            if (k === KEY_CONFIG || k === KEY_UI_POS) return;
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
                grip: document.createElement('div'),
                playlistPanel: document.createElement('div'),
                miniPlaylist: document.createElement('div')
            };
            ui.container.id = 'stm-ui-container';
            ui.container.classList.add('stm-collapsed');
            // Theme class — auto enables prefers-color-scheme override; dark/light force
            const themeMode = (config && config.theme) || 'auto';
            if (themeMode === 'auto') ui.container.classList.add('esv-theme-auto');
            else if (themeMode === 'light') ui.container.classList.add('esv-theme-auto'); // forced via media won't apply; left as auto
            ui.dot.id = 'stm-status-dot';
            ui.menu.id = 'stm-menu';
            ui.volume.id = 'stm-volume-btn';
            ui.grip.id = 'stm-grip';
            ui.grip.innerHTML = ttPolicy.createHTML('<div class="stm-grip-dot"></div><div class="stm-grip-dot"></div><div class="stm-grip-dot"></div>');

            ui.playlistPanel.id = 'stm-playlist-panel';
            ui.miniPlaylist.id = 'stm-mini-playlist';
            ui.miniPlaylist.innerHTML = ttPolicy.createHTML(`
                <div class="stm-mini-btn" title="Previous" data-action="prev">
                    <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </div>
                <div class="stm-mini-btn" title="Next" data-action="next">
                    <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z"/></svg>
                </div>
            `);

            ui.container.append(ui.grip, ui.volume, ui.miniPlaylist, ui.dot, ui.menu, ui.playlistPanel);
            document.body.appendChild(ui.container);

            // Native Drag & Click (Role Assignment)
            ui.dot.setAttribute('draggable', 'true');
            // Defer single-click action so dblclick can cancel it (A5)
            let _dotClickTimer = null;
            ui.dot.addEventListener('click', (e) => {
                if (e.button !== 0) return;
                if (_dotClickTimer) clearTimeout(_dotClickTimer);
                _dotClickTimer = setTimeout(() => {
                    _dotClickTimer = null;
                    toggleMenu();
                }, 220);
            });
            ui.dot.addEventListener('dblclick', () => {
                if (_dotClickTimer) { clearTimeout(_dotClickTimer); _dotClickTimer = null; }
                if (myRole === 'target') {
                    setRole('playlist', myId, false, myLastTs);
                } else if (myRole === 'playlist') {
                    setRole('target', myId, false, myLastTs);
                }
            });
            ui.dot.addEventListener('dragstart', handleRoleDragStart);
            // Guaranteed cleanup hook — fires on the drag SOURCE no matter where the drop
            // landed (including different windows, tabs, or cancelled drags via Esc).
            // Without this the cyan `.stm-global-drag-over` can stick when dropping on
            // another browser window, freezing page click responsiveness.
            ui.dot.addEventListener('dragend', _esvClearDragVisuals);

            ui.miniPlaylist.addEventListener('click', (e) => {
                const btn = e.target.closest('.stm-mini-btn');
                if (btn) {
                    navigatePlaylist(btn.dataset.action);
                }
            });

            // UI Movement (Custom Dragging)
            ui.grip.addEventListener('mousedown', handleGripMouseDown);

            // Hover Expansion
            ui.container.addEventListener('mouseenter', () => {
                if (collapseTimeout) {
                    clearTimeout(collapseTimeout);
                    collapseTimeout = null;
                }
                ui.container.classList.remove('stm-collapsed');
                // Playlist panel is now toggled via click, not hover
            });
            ui.container.addEventListener('mouseleave', (e) => {
                if (collapseTimeout) clearTimeout(collapseTimeout);
                collapseTimeout = setTimeout(() => {
                    if ((!ui.menu.style.display || ui.menu.style.display === 'none') &&
                        (!ui.playlistPanel.style.display || ui.playlistPanel.style.display === 'none')) {
                        ui.container.classList.add('stm-collapsed');
                    }
                    handleContainerMouseLeave(e);
                    collapseTimeout = null;
                }, 400); // 400ms buffer to prevent "slippy" collapse
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
            // Safety nets: drag may end without firing drop/dragleave when user drops on
            // another window, presses Esc, or alt-tabs away. Clear stuck visuals on these.
            window.addEventListener('dragend', _esvClearDragVisuals, true);
            window.addEventListener('blur', _esvClearDragVisuals);
            window.addEventListener('focus', _esvClearDragVisuals);
            // First mousemove or pointerdown AFTER a drag is the clearest signal that
            // the drag is over from the user's POV. If we're still flagged "in flight"
            // and the user is moving the mouse without holding a button, the drag ended.
            window.addEventListener('mousemove', (mv) => {
                if (_esvDragInFlight && mv.buttons === 0) {
                    _esvClearDragVisuals();
                }
            }, true);
            window.addEventListener('pointerdown', () => {
                if (_esvDragInFlight) _esvClearDragVisuals();
            }, true);
            window.addEventListener('mouseup', () => {
                if (_esvDragInFlight) _esvClearDragVisuals();
            }, true);
            window.addEventListener('keydown', (ke) => {
                if (ke.key === 'Escape') _esvClearDragVisuals();
            }, true);
            // visibilitychange catches alt-tab / split-view focus shifts.
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') _esvClearDragVisuals();
            });
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

        // Re-inject if missing (aggressive self-healing)
        if (myRole !== 'idle' && !isFullscreen && document.body && !ui.container.isConnected) {
            document.body.appendChild(ui.container);
        }

        ui.dot.classList.remove('stm-role-p');
        ui.container.classList.remove('stm-role-playlist');
        ui.miniPlaylist.style.display = 'none';

        if (myRole === 'source') {
            ui.dot.textContent = 'S';
            ui.dot.style.display = 'flex';
            ui.dot.title = `Source — group ${(myId || '').slice(-4)}`;
        } else if (myRole === 'target') {
            ui.dot.textContent = 'T';
            ui.dot.style.display = 'flex';
            ui.dot.title = `Target — group ${(myId || '').slice(-4)}`;
        } else if (myRole === 'playlist') {
            ui.dot.textContent = 'P';
            ui.dot.style.display = 'flex';
            ui.dot.classList.add('stm-role-p');
            ui.container.classList.add('stm-role-playlist');
            ui.miniPlaylist.style.display = 'flex';
            ui.dot.title = `Playlist — group ${(myId || '').slice(-4)}`;
        } else {
            // This block is mostly for safety if the container display logic changes.
            ui.dot.style.display = 'none';
            ui.dot.textContent = '';
            ui.dot.title = '';
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
            ui.menu.innerHTML = ttPolicy.createHTML(`
                <div role="menu" aria-label="Split View Menu">
                    ${contextMenuItems.map(item =>
                `<button role="menuitem" tabindex="0" data-action="${item.action}" class="stm-menu-item">
                            ${item.text}
                        </button>`
            ).join('')}
                </div>
            `);
        }
    }

    function toggleMenu() {
        if (ui && ui.menu) {
            const isVisible = ui.menu.style.display === 'block';
            ui.menu.style.display = isVisible ? 'none' : 'block';

            // Also toggle playlist if in playlist role
            if (myRole === 'playlist' && ui.playlistPanel) {
                const showing = !isVisible;
                ui.playlistPanel.style.display = showing ? 'block' : 'none';
                if (showing) {
                    updatePlaylistUI();
                    // Position playlist below menu. 
                    // Since menu is 140px wide and has 2 items, it's roughly 85px high.
                    setTimeout(() => {
                        const menuHeight = ui.menu.offsetHeight || 85;
                        ui.playlistPanel.style.top = `calc(100% + ${menuHeight + 6}px)`;
                    }, 0);
                }
            }

            if (!isVisible) {
                ui.container.classList.remove('stm-collapsed');
            }
        }
    }
    function hideMenu() {
        if (ui) {
            if (ui.menu) ui.menu.style.display = 'none';
            if (ui.playlistPanel) ui.playlistPanel.style.display = 'none';
            ui.container.classList.add('stm-collapsed');
        }
    }
    function handleContainerMouseLeave(e) {
        if (!ui || !ui.container) return;
        const toEl = e.relatedTarget;
        if (!toEl || !ui.container.contains(toEl)) {
            if (ui.menu.style.display !== 'block' && ui.playlistPanel.style.display !== 'block') {
                hideMenu();
            }
        }
    }
    function pulseDot() {
        if (!ui || !ui.dot) return;
        // Ensure the dot is actually visible (uncollapse briefly so user gets feedback
        // that their click was captured and forwarded to the Target).
        if (ui.container && ui.container.classList.contains('stm-collapsed')) {
            ui.container.classList.remove('stm-collapsed');
            setTimeout(() => {
                if (ui && ui.container &&
                    (!ui.menu || ui.menu.style.display !== 'block') &&
                    (!ui.playlistPanel || ui.playlistPanel.style.display !== 'block')) {
                    ui.container.classList.add('stm-collapsed');
                }
            }, 700);
        }
        ui.dot.classList.add('stm-pulse-animate');
        ui.dot.addEventListener('animationend',
            () => ui.dot.classList.remove('stm-pulse-animate'),
            { once: true });
    }

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

    function publishNavigation(url, title) {
        // Ensure monotonic timestamp to guarantee listener fires even on rapid/same-URL clicks.
        const current = GM_getValue(getTimestampKey(myId), 0);
        const now = Date.now();
        const ts = now > current ? now : current + 1;
        GM_setValue(getTargetUrlKey(myId), url);
        if (title) GM_setValue(getTargetTitleKey(myId), title);
        GM_setValue(getTimestampKey(myId), ts);
        // Low-latency channel
        bcPost({ type: 'navigate', groupId: myId, url, title: title || '', ts, from: myInstanceId });
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
            removeKnownSource(groupId);
        }
    }

    // --- Multi-source registry (v1.1) ---
    function registerKnownSource(groupId) {
        const list = GM_getValue(KEY_KNOWN_SOURCES, []);
        const idx = list.findIndex(s => s.id === groupId);
        const entry = {
            id: groupId,
            timestamp: Date.now(),
            hostname: (function () { try { return new URL(window.location.href).hostname; } catch (e) { return 'unknown'; } })(),
            title: document.title || ''
        };
        if (idx >= 0) {
            list[idx] = entry;
        } else {
            list.push(entry);
        }
        GM_setValue(KEY_KNOWN_SOURCES, list);
    }

    function removeKnownSource(groupId) {
        const list = GM_getValue(KEY_KNOWN_SOURCES, []);
        const filtered = list.filter(s => s.id !== groupId);
        if (filtered.length > 0) {
            GM_setValue(KEY_KNOWN_SOURCES, filtered);
        } else {
            GM_deleteValue(KEY_KNOWN_SOURCES);
        }
    }

    function getActiveKnownSources() {
        // Filter to sources that still have at least one active source tab
        const list = GM_getValue(KEY_KNOWN_SOURCES, []);
        return list.filter(s => {
            const tabs = GM_getValue(getSourceListKey(s.id), []);
            return tabs.length > 0;
        });
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
                ui.volume.innerHTML = ttPolicy.createHTML(volIcon);
                ui.volume.title = myIsMuted ? 'Click to unmute' : 'Click to mute';
            }
        } else {
            ui.volume.style.display = 'none';
        }
    }

    // --- Playlist Management ---
    let playlistFilterText = '';
    let lastPlaylistRenderHash = '';

    function getPlaylistMaxItems() {
        return (config && config.playlistMaxItems) || DEFAULT_CONFIG.playlistMaxItems;
    }

    function addToPlaylist(url, title = null) {
        if (!myId) return;
        const key = getPlaylistKey(myId);
        const playlist = GM_getValue(key, []);

        // Avoid duplicates
        if (playlist.find(item => item.url === url)) {
            Notify.info('Link already in playlist');
            return;
        }

        let displayTitle = title;
        if (!displayTitle) {
            try {
                const u = new URL(url);
                displayTitle = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
            } catch (e) {
                displayTitle = url;
            }
        }

        const newItem = {
            url: url,
            title: displayTitle,
            timestamp: Date.now()
        };

        playlist.push(newItem);

        // Cap playlist size (FIFO)
        const maxItems = getPlaylistMaxItems();
        let dropped = 0;
        while (playlist.length > maxItems) {
            playlist.shift();
            dropped++;
        }

        GM_setValue(key, playlist);
        if (dropped > 0) {
            Notify.warning(`Added; oldest ${dropped} item(s) dropped (cap ${maxItems})`);
        } else {
            Notify.success('Added to playlist');
        }
        updatePlaylistUI(true);
        pulseDot();
    }

    function removeFromPlaylist(index) {
        if (!myId) return;
        const key = getPlaylistKey(myId);
        const indexKey = getPlaylistIndexKey(myId);
        const playlist = GM_getValue(key, []);
        let currentIndex = GM_getValue(indexKey, -1);

        playlist.splice(index, 1);
        GM_setValue(key, playlist);

        // Adjust current index if needed
        if (currentIndex === index) {
            GM_setValue(indexKey, -1);
        } else if (currentIndex > index) {
            GM_setValue(indexKey, currentIndex - 1);
        }

        updatePlaylistUI(true);
    }

    function reorderPlaylist(fromIdx, toIdx) {
        if (!myId || fromIdx === toIdx) return;
        const key = getPlaylistKey(myId);
        const indexKey = getPlaylistIndexKey(myId);
        const playlist = GM_getValue(key, []);
        if (fromIdx < 0 || fromIdx >= playlist.length || toIdx < 0 || toIdx > playlist.length) return;

        const [moved] = playlist.splice(fromIdx, 1);
        // Adjust target index because of the splice
        const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
        playlist.splice(insertAt, 0, moved);
        GM_setValue(key, playlist);

        // Update playing index to follow the moved item if needed
        let currentIndex = GM_getValue(indexKey, -1);
        if (currentIndex === fromIdx) {
            GM_setValue(indexKey, insertAt);
        } else if (currentIndex > fromIdx && currentIndex <= insertAt) {
            GM_setValue(indexKey, currentIndex - 1);
        } else if (currentIndex < fromIdx && currentIndex >= insertAt) {
            GM_setValue(indexKey, currentIndex + 1);
        }
        updatePlaylistUI(true);
    }

    function navigatePlaylist(direction) {
        if (!myId) return;
        const key = getPlaylistKey(myId);
        const indexKey = getPlaylistIndexKey(myId);
        const playlist = GM_getValue(key, []);
        if (playlist.length === 0) return;

        let currentIndex = GM_getValue(indexKey, -1);

        // If no index saved, try to find it by current URL
        if (currentIndex === -1) {
            const currentUrl = window.location.href;
            currentIndex = playlist.findIndex(item => item.url === currentUrl);
        }

        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % playlist.length;
        } else {
            nextIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        }

        GM_setValue(indexKey, nextIndex);
        window.location.href = playlist[nextIndex].url;
    }

    function sharePlaylist() {
        if (!myId) return;
        const playlist = GM_getValue(getPlaylistKey(myId), []);
        if (playlist.length === 0) {
            Notify.warning('Playlist is empty');
            return;
        }

        try {
            const minified = playlist.map(p => ({ u: p.url, t: p.title }));
            const json = JSON.stringify(minified);
            const encoded = btoa(encodeURIComponent(json));

            const url = new URL(window.location.href);
            url.searchParams.set('stm_playlist', encoded);

            navigator.clipboard.writeText(url.toString()).then(() => {
                Notify.success('Playlist URL copied to clipboard');
            }).catch(err => {
                log('clipboard fail', err);
                Notify.error('Failed to copy to clipboard');
            });
        } catch (e) {
            log('share fail', e);
            Notify.error('Failed to generate share link');
        }
    }

    function checkPlaylistParam() {
        if (window !== window.top) return;
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get('stm_playlist');
        if (!encoded) return;

        // Strip param immediately so reload won't re-prompt
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('stm_playlist');
        window.history.replaceState({}, '', cleanUrl);

        let minified;
        try {
            const json = decodeURIComponent(atob(encoded));
            minified = JSON.parse(json);
        } catch (e) {
            warn('Failed to parse playlist param', e);
            return;
        }
        if (!Array.isArray(minified) || minified.length === 0) return;

        // A7: require user consent before importing
        const proceed = window.confirm(`Import ${minified.length} playlist item(s) from this link?`);
        if (!proceed) return;

        const playlist = minified.map(p => ({
            url: p.u || p.url,
            title: p.t || p.title,
            timestamp: Date.now()
        })).filter(p => p.url);

        const newId = generateId();
        GM_setValue(getPlaylistKey(newId), playlist);
        setRole('playlist', newId);
        Notify.success(`Imported ${playlist.length} items to playlist`);
    }

    function updatePlaylistUI(force = false) {
        if (!ui || !ui.playlistPanel || myRole !== 'playlist') return;

        const playlist = GM_getValue(getPlaylistKey(myId), []);
        const indexKey = getPlaylistIndexKey(myId);
        const playingIndex = GM_getValue(indexKey, -1);
        const currentUrl = window.location.href;

        // B5: skip render if data + filter unchanged
        const hash = JSON.stringify([playlist.length, playingIndex, currentUrl, playlistFilterText, playlist.map(i => i.url)]);
        if (!force && hash === lastPlaylistRenderHash) return;
        lastPlaylistRenderHash = hash;

        // Build via DOM API (escape-safe)
        const panel = ui.playlistPanel;
        panel.textContent = '';

        // Header (Search + actions)
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; flex-direction:column; gap:6px; padding:8px 16px; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:4px;';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Filter…';
        searchInput.value = playlistFilterText;
        searchInput.className = 'esv-playlist-search';
        searchInput.addEventListener('input', (e) => {
            playlistFilterText = e.target.value.toLowerCase();
            updatePlaylistUI(true);
            // Restore focus + caret
            const newInput = panel.querySelector('input[type=text]');
            if (newInput) {
                newInput.focus();
                newInput.setSelectionRange(playlistFilterText.length, playlistFilterText.length);
            }
        });
        header.appendChild(searchInput);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px;';
        const shareBtn = document.createElement('button');
        shareBtn.id = 'stm-playlist-share-btn';
        shareBtn.className = 'stm-playlist-action-btn';
        shareBtn.title = 'Copy Playlist URL';
        shareBtn.innerHTML = ttPolicy.createHTML(`<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg> Share`);
        shareBtn.addEventListener('click', sharePlaylist);
        const clearBtn = document.createElement('button');
        clearBtn.id = 'stm-playlist-clear-btn';
        clearBtn.className = 'stm-playlist-action-btn';
        clearBtn.title = 'Clear Playlist';
        clearBtn.innerHTML = ttPolicy.createHTML(`<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Clear`);
        clearBtn.addEventListener('click', () => {
            if (window.confirm('Clear playlist?')) {
                GM_setValue(getPlaylistKey(myId), []);
                GM_setValue(indexKey, -1);
                updatePlaylistUI(true);
            }
        });
        btnRow.append(shareBtn, clearBtn);
        header.appendChild(btnRow);
        panel.appendChild(header);

        // Items
        const filtered = playlist.map((item, origIndex) => ({ item, origIndex })).filter(({ item }) => {
            if (!playlistFilterText) return true;
            const hay = (item.title + ' ' + item.url).toLowerCase();
            return hay.includes(playlistFilterText);
        });

        if (playlist.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:12px; text-align:center; color:#888; font-size:12px;';
            empty.textContent = 'Playlist is empty';
            panel.appendChild(empty);
        } else if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding:12px; text-align:center; color:#888; font-size:12px;';
            empty.textContent = 'No matches';
            panel.appendChild(empty);
        } else {
            filtered.forEach(({ item, origIndex }) => {
                const isPlaying = origIndex === playingIndex;
                const isActive = item.url === currentUrl;

                let siteName = 'Link';
                try { siteName = new URL(item.url).hostname.replace('www.', ''); } catch (e) { /* */ }

                const row = document.createElement('div');
                row.className = 'stm-playlist-item' + (isPlaying ? ' playing' : '') + (isActive ? ' active' : '');
                row.dataset.index = String(origIndex);
                row.draggable = true;

                const icon = document.createElement('div');
                icon.className = 'stm-playlist-item-play-icon';
                icon.innerHTML = ttPolicy.createHTML('<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>');

                const titleEl = document.createElement('div');
                titleEl.className = 'stm-playlist-item-title';
                titleEl.title = item.url;
                titleEl.textContent = `${siteName} | ${item.title}`;

                const removeEl = document.createElement('div');
                removeEl.className = 'stm-playlist-item-remove';
                removeEl.dataset.action = 'remove';
                removeEl.dataset.index = String(origIndex);
                removeEl.textContent = '×';

                row.append(icon, titleEl, removeEl);

                row.addEventListener('click', (e) => {
                    if (e.target === removeEl || e.target.closest('.stm-playlist-item-remove')) {
                        removeFromPlaylist(origIndex);
                        return;
                    }
                    GM_setValue(indexKey, origIndex);
                    window.location.href = playlist[origIndex].url;
                });

                // Drag-to-reorder (C3)
                row.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('application/esv-playlist-reorder', String(origIndex));
                    row.style.opacity = '0.4';
                });
                row.addEventListener('dragend', () => { row.style.opacity = ''; });
                row.addEventListener('dragover', (e) => {
                    if (e.dataTransfer.types.includes('application/esv-playlist-reorder')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        row.style.borderTop = '2px solid #4CAF50';
                    }
                });
                row.addEventListener('dragleave', () => { row.style.borderTop = ''; });
                row.addEventListener('drop', (e) => {
                    row.style.borderTop = '';
                    const fromStr = e.dataTransfer.getData('application/esv-playlist-reorder');
                    if (!fromStr) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const from = parseInt(fromStr, 10);
                    const to = origIndex;
                    if (Number.isInteger(from)) reorderPlaylist(from, to);
                });

                panel.appendChild(row);
            });
        }
    }

    // --- Media Management (Volume/Mute) ---
    const mediaManager = {
        hasMedia: false,
        elements: new Set(),
        iframes: new Set(),
        initialized: false,
        _interval: null,
        _observer: null,
        _lastMuteSent: null,
        _lastMuteSentAt: 0,

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
            // Only do an initial scan; observer/interval start when role becomes non-idle
            this.scan();
            this.scanIframes();
            this.applyRoleState();
        },

        // Called when role/idle state changes — start or stop background work
        applyRoleState() {
            if (myRole !== 'idle') {
                this.startBackground();
            } else {
                this.stopBackground();
            }
        },

        startBackground() {
            if (!this._observer) this.observe();
            if (!this._interval) {
                this._interval = setInterval(() => this.updateState(), 1500);
            }
        },

        stopBackground() {
            if (this._observer) {
                try { this._observer.disconnect(); } catch (e) { /* */ }
                this._observer = null;
            }
            if (this._interval) {
                clearInterval(this._interval);
                this._interval = null;
            }
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

            for (const [name, cfg] of Object.entries(this.iframeConfigs)) {
                for (const pattern of cfg.patterns) {
                    if (pattern.test(src)) {
                        matchedConfig = cfg;
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

                // Ensure YouTube iframes have enablejsapi=1 (one-time only — A8)
                if (configName === 'youtube' && matchedConfig.requiresApiParam && !iframe.dataset.esvProcessed) {
                    iframe.dataset.esvProcessed = 'true';
                    this.ensureYouTubeApiEnabled(iframe);
                } else {
                    iframe.dataset.esvProcessed = 'true';
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
                try {
                    iframe.src = src + separator + 'enablejsapi=1';
                } catch (e) {
                    log('Could not enable YouTube JS API:', e);
                }
            }
        },

        muteIframe(iframe, muted) {
            const cfg = iframe._stmConfig;
            if (!cfg) return;

            if (cfg.useFallback) {
                this.tryDirectIframeMute(iframe, muted);
                return;
            }

            if (cfg.getMuteCommand) {
                try {
                    const message = cfg.getMuteCommand(muted);
                    iframe.contentWindow?.postMessage(message, cfg.targetOrigin);
                    // Wildcard fallback for cross-origin
                    iframe.contentWindow?.postMessage(message, '*');
                } catch (e) {
                    log('postMessage failed for iframe:', e);
                }
            }
        },

        tryDirectIframeMute(iframe, muted) {
            try {
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
            this._observer = new MutationObserver(mutations => {
                for (const m of mutations) {
                    for (const node of m.addedNodes) {
                        if (node.nodeType !== 1) continue; // skip non-elements
                        const tag = node.nodeName;
                        if (tag === 'VIDEO' || tag === 'AUDIO') {
                            this.track(node);
                        } else if (tag === 'IFRAME') {
                            this.trackIframe(node);
                        } else if (node.querySelectorAll) {
                            // Cheap heuristic: only scan subtree if it might contain media
                            const html = node.outerHTML || '';
                            if (html.indexOf('<video') >= 0 || html.indexOf('<audio') >= 0) {
                                node.querySelectorAll('video, audio').forEach(el => this.track(el));
                            }
                            if (html.indexOf('<iframe') >= 0) {
                                node.querySelectorAll('iframe').forEach(iframe => this.trackIframe(iframe));
                            }
                        }
                    }
                }
            });
            this._observer.observe(document.documentElement, { childList: true, subtree: true });
        },

        updateState() {
            // Enforce mute state — but only resend iframe commands when state changes
            // OR every 5s as a heartbeat to combat sites that override.
            if (myRole !== 'idle' && muteLazyloadActivated) {
                this.elements.forEach(el => {
                    if (el.muted !== myIsMuted) el.muted = myIsMuted;
                });
                const now = Date.now();
                const stateChanged = this._lastMuteSent !== myIsMuted;
                const heartbeatDue = (now - this._lastMuteSentAt) > 5000;
                if (this.iframes.size > 0 && (stateChanged || heartbeatDue)) {
                    this.muteAllIframes(myIsMuted);
                    this._lastMuteSent = myIsMuted;
                    this._lastMuteSentAt = now;
                }
            }

            let active = false;

            // Check native video/audio elements
            for (const el of this.elements) {
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

            // Apply to all iframes immediately (force regardless of heartbeat)
            this.muteAllIframes(newMutedState);
            this._lastMuteSent = newMutedState;
            this._lastMuteSentAt = Date.now();

            // Apply mute state to all tracked media elements
            this.elements.forEach(el => {
                el.muted = newMutedState;
            });

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
    }

    function setRole(role, id = null, joinExisting = false, lastTs = 0) {
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
            registerKnownSource(groupId);
            GM_setValue(KEY_LATEST_SOURCE, { sourceId: groupId, timestamp: Date.now() });

            // Broadcast notification for new source if not joining existing
            if (!joinExisting) {
                broadcastRoleNotification(groupId, 'source', myInstanceId);
            }
        } else if (role === 'target') {
            if (!id) { Notify.error('Cannot become Target without a Source ID.'); return; }
            saveState('target', id, lastTs);
            // Broadcast notification when target joins
            broadcastRoleNotification(id, 'target', myInstanceId);
        } else if (role === 'playlist') {
            if (!id) { Notify.error('Cannot become Playlist without a Source ID.'); return; }
            saveState('playlist', id, lastTs);
            // Broadcast notification when playlist joins
            broadcastRoleNotification(id, 'playlist', myInstanceId);
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
        }

        // Clean up tab-specific storage when disconnecting
        if (myRole !== 'idle' && myId) {
            GM_deleteValue(getMuteStateKey(myId, myRole));
            GM_deleteValue(getLazyloadKey(myId, myRole));
            GM_deleteValue(getPlaylistKey(myId));
            GM_deleteValue(getPlaylistIndexKey(myId));
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
            e.preventDefault();
            e.stopPropagation();

            if (myRole === 'playlist') {
                addToPlaylist(url);
            } else {
                // ALWAYS navigate the current tab, regardless of role (S or T).
                // This maintains the existing user expectation of local navigation.
                window.location.href = url;
            }
        }
    }

    // --- Role Drag & Drop (Native API) ---
    //
    // BACKGROUND on the "stuck cyan + dead clicks" bug
    // ------------------------------------------------
    // HTML5 drag/drop is famously fragile across browser windows. When the user drags
    // the S/T/P icon and drops it onto another browser tab/window:
    //   1. Source window may NOT receive a `drop` event (drop lands on the OTHER window).
    //   2. `dragend` SHOULD fire on the drag-source element, but Chrome can delay or
    //      skip it if the drop target rejected the drop.
    //   3. The `mouseup` that ended the drag is consumed by the OTHER window — the source
    //      window's last input was a `mousedown` that never closed, so any subsequent
    //      `click` (which requires a complete down→up→click sequence) can fail silently
    //      on some pages.
    //   4. `handleGlobalDragOver` keeps `preventDefault()`-ing on every `dragover` tick
    //      while a drag is in flight, which is required to allow drop but makes the dot
    //      feel sticky.
    //
    // FIX: explicit `_esvDragInFlight` boolean + 7 redundant clear paths +
    //      synthetic `mouseup` dispatch on `dragend` to unfreeze any waiting page logic.
    let _esvDragInFlight = false;
    let _esvDragWatchdog = null;
    let _esvDragStartedAt = 0;

    function _esvClearDragVisuals() {
        if (ui && ui.dot) {
            ui.dot.classList.remove('stm-global-drag-over');
            ui.dot.classList.remove('stm-drag-over');
        }
        if (_esvDragWatchdog) {
            clearTimeout(_esvDragWatchdog);
            _esvDragWatchdog = null;
        }
        if (_esvDragInFlight) {
            _esvDragInFlight = false;
            _esvDispatchSyntheticMouseUp();
        }
    }

    function _esvArmDragWatchdog() {
        if (_esvDragWatchdog) clearTimeout(_esvDragWatchdog);
        // 250ms with no `dragover` tick → drag has effectively ended outside our window.
        _esvDragWatchdog = setTimeout(_esvClearDragVisuals, 250);
    }

    // Synthesize a `mouseup` on the document so any page logic waiting for the
    // mouseup that was consumed by the OTHER window gets unfrozen.
    function _esvDispatchSyntheticMouseUp() {
        try {
            const evt = new MouseEvent('mouseup', {
                bubbles: true, cancelable: true, view: window, button: 0
            });
            (document.activeElement || document.body || document.documentElement).dispatchEvent(evt);
            // Also a pointerup for modern stacks (React DnD, dnd-kit, Framer Motion).
            if (typeof PointerEvent !== 'undefined') {
                const pevt = new PointerEvent('pointerup', {
                    bubbles: true, cancelable: true, view: window,
                    button: 0, pointerType: 'mouse', isPrimary: true
                });
                (document.activeElement || document.body || document.documentElement).dispatchEvent(pevt);
            }
        } catch (e) { /* best-effort */ }
    }

    function handleRoleDragStart(e) {
        if (myRole === 'idle') {
            return;
        }
        _esvDragInFlight = true;
        _esvDragStartedAt = Date.now();
        const payload = {
            sourceId: myId,
            role: myRole,
            instanceId: myInstanceId,
            timestamp: _esvDragStartedAt
        };
        e.dataTransfer.setData('application/stm-role-request', JSON.stringify(payload));
        // Fallback for cross-browser/process compatibility
        e.dataTransfer.setData('text/plain', `STM_ROLE:${JSON.stringify(payload)}`);
        e.dataTransfer.effectAllowed = 'copyMove';
        // Hard upper bound: no drag should ever take longer than 30s. If we're still
        // "in flight" after that, force-clear regardless of what events did or didn't fire.
        setTimeout(() => {
            if (_esvDragInFlight && Date.now() - _esvDragStartedAt >= 30000) {
                _esvClearDragVisuals();
            }
        }, 30000);
    }

    function handleGlobalDragOver(e) {
        if (e.dataTransfer.types.includes('application/stm-role-request') ||
            (e.dataTransfer.types.includes('text/plain') && e.dataTransfer.getData('text/plain').startsWith('STM_ROLE:'))) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (ui && ui.dot) ui.dot.classList.add('stm-global-drag-over');
            _esvArmDragWatchdog();
        }
    }

    function handleGlobalDragLeave(e) {
        // Only clear when the drag ACTUALLY leaves the document (relatedTarget is null
        // or pointer at viewport edge). Otherwise crossing internal element boundaries
        // would prematurely strip the cyan during a still-in-flight drag.
        const rt = e.relatedTarget;
        const leftDocument = !rt ||
            e.clientX <= 0 || e.clientY <= 0 ||
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight;
        if (leftDocument) {
            // Don't fully clear — drag may still be in flight in another window. Just
            // remove the visual; the watchdog or dragend will finish the job.
            if (ui && ui.dot) ui.dot.classList.remove('stm-global-drag-over');
        }
    }

    function handleGlobalDrop(e) {
        _esvClearDragVisuals();
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
                    if (myRole === 'playlist') {
                        setRole('playlist', data.sourceId);
                    } else {
                        setRole('target', data.sourceId);
                    }
                } else if (data.role === 'target' || data.role === 'playlist') {
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
        // Bail on non-primary buttons or modifier keys (explicit "open-in-new-tab" gestures).
        // NOTE: do NOT bail on target="_blank" — many gallery / portfolio sites
        // (e.g. ArtStation) mark every link _blank, and the whole point of pairing
        // is to redirect those clicks into the Target tab.
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.href;
        if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
        // Skip download links (user wants the file locally, not on target).
        if (link.hasAttribute('download')) return;
        // Capture link text/title for richer playlist entries downstream
        const linkTitle = (link.title || link.textContent || '').trim().slice(0, 200) || null;
        // Only intercept if we can publish; otherwise let the navigation proceed normally.
        try {
            publishNavigation(href, linkTitle);
            e.preventDefault(); e.stopPropagation();
            pulseDot();
            // First-time confirmation (per-page-load) so the user understands the click
            // was captured and forwarded — fixes the "page seems unresponsive" perception.
            if (!handleLinkClick._confirmed) {
                handleLinkClick._confirmed = true;
                Notify.info('Link sent to Target tab', 'Forwarded');
            }
        } catch (err) {
            // If publishing fails for any reason, fall back to normal navigation.
        }
    }

    function matchesKeyConfig(event, keyConfig) {
        return event.button === keyConfig.button && event.ctrlKey === keyConfig.ctrl && event.altKey === keyConfig.alt && event.shiftKey === keyConfig.shift;
    }

    // --- Multi-source picker UI (C6) ---
    function showSourcePicker(x, y, asRole) {
        if (window !== window.top) return;
        // Remove any existing
        const existing = document.getElementById('stm-source-picker');
        if (existing) existing.remove();

        const sources = getActiveKnownSources();
        if (sources.length === 0) {
            Notify.warning('No active Source tab found.');
            return;
        }
        if (sources.length === 1) {
            setRole(asRole, sources[0].id);
            return;
        }

        const picker = document.createElement('div');
        picker.id = 'stm-source-picker';
        picker.classList.add('esv-theme-auto');
        picker.style.left = `${Math.min(x, window.innerWidth - 280)}px`;
        picker.style.top = `${Math.min(y, window.innerHeight - 200)}px`;

        const head = document.createElement('div');
        head.className = 'esv-picker-head';
        head.textContent = `Pick a Source to ${asRole === 'target' ? 'follow' : 'add'}`;
        picker.appendChild(head);

        // Sort newest first
        const sorted = sources.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        sorted.forEach(s => {
            const row = document.createElement('div');
            row.className = 'esv-picker-item';
            const titleEl = document.createElement('div');
            titleEl.className = 'esv-picker-item-title';
            titleEl.textContent = s.title || s.hostname || s.id;
            const meta = document.createElement('div');
            meta.className = 'esv-picker-meta';
            const ageMin = Math.max(0, Math.floor((Date.now() - (s.timestamp || 0)) / 60000));
            meta.textContent = `${s.hostname || 'unknown'} · group ${s.id.slice(-4)} · ${ageMin}m ago`;
            row.append(titleEl, meta);
            row.addEventListener('click', () => {
                picker.remove();
                setRole(asRole, s.id, asRole === 'source');
            });
            picker.appendChild(row);
        });

        document.body.appendChild(picker);

        // Dismiss on outside click / esc
        const dismiss = (e) => {
            if (e.type === 'keydown' && e.key !== 'Escape') return;
            if (e.type === 'click' && picker.contains(e.target)) return;
            picker.remove();
            window.removeEventListener('click', dismiss, true);
            window.removeEventListener('keydown', dismiss, true);
        };
        setTimeout(() => {
            window.addEventListener('click', dismiss, true);
            window.addEventListener('keydown', dismiss, true);
        }, 0);
    }

    function attachRoleSpecificListeners() {
        activeListeners.forEach(listenerId => {
            try { GM_removeValueChangeListener(listenerId); } catch (e) { /* ignore */ }
        });
        activeListeners = [];
        if (myRole === 'idle' || !myId) return;
        const disconnectListener = GM_addValueChangeListener(getDisconnectKey(myId), (k, o, n, r) => {
            if (r) {
                // Clean tab-specific keys before going idle so stale state doesn't resurrect
                if (myRole !== 'idle' && myId) {
                    try {
                        GM_deleteValue(getMuteStateKey(myId, myRole));
                        GM_deleteValue(getLazyloadKey(myId, myRole));
                    } catch (e) { /* ignore */ }
                }
                saveState('idle', null, 0, null);
            }
        });
        activeListeners.push(disconnectListener);

        const globalResetListener = GM_addValueChangeListener(KEY_GLOBAL_RESET, (k, o, n, r) => {
            if (r) saveState('idle', null, 0, null);
        });
        activeListeners.push(globalResetListener);

        // Listen for role notifications in the same connection
        if (myId) {
            const roleNotificationListener = GM_addValueChangeListener(getRoleNotificationKey(myId), (k, o, n, r) => {
                if (r && n && n.tabId !== myInstanceId) {
                    const notifications = (config && config.notifications) || DEFAULT_CONFIG.notifications;

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
        }
        if (myRole === 'target') {
            // Some managers may not flag `remote` reliably; rely on timestamp monotonicity instead.
            const urlListener = GM_addValueChangeListener(getTimestampKey(myId), (k, o, n) => {
                if (n > myLastTs) {
                    const url = GM_getValue(getTargetUrlKey(myId));
                    if (!url) return;
                    pulseDot();
                    saveState('target', myId, n);
                    window.location.href = url;
                }
            });
            activeListeners.push(urlListener);

            // Initial Check for missed updates (Latency/Race condition fix)
            const serverTs = GM_getValue(getTimestampKey(myId), 0);
            if (serverTs > myLastTs) {
                const url = GM_getValue(getTargetUrlKey(myId));
                if (url) {
                    pulseDot();
                    saveState('target', myId, serverTs);
                    window.location.href = url;
                }
            }
        } else if (myRole === 'playlist') {
            const urlListener = GM_addValueChangeListener(getTimestampKey(myId), (k, o, n) => {
                if (n > myLastTs) {
                    const url = GM_getValue(getTargetUrlKey(myId));
                    const title = GM_getValue(getTargetTitleKey(myId), null);
                    if (url) {
                        addToPlaylist(url, title);
                        saveState('playlist', myId, n);
                    }
                }
            });
            activeListeners.push(urlListener);

            // Initial Check for missed updates
            const serverTs = GM_getValue(getTimestampKey(myId), 0);
            if (serverTs > myLastTs) {
                const url = GM_getValue(getTargetUrlKey(myId));
                const title = GM_getValue(getTargetTitleKey(myId), null);
                if (url) {
                    addToPlaylist(url, title);
                    saveState('playlist', myId, serverTs);
                }
            }
        }
    }

    // --- SPA & YouTube Navigation Support ---
    function waitForShortsPlayer() {
        // Only relevant on YouTube — avoid burning CPU on every site
        const host = (window.location && window.location.hostname) || '';
        if (!/(?:^|\.)youtube\.com$/.test(host) && !/(?:^|\.)youtube-nocookie\.com$/.test(host)) {
            return;
        }
        const checkPlayer = () => {
            const player = document.querySelector('#shorts-player') ||
                document.querySelector('video[is-shorts]') ||
                document.querySelector('ytd-shorts') ||
                document.querySelector('#movie_player video');

            if (player && !player.dataset.esvRestarted) {
                player.dataset.esvRestarted = 'true';
                if (stateLoaded && myRole !== 'idle') {
                    log('Player detected – refreshing UI');
                    updateUI();
                }
            }
        };

        const appRoot = document.querySelector('ytd-app') || document.body;
        if (appRoot) {
            const observer = new MutationObserver(checkPlayer);
            observer.observe(appRoot, { childList: true, subtree: true });
        }

        checkPlayer();
        setInterval(checkPlayer, 2000);
    }

    function initialize() {
        loadConfig();
        loadMuteLazyloadState(); // Load persistent lazyload state
        if (window === window.top) {
            injectStyles();
            checkPlaylistParam();
        }
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
            if (window === window.top) {
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
                        // Multi-source picker if >1 active sources
                        const active = getActiveKnownSources();
                        if (active.length > 1) {
                            showSourcePicker(e.clientX, e.clientY, 'target');
                        } else if (active.length === 1) {
                            setRole('target', active[0].id);
                        } else {
                            const l = GM_getValue(KEY_LATEST_SOURCE, null);
                            if (l) setRole('target', l.sourceId);
                            else Notify.warning('No Source tab found.');
                        }
                    }
                }, true);

                // C5: keyboard shortcuts
                window.addEventListener('keydown', (e) => {
                    const sc = (config && config.shortcuts) || DEFAULT_CONFIG.shortcuts;
                    // Esc closes panels
                    if (sc.esc && e.key === 'Escape') {
                        let consumed = false;
                        if (configPanel && configPanel.panel.style.display === 'block') {
                            hideConfigPanel(); consumed = true;
                        }
                        if (ui && ((ui.menu && ui.menu.style.display === 'block') ||
                            (ui.playlistPanel && ui.playlistPanel.style.display === 'block'))) {
                            hideMenu(); consumed = true;
                        }
                        const picker = document.getElementById('stm-source-picker');
                        if (picker) { picker.remove(); consumed = true; }
                        if (consumed) e.preventDefault();
                    }
                    // Ctrl+Alt+M mute
                    if (sc.mute && e.ctrlKey && e.altKey && !e.shiftKey && (e.key === 'm' || e.key === 'M')) {
                        if (myRole !== 'idle') {
                            e.preventDefault();
                            mediaManager.toggleMute();
                        }
                    }
                    // Ctrl+Alt+ArrowRight / ArrowLeft playlist nav
                    if (sc.playlistNav && e.ctrlKey && e.altKey && !e.shiftKey && myRole === 'playlist') {
                        if (e.key === 'ArrowRight') { e.preventDefault(); navigatePlaylist('next'); }
                        else if (e.key === 'ArrowLeft') { e.preventDefault(); navigatePlaylist('prev'); }
                    }
                    // Ctrl+Alt+R revoke
                    if (sc.revokeRole && e.ctrlKey && e.altKey && !e.shiftKey && (e.key === 'r' || e.key === 'R')) {
                        if (myRole !== 'idle') {
                            e.preventDefault();
                            revokeRole();
                        }
                    }
                }, true);

                // C7: BroadcastChannel listener (low-latency target nav fast-path)
                if (bc) {
                    bc.addEventListener('message', (ev) => {
                        const msg = ev.data;
                        if (!msg || msg.from === myInstanceId) return;
                        if (msg.type === 'navigate' && msg.groupId === myId && myRole === 'target') {
                            if (msg.ts > myLastTs && msg.url) {
                                pulseDot();
                                saveState('target', myId, msg.ts);
                                window.location.href = msg.url;
                            }
                        }
                        if (msg.type === 'navigate' && msg.groupId === myId && myRole === 'playlist') {
                            if (msg.ts > myLastTs && msg.url) {
                                addToPlaylist(msg.url, msg.title || null);
                                saveState('playlist', myId, msg.ts);
                            }
                        }
                    });
                }
            }

            // Listen for fullscreen changes to hide/show UI
            document.addEventListener('fullscreenchange', () => updateUI());

            // --- SPA Support Listeners ---
            document.addEventListener('yt-navigate-finish', () => {
                setTimeout(waitForShortsPlayer, 300);
                if (stateLoaded && myRole !== 'idle') updateUI();
            });

            window.addEventListener('popstate', () => {
                if (stateLoaded && myRole !== 'idle') updateUI();
            });

            waitForShortsPlayer();
        });
    }

    initialize();

    log('Script initialized');

})();
