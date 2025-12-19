// ==UserScript==
// @name         Enhanced Split View for Chrome
// @namespace    http://tampermonkey.net/
// @version      1.0.5
// @description  This scripts adds extra control over Chrome's native split view function, which allows to pin a source tab to open new content on the side.
// @author       https://github.com/neoxush/VibeCoding/tree/master/browser-extensions/enhanced-split-view
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @match        *://*/*
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
// @grant        GM_notification
// ==/UserScript==

(function () {
    'use strict';

    // --- Sound Guard (Early Mute Enforcement) ---
    (function applySoundGuard() {
        const origPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            if (window.stmIsMuted) this.muted = true;
            return origPlay.apply(this, arguments);
        };

        const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
        if (desc) {
            Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
                get() { return desc.get.call(this); },
                set(v) {
                    if (window.stmIsMuted && v === false) return desc.set.call(this, true);
                    return desc.set.call(this, v);
                },
                configurable: true
            });
        }

        const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
        if (OriginalAudioContext) {
            const WrappedContext = function () {
                const ctx = new OriginalAudioContext(...arguments);
                if (window.stmIsMuted && ctx.suspend) ctx.suspend();
                return ctx;
            };
            WrappedContext.prototype = OriginalAudioContext.prototype;
            for (let prop in OriginalAudioContext) {
                if (OriginalAudioContext.hasOwnProperty(prop)) WrappedContext[prop] = OriginalAudioContext[prop];
            }
            window.AudioContext = window.webkitAudioContext = WrappedContext;
        }
    })();

    // --- Constants & Config ---
    const GM_PREFIX = 'stm_gm_v18_';
    const KEY_LATEST_SOURCE = `${GM_PREFIX}latest_source`;
    const KEY_CONFIG = `${GM_PREFIX}config`;
    const KEY_GLOBAL_RESET = `${GM_PREFIX}global_reset`;
    const getTargetUrlKey = (id) => `${GM_PREFIX}url_${id}`;
    const getTimestampKey = (id) => `${GM_PREFIX}ts_${id}`;
    const getDisconnectKey = (id) => `${GM_PREFIX}disconnect_${id}`;
    const getSourceListKey = (id) => `${GM_PREFIX}sources_${id}`;
    const getTabStateKey = (tid) => `${GM_PREFIX}tab_state_${tid}`;
    const getHeartbeatKey = (id, inst) => `${GM_PREFIX}hb_${id}_${inst}`;

    const DEFAULT_CONFIG = {
        sourceKey: { button: 1, ctrl: true, alt: false, shift: false },
        targetKey: { button: 1, ctrl: false, alt: true, shift: false }
    };

    // --- State ---
    const generateId = () => Math.random().toString(36).substring(2, 11);
    const myInstanceId = generateId();
    let myRole = 'idle';
    let myId = null;
    let myLastTs = 0;
    let mySourceTabId = null;
    let myIsMuted = false;
    let stateLoaded = false;
    let ui = null;
    let activeListeners = [];
    let config = null;
    let lastUrl = window.location.href;
    let isDraggingLink = false;

    let myTabId = sessionStorage.getItem('stm_tab_id');
    if (!myTabId) {
        myTabId = generateId();
        sessionStorage.setItem('stm_tab_id', myTabId);
    }

    window.stmIsMuted = false;

    // --- Persistence ---
    function primeStateFromWindowName() {
        try {
            let payload = null;
            if (window.name && window.name.startsWith('{"stmRole"')) payload = window.name;
            if (!payload) payload = sessionStorage.getItem('stm_state');
            const parsed = JSON.parse(payload || '{}');
            if (parsed.stmRole && parsed.stmId) {
                myRole = parsed.stmRole; myId = parsed.stmId; myLastTs = parsed.stmLastTs || 0;
                mySourceTabId = parsed.stmSourceTabId; myIsMuted = parsed.stmIsMuted || false;
                window.stmIsMuted = myIsMuted;
            }
        } catch (err) { /* ignore */ }
    }
    primeStateFromWindowName();

    function saveState(role, id, lastTs = 0, sourceTabId = null, isMuted = null) {
        const roleChanged = myRole !== role;
        const muteChanged = isMuted !== null && myIsMuted !== isMuted;

        myRole = role; myId = id; myLastTs = lastTs; mySourceTabId = sourceTabId;
        if (myRole === 'idle') myIsMuted = false;
        else if (isMuted !== null) myIsMuted = isMuted;
        window.stmIsMuted = myIsMuted;

        if (mediaManager && mediaManager.elements) {
            mediaManager.elements.forEach(el => { if (el.muted !== myIsMuted) el.muted = myIsMuted; });
        }

        const state = { role: myRole, id: myId, lastTs: myLastTs, sourceTabId: mySourceTabId, isMuted: myIsMuted };
        GM_saveTab(state);
        GM_setValue(getTabStateKey(myTabId), state);

        try {
            const payload = { stmRole: myRole, stmId: myId, stmLastTs: myLastTs, stmSourceTabId: mySourceTabId, stmIsMuted: myIsMuted };
            const json = JSON.stringify(payload);
            if (!window.name || window.name.startsWith('{"stmRole"')) window.name = json;
            sessionStorage.setItem('stm_state', json);
        } catch (err) { /* ignore */ }

        updateUI();
        attachRoleSpecificListeners();

        if (roleChanged && role !== 'idle') showToast(`Tab is now ${role.toUpperCase()}`);
        if (muteChanged) showToast(myIsMuted ? "Sound Guard Active" : "Audio Restored");
    }

    function loadState() {
        return new Promise((resolve) => {
            GM_getTab((tab) => {
                if (tab && tab.role) resolve(tab);
                else {
                    const backup = GM_getValue(getTabStateKey(myTabId), null);
                    resolve(backup || { role: 'idle', id: null, lastTs: 0, sourceTabId: null, isMuted: false });
                }
            });
        });
    }

    // --- UI ---
    function injectStyles() {
        GM_addStyle(`
            @keyframes stm-pulse { 0% {transform: scale(1);} 50% {transform: scale(1.2);} 100% {transform: scale(1);} }
            .stm-pulse-animate { animation: stm-pulse 0.5s ease-out; }
            #stm-ui-container { position: fixed; top: 85px; z-index: 2147483647; user-select: none; display: flex; align-items: center; justify-content: center; gap: 5px; }
            #stm-ui-container.stm-side-right { right: 0; flex-direction: row; }
            #stm-ui-container.stm-side-left { left: 0; flex-direction: row-reverse; }
            #stm-status-dot { width: 30px; height: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-size: 14px; font-weight: bold; color: white; cursor: grab; transition: transform 0.2s, background-color 0.3s; border: 1px solid rgba(255,255,255,0.5); }
            #stm-ui-container.stm-side-right #stm-status-dot { background-color: #28a745; border-radius: 8px 0 0 8px; border-right: none; }
            #stm-ui-container.stm-side-left #stm-status-dot { background-color: #007bff; border-radius: 0 8px 8px 0; border-left: none; }
            #stm-status-dot.stm-drag-over { background-color: #ffc107 !important; transform: scale(1.2) !important; box-shadow: 0 0 15px #ffc107; }
            #stm-status-dot.stm-global-drag-over { background-color: #17a2b8 !important; transform: scale(1.1); box-shadow: 0 0 10px #17a2b8; }
            #stm-volume-btn { width: 28px; height: 28px; background: rgba(51, 51, 51, 0.9); border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); transition: transform 0.2s; }
            #stm-volume-btn svg { width: 16px !important; height: 16px !important; fill: #fff !important; display: block !important; pointer-events: none !important; }
            #stm-volume-btn .stm-icon-mute, #stm-volume-btn .stm-icon-unmute { display: none !important; }
            #stm-volume-btn.stm-is-muted .stm-icon-mute { display: block !important; }
            #stm-volume-btn:not(.stm-is-muted) .stm-icon-unmute { display: block !important; }
            #stm-menu { display: none; position: absolute; top: 100%; background-color: #333; border-radius: 4px; width: 120px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif; font-size: 12px; }
            #stm-ui-container.stm-side-right #stm-menu { right: 0; }
            #stm-ui-container.stm-side-left #stm-menu { left: 0; }
            .stm-menu-item { padding: 8px 12px; color: #fff; cursor: pointer; }
            .stm-menu-item:hover { background-color: #555; }
            .stm-toast { position: absolute; bottom: 110%; right: 0; background: rgba(0,0,0,0.85); color: #fff; padding: 6px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; white-space: nowrap; opacity: 0; transform: translateY(10px); transition: opacity 0.3s, transform 0.3s; pointer-events: none; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 2147483647; }
            #stm-ui-container.stm-side-left .stm-toast { right: auto; left: 0; }
            .stm-toast.stm-show { opacity: 1; transform: translateY(0); }
        `);
    }

    function showToast(message, duration = 3000) {
        if (!ui || !ui.container) return;
        let toast = ui.container.querySelector('.stm-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'stm-toast';
            ui.container.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('stm-show');
        clearTimeout(toast.timeout);
        toast.timeout = setTimeout(() => toast.classList.remove('stm-show'), duration);
    }

    function showConfigPanel() {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7); z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            font-family: sans-serif; color: white;
        `;

        const panel = document.createElement('div');
        panel.style = `
            background: #222; padding: 25px; border-radius: 12px;
            border: 1px solid #444; width: 350px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        `;

        panel.innerHTML = `
            <h3 style="margin-top:0; color: #28a745;">Configure Shortcuts</h3>
            <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; margin-bottom: 8px; color: #aaa;">Source Tab Key (Ctrl + Middle Click default)</p>
                <div id="stm-config-source" style="display: flex; gap: 5px; align-items: center;">
                    <label><input type="checkbox" data-key="ctrl"> Ctrl</label>
                    <label><input type="checkbox" data-key="alt"> Alt</label>
                    <label><input type="checkbox" data-key="shift"> Shift</label>
                    <select data-key="button" style="background:#333; color:white; border:1px solid #555; border-radius:3px;">
                        <option value="0">Left Click</option>
                        <option value="1">Middle Click</option>
                        <option value="2">Right Click</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom: 25px;">
                <p style="font-size: 14px; margin-bottom: 8px; color: #aaa;">Target Tab Key (Alt + Middle Click default)</p>
                <div id="stm-config-target" style="display: flex; gap: 5px; align-items: center;">
                    <label><input type="checkbox" data-key="ctrl"> Ctrl</label>
                    <label><input type="checkbox" data-key="alt"> Alt</label>
                    <label><input type="checkbox" data-key="shift"> Shift</label>
                    <select data-key="button" style="background:#333; color:white; border:1px solid #555; border-radius:3px;">
                        <option value="0">Left Click</option>
                        <option value="1">Middle Click</option>
                        <option value="2">Right Click</option>
                    </select>
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="stm-config-cancel" style="background: transparent; border: 1px solid #555; color: #ccc; padding: 6px 15px; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="stm-config-save" style="background: #28a745; border: none; color: white; padding: 6px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Settings</button>
            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const load = (id, cfg) => {
            const div = panel.querySelector(`#${id}`);
            div.querySelector('[data-key="ctrl"]').checked = cfg.ctrl;
            div.querySelector('[data-key="alt"]').checked = cfg.alt;
            div.querySelector('[data-key="shift"]').checked = cfg.shift;
            div.querySelector('[data-key="button"]').value = cfg.button;
        };

        const get = (id) => ({
            ctrl: panel.querySelector(`#${id} [data-key="ctrl"]`).checked,
            alt: panel.querySelector(`#${id} [data-key="alt"]`).checked,
            shift: panel.querySelector(`#${id} [data-key="shift"]`).checked,
            button: parseInt(panel.querySelector(`#${id} [data-key="button"]`).value)
        });

        load('stm-config-source', config.sourceKey);
        load('stm-config-target', config.targetKey);

        panel.querySelector('#stm-config-cancel').onclick = () => overlay.remove();
        panel.querySelector('#stm-config-save').onclick = () => {
            config.sourceKey = get('stm-config-source');
            config.targetKey = get('stm-config-target');
            GM_setValue(KEY_CONFIG, config);
            overlay.remove();
            showToast("Settings Saved!");
        };
    }

    function updateUI() {
        if (window !== window.top) return;
        if (!document.body) { window.addEventListener('DOMContentLoaded', updateUI, { once: true }); return; }
        const isFullscreen = !!document.fullscreenElement;

        if (!ui || !document.body.contains(ui.container)) {
            if (!ui) {
                ui = { container: document.createElement('div'), dot: document.createElement('div'), menu: document.createElement('div'), volume: document.createElement('div') };
                ui.container.id = 'stm-ui-container';
                ui.dot.id = 'stm-status-dot';
                ui.menu.id = 'stm-menu';
                ui.volume.id = 'stm-volume-btn';
                ui.volume.innerHTML = `<svg viewBox="0 0 24 24"><path class="stm-icon-mute" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/><path class="stm-icon-unmute" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
                ui.container.append(ui.menu, ui.volume, ui.dot);
                ui.dot.setAttribute('draggable', 'true');
                ui.dot.addEventListener('click', (e) => { if (e.button === 0) toggleMenu(); });
                ui.dot.addEventListener('dragstart', handleRoleDragStart);
                ui.dot.addEventListener('dragover', handleLinkDragOver);
                ui.dot.addEventListener('dragleave', handleLinkDragLeave);
                ui.dot.addEventListener('drop', handleLinkDrop);
                ui.menu.addEventListener('click', handleMenuClick);
                ui.volume.addEventListener('click', () => mediaManager.toggleMute());
                window.addEventListener('dragover', handleGlobalDragOver);
                window.addEventListener('dragleave', handleGlobalDragLeave);
                window.addEventListener('drop', handleGlobalDrop);
            }
            document.body.appendChild(ui.container);
        }

        ui.container.style.setProperty('display', (myRole === 'idle' || isFullscreen) ? 'none' : 'flex', 'important');
        ui.container.classList.remove('stm-side-left', 'stm-side-right');
        ui.container.classList.add(`stm-side-${myRole === 'target' ? 'left' : 'right'}`);
        ui.dot.textContent = myRole === 'source' ? 'S' : (myRole === 'target' ? 'T' : '');

        const hasMedia = mediaManager && mediaManager.hasMedia;
        ui.volume.style.display = (myRole !== 'idle' && (hasMedia || myIsMuted)) ? 'flex' : 'none';
        ui.volume.classList.toggle('stm-is-muted', myIsMuted);

        const contextMenuItems = [{ text: "Revoke", action: "revoke" }, { text: "Disconnect", action: "disconnect" }];
        if (myRole === 'idle' && GM_getValue(KEY_LATEST_SOURCE)) contextMenuItems.unshift({ text: "Join as Source", action: "join-source" });
        ui.menu.innerHTML = contextMenuItems.map(item => `<div class="stm-menu-item" data-action="${item.action}">${item.text}</div>`).join('');
    }

    function toggleMenu() { if (ui && ui.menu) ui.menu.style.display = ui.menu.style.display === 'block' ? 'none' : 'block'; }
    function pulseDot() { if (ui && ui.dot) { ui.dot.classList.add('stm-pulse-animate'); ui.dot.addEventListener('animationend', () => ui.dot.classList.remove('stm-pulse-animate'), { once: true }); } }

    // --- Logic ---
    function publishNavigation(url) {
        if (!myId) return;
        // Check if we should ignore this navigation (e.g. from local drag-drop)
        if (sessionStorage.getItem('stm_ignore_sync') === 'true') {
            sessionStorage.removeItem('stm_ignore_sync');
            return;
        }
        const current = GM_getValue(getTimestampKey(myId), 0);
        const ts = Math.max(Date.now(), current + 1);
        GM_setValue(getTargetUrlKey(myId), url);
        GM_setValue(getTimestampKey(myId), ts);
    }

    const mediaManager = {
        hasMedia: false, elements: new Set(), initialized: false,
        init() { if (this.initialized) return; this.initialized = true; this.scan(); this.observe(); setInterval(() => this.updateState(), 1000); },
        scan() { document.querySelectorAll('video, audio').forEach(el => this.track(el)); },
        track(el) {
            if (this.elements.has(el)) return;
            this.elements.add(el);
            const u = () => this.updateState();
            el.addEventListener('play', u); el.addEventListener('pause', u); el.addEventListener('volumechange', u);
            el.muted = myIsMuted;
        },
        observe() {
            new MutationObserver(ms => {
                for (const m of ms) for (const n of m.addedNodes) {
                    if (n.nodeName === 'VIDEO' || n.nodeName === 'AUDIO') this.track(n);
                    else if (n.querySelectorAll) n.querySelectorAll('video, audio').forEach(e => this.track(e));
                }
            }).observe(document.documentElement, { childList: true, subtree: true });
        },
        updateState() {
            if (myIsMuted) this.elements.forEach(el => { if (!el.muted) el.muted = true; });
            let active = false;
            for (const el of this.elements) if (!el.paused && el.volume > 0 && !el.ended && el.readyState >= 1) { active = true; break; }
            if (active !== this.hasMedia) { this.hasMedia = active; updateUI(); }
        },
        toggleMute() { saveState(myRole, myId, myLastTs, mySourceTabId, !myIsMuted); }
    };

    function setRole(role, id = null, join = false) {
        const gid = id || (join ? null : generateId());
        if (role === 'source') {
            const sid = generateId();
            saveState('source', gid, 0, sid);
            const s = GM_getValue(getSourceListKey(gid), []);
            if (!s.includes(sid)) { s.push(sid); GM_setValue(getSourceListKey(gid), s); }
            GM_setValue(KEY_LATEST_SOURCE, { sourceId: gid, timestamp: Date.now() });
        } else if (role === 'target') {
            saveState('target', gid);
        } else if (role === 'idle') {
            saveState('idle', null, 0, null);
        }
    }

    function handleRoleDragStart(e) {
        if (myRole === 'idle') return;
        const p = { sourceId: myId, role: myRole, instanceId: myInstanceId, timestamp: Date.now() };
        const json = JSON.stringify(p);
        e.dataTransfer.setData('application/stm-role-request', json);
        e.dataTransfer.setData('text/plain', `STM_ROLE:${json}`);
    }

    function handleGlobalDragOver(e) {
        if (e.dataTransfer.types.includes('application/stm-role-request') ||
            (e.dataTransfer.types.includes('text/plain') && e.dataTransfer.getData('text/plain').startsWith('STM_ROLE:'))) {
            e.preventDefault();
            if (ui && ui.dot) {
                ui.container.style.display = 'flex';
                ui.dot.classList.add('stm-global-drag-over');
                showToast("Drop to Pair Tabs", 500);
            }
        }
    }

    function handleGlobalDragLeave() {
        if (ui && ui.dot) {
            ui.dot.classList.remove('stm-global-drag-over');
            if (myRole === 'idle') ui.container.style.display = 'none';
        }
    }

    function handleGlobalDrop(e) {
        if (ui && ui.dot) {
            ui.dot.classList.remove('stm-global-drag-over');
            if (myRole === 'idle') ui.container.style.display = 'none';
        }
        let dataStr = e.dataTransfer.getData('application/stm-role-request');
        if (!dataStr) {
            const plain = e.dataTransfer.getData('text/plain');
            if (plain && plain.startsWith('STM_ROLE:')) dataStr = plain.slice(9);
        }
        if (dataStr) {
            try {
                const d = JSON.parse(dataStr);
                if (d.instanceId !== myInstanceId) {
                    e.preventDefault();
                    stateLoaded = true;
                    setRole(d.role === 'source' ? 'target' : 'source', d.sourceId, d.role === 'target');
                    showToast("Tabs Paired Successfully!");
                }
            } catch (err) { /* ignore */ }
        }
    }

    function handleLinkDragOver(e) { e.preventDefault(); ui.dot.classList.add('stm-drag-over'); }
    function handleLinkDragLeave() { ui.dot.classList.remove('stm-drag-over'); }
    function handleLinkDrop(e) {
        e.preventDefault(); ui.dot.classList.remove('stm-drag-over');
        const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
        if (url && /^https?:\/\//.test(url)) {
            // CRITICAL: Set ignore flag BEFORE navigating to ensure the new page doesn't sync
            sessionStorage.setItem('stm_ignore_sync', 'true');
            lastUrl = url;
            window.location.href = url;
            showToast("Opening Link (Local Only)...");
        }
    }

    function handleMenuClick(e) {
        const a = e.target.dataset.action;
        if (a === 'disconnect') { if (myId) GM_setValue(getDisconnectKey(myId), Date.now()); setRole('idle'); showToast("Disconnected Group"); }
        else if (a === 'revoke') { setRole('idle'); showToast("Role Revoked"); }
        else if (a === 'join-source') { setRole('source', GM_getValue(KEY_LATEST_SOURCE).sourceId, true); showToast("Joined Group as Source"); }
        toggleMenu();
    }

    function handleLinkClick(e) {
        if (myRole !== 'source' || !myId || isDraggingLink) return;
        if (e.button === 2) return; // Right click

        const link = e.target.closest('a[href]');
        if (!link) return;

        const url = link.href;
        if (url.startsWith(window.location.href.split('#')[0] + '#') || url.startsWith('#')) return;

        if (/^https?:\/\//.test(url)) {
            // Check for active targets
            const now = Date.now();
            const keys = GM_listValues();
            const activeTargets = keys.filter(k => k.startsWith(`${GM_PREFIX}hb_${myId}_`))
                .some(k => (now - GM_getValue(k, 0)) < 5000);

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (!activeTargets) {
                showToast("No active Target! Drag 'S' to another tab to pair.", 5000);
            } else {
                publishNavigation(url);
                pulseDot();
                showToast("Syncing to Target...");
            }
        }
    }

    function attachRoleSpecificListeners() {
        activeListeners.forEach(l => {
            if (typeof l === 'number') GM_removeValueChangeListener(l);
            else if (l.stop) l.stop();
        });
        activeListeners = [];
        if (myRole === 'idle' || !myId) return;

        activeListeners.push(GM_addValueChangeListener(getDisconnectKey(myId), (k, o, n, r) => { if (r) saveState('idle', null, 0, null); }));
        activeListeners.push(GM_addValueChangeListener(KEY_GLOBAL_RESET, (k, o, n, r) => { if (r) saveState('idle', null, 0, null); }));

        if (myRole === 'target') {
            // Heartbeat
            const hbKey = getHeartbeatKey(myId, myInstanceId);
            const hbInterval = setInterval(() => GM_setValue(hbKey, Date.now()), 2000);
            activeListeners.push({ stop: () => { clearInterval(hbInterval); GM_deleteValue(hbKey); } });
            window.addEventListener('unload', () => GM_deleteValue(hbKey));

            activeListeners.push(GM_addValueChangeListener(getTimestampKey(myId), (k, o, n) => {
                if (n > myLastTs) { pulseDot(); saveState('target', myId, n); window.location.href = GM_getValue(getTargetUrlKey(myId)); }
            }));
            const s = GM_getValue(getTimestampKey(myId), 0);
            if (s > myLastTs) { saveState('target', myId, s); window.location.href = GM_getValue(getTargetUrlKey(myId)); }
        }
    }

    function initialize() {
        config = GM_getValue(KEY_CONFIG, DEFAULT_CONFIG);
        injectStyles();

        window.addEventListener('click', handleLinkClick, true);
        window.addEventListener('auxclick', handleLinkClick, true);
        window.addEventListener('dragstart', () => { isDraggingLink = true; }, true);
        window.addEventListener('dragend', () => { isDraggingLink = false; }, true);

        setInterval(() => {
            if (myRole === 'source' && window.location.href !== lastUrl) {
                const currentUrl = window.location.href;
                lastUrl = currentUrl;
                publishNavigation(currentUrl);
            }
        }, 500);

        window.addEventListener('yt-navigate-finish', () => {
            if (myRole === 'source' && window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                publishNavigation(lastUrl);
            }
            updateUI();
        });

        window.addEventListener('popstate', () => {
            if (myRole === 'source' && window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                publishNavigation(lastUrl);
            }
        });

        loadState().then(s => {
            if (stateLoaded) return;
            if (myRole === 'idle' && s.role !== 'idle') { myRole = s.role; myId = s.id; myLastTs = s.lastTs; mySourceTabId = s.sourceTabId; myIsMuted = s.isMuted; }
            else if (myRole !== 'idle') { myId = myId || s.id; myLastTs = myLastTs || s.lastTs; mySourceTabId = mySourceTabId || s.sourceTabId; if (!myIsMuted) myIsMuted = s.isMuted; }
            saveState(myRole, myId, myLastTs, mySourceTabId, myIsMuted);
            stateLoaded = true;
            mediaManager.init();

            GM_registerMenuCommand("Configure Keys", showConfigPanel);
            GM_registerMenuCommand("Create Source", () => setRole('source'));
            GM_registerMenuCommand("Reset Roles", () => { GM_listValues().forEach(k => { if (k.startsWith(GM_PREFIX) && k !== KEY_CONFIG) GM_deleteValue(k); }); GM_setValue(KEY_GLOBAL_RESET, Date.now()); saveState('idle', null, 0, null); showToast("System Reset"); });

            window.addEventListener('mousedown', (e) => {
                if (e.button === config.sourceKey.button && e.ctrlKey === config.sourceKey.ctrl && e.altKey === config.sourceKey.alt && e.shiftKey === config.sourceKey.shift) { e.preventDefault(); setRole('source'); }
                else if (e.button === config.targetKey.button && e.ctrlKey === config.targetKey.ctrl && e.altKey === config.targetKey.alt && e.shiftKey === config.targetKey.shift) {
                    const l = GM_getValue(KEY_LATEST_SOURCE); if (l) setRole('target', l.sourceId); else showToast("No Source found. Ctrl+Middle Click a link first!");
                }
            }, true);
            document.addEventListener('fullscreenchange', () => updateUI());
        });
    }

    initialize();
})();
