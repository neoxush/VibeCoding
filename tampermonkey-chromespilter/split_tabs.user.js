// ==UserScript==
// @name         Split Tab Manager
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Link two tabs: one as Source (sends links), one as Target (opens links)
// @author       You
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // Configuration Keys
    const KEY_TARGET_URL = 'split_tab_target_url';
    const KEY_TIMESTAMP = 'split_tab_timestamp';
    const KEY_SOURCE_HEARTBEAT = 'split_tab_source_heartbeat';
    const SESSION_KEY_MODE = 'split_tab_mode'; // Persist mode in this tab

    // Local State
    let currentMode = sessionStorage.getItem(SESSION_KEY_MODE) || 'idle'; // 'idle', 'source', 'target'
    let statusIndicator = null;
    let autoJoinBtn = null;

    // --- Styles ---
    GM_addStyle(`
        #split-tab-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 99999;
            display: flex; justify-content: center; align-items: center;
        }
        #split-tab-modal {
            background: #222; color: #fff; padding: 25px; border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.4); text-align: center;
            font-family: sans-serif; min-width: 320px;
        }
        #split-tab-modal h2 { margin-top: 0; font-size: 20px; margin-bottom: 15px; }
        #split-tab-modal p { color: #ccc; margin-bottom: 20px; line-height: 1.4; }
        .split-btn {
            background: #444; color: #fff; border: 1px solid #555;
            padding: 12px 24px; margin: 8px; cursor: pointer;
            border-radius: 6px; font-size: 14px; transition: all 0.2s;
            font-weight: bold;
        }
        .split-btn:hover { background: #555; transform: translateY(-1px); }
        .split-btn.source { background: #28a745; border-color: #1e7e34; }
        .split-btn.source:hover { background: #218838; }
        .split-btn.target { background: #007bff; border-color: #0069d9; }
        .split-btn.target:hover { background: #0069d9; }
        .split-btn.cancel { background: transparent; border: 1px solid #666; color: #aaa; }
        .split-btn.cancel:hover { background: #333; color: #fff; }
        .split-btn.reset { background: #dc3545; border-color: #bd2130; margin-top: 15px; font-size: 12px; padding: 8px 16px; }
        .split-btn.reset:hover { background: #c82333; }
        
        #split-status-indicator {
            position: fixed; bottom: 20px;
            padding: 8px 16px; 
            font-family: sans-serif; font-size: 13px; font-weight: bold;
            z-index: 99998; cursor: pointer; user-select: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s;
            display: flex; align-items: center;
        }
        #split-status-indicator:hover { transform: scale(1.05); }
        .status-dot {
            display: inline-block; width: 10px; height: 10px;
            border-radius: 50%; margin-right: 8px;
        }
        
        /* Alignment Rules */
        .mode-source { 
            background: #28a745; color: #fff; 
            right: 0; left: auto; 
            border-radius: 20px 0 0 20px; /* Rounded left side */
            margin-right: -5px; /* Stick to edge */
        }
        .mode-target { 
            background: #007bff; color: #fff; 
            left: 0; right: auto; 
            border-radius: 0 20px 20px 0; /* Rounded right side */
            margin-left: -5px; /* Stick to edge */
        }
        
        .dot-source { background: #fff; }
        .dot-target { background: #fff; }

        #split-autojoin-btn {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: #007bff; color: #fff; padding: 10px 20px;
            border-radius: 30px; font-family: sans-serif; font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,123,255,0.4);
            cursor: pointer; z-index: 99998;
            animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
    `);

    // --- UI Functions ---

    function showConfigOverlay() {
        if (document.getElementById('split-tab-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'split-tab-overlay';
        overlay.innerHTML = `
            <div id="split-tab-modal">
                <h2>Split Tab Manager</h2>
                <p>Link this tab with another to split your workflow.</p>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="split-btn source" id="btn-set-source">Set as SOURCE</button>
                    <button class="split-btn target" id="btn-set-target">Set as TARGET</button>
                    <button class="split-btn cancel" id="btn-cancel">Cancel / Disable</button>
                </div>
                <button class="split-btn reset" id="btn-reset">⚠️ Reset Global State</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-set-source').onclick = () => setMode('source');
        document.getElementById('btn-set-target').onclick = () => setMode('target');
        document.getElementById('btn-cancel').onclick = () => setMode('idle');
        document.getElementById('btn-reset').onclick = resetGlobalState;
    }

    function closeOverlay() {
        const overlay = document.getElementById('split-tab-overlay');
        if (overlay) overlay.remove();
    }

    function updateStatusIndicator() {
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.id = 'split-status-indicator';
            statusIndicator.title = 'Click to configure';
            statusIndicator.onclick = showConfigOverlay;
            document.body.appendChild(statusIndicator);
        }

        if (currentMode === 'idle') {
            statusIndicator.style.display = 'none';
        } else {
            statusIndicator.style.display = 'flex';
            statusIndicator.className = `mode-${currentMode}`;
            // Removed directional text as requested
            const label = currentMode === 'source' ? 'SOURCE' : 'TARGET';
            statusIndicator.innerHTML = `<span class="status-dot dot-${currentMode}"></span>${label}`;

            // Hide auto-join button if we are in a mode
            if (autoJoinBtn) autoJoinBtn.style.display = 'none';
        }
    }

    function showAutoJoinButton() {
        if (currentMode !== 'idle' || document.getElementById('split-autojoin-btn')) return;

        autoJoinBtn = document.createElement('div');
        autoJoinBtn.id = 'split-autojoin-btn';
        autoJoinBtn.innerHTML = '🔗 Join as Target?';
        autoJoinBtn.onclick = () => {
            setMode('target');
            autoJoinBtn.remove();
        };
        document.body.appendChild(autoJoinBtn);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (autoJoinBtn) autoJoinBtn.remove();
        }, 10000);
    }

    // --- Logic ---

    function setMode(mode) {
        currentMode = mode;
        if (mode === 'idle') {
            sessionStorage.removeItem(SESSION_KEY_MODE);
        } else {
            sessionStorage.setItem(SESSION_KEY_MODE, mode);
        }
        closeOverlay();
        updateStatusIndicator();
    }

    function resetGlobalState() {
        if (confirm("This will clear all Source/Target connections. Continue?")) {
            GM_setValue(KEY_TARGET_URL, '');
            GM_setValue(KEY_TIMESTAMP, 0);
            GM_setValue(KEY_SOURCE_HEARTBEAT, 0);
            setMode('idle');
            alert("Global state reset.");
        }
    }

    // 1. Source Logic: Intercept Clicks & Heartbeat
    function handleLinkClick(e) {
        if (currentMode !== 'source') return;

        const link = e.target.closest('a');
        if (!link || !link.href) return;

        if (link.href.startsWith('javascript:') || link.href.includes('#')) return;

        e.preventDefault();
        e.stopPropagation();

        // Send URL to Target
        GM_setValue(KEY_TARGET_URL, link.href);
        GM_setValue(KEY_TIMESTAMP, Date.now()); // Trigger change event

        // Visual feedback for click
        const originalText = statusIndicator.innerHTML;
        statusIndicator.innerHTML = 'Sent! 🚀';
        setTimeout(() => {
            if (currentMode === 'source') statusIndicator.innerHTML = originalText;
        }, 1000);
    }

    // Heartbeat loop for Source
    setInterval(() => {
        if (currentMode === 'source') {
            GM_setValue(KEY_SOURCE_HEARTBEAT, Date.now());
        }
    }, 2000);

    // 2. Target Logic: Listen for Changes
    GM_addValueChangeListener(KEY_TIMESTAMP, function (key, oldVal, newVal, remote) {
        if (currentMode !== 'target') return;
        if (!remote) return;

        const url = GM_getValue(KEY_TARGET_URL);
        if (url) {
            window.location.href = url;
        }
    });

    // 3. Idle Logic: Check for Source Heartbeat (Immediate & Listener)
    function checkHeartbeat() {
        if (currentMode !== 'idle') return;
        const lastHeartbeat = GM_getValue(KEY_SOURCE_HEARTBEAT, 0);
        if (Date.now() - lastHeartbeat < 5000) { // Source active in last 5s
            showAutoJoinButton();
        }
    }

    if (currentMode === 'idle') {
        checkHeartbeat(); // Check immediately on load

        // Also listen for new heartbeats (if Source starts AFTER this tab opened)
        GM_addValueChangeListener(KEY_SOURCE_HEARTBEAT, function (key, oldVal, newVal, remote) {
            if (remote) checkHeartbeat();
        });
    }

    // Event Listeners
    document.addEventListener('click', handleLinkClick, true);
    GM_registerMenuCommand("Configure Split Tab", showConfigOverlay);

    // Initial Check
    if (currentMode !== 'idle') {
        updateStatusIndicator();
    }

})();
