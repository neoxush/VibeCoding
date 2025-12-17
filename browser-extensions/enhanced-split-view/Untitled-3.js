// enhanced-split-view/enhanced-split-view-for-chrome.user.js

// ... (previous code)

function initialize() {
    // ...

    loadState().then(s => {
        // ...
        
        // BEFORE: Listening for the broadcast and checking coordinates
        GM_addValueChangeListener(KEY_DRAG_PAIR_REQUEST, (key, oldVal, newVal, remote) => {
            if (!remote || !stateLoaded || myRole !== 'idle' || !newVal || document.hidden) return;
            const { dropX, dropY, sourceId, timestamp } = newVal;
            // ... (timeout and coordinate checks)

            // The critical, and sometimes unreliable, part:
            if (isDropInsideThisWindow(dropX, dropY)) {
                setRole('target', sourceId);
            }
        });
        
        // ...
    });
}

// ... (rest of the code)
