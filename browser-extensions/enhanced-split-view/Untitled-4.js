// enhanced-split-view/enhanced-split-view-for-chrome.user.js

// ... (previous code)

function initialize() {
    // ...

    loadState().then(s => {
        // ...

        // AFTER: Directly listening for the 'stm-drag-source-request' event
        window.addEventListener('stm-drag-source-request', (e) => {
            if (myRole === 'idle') {
                const { sourceId } = e.detail;
                setRole('target', sourceId);
            }
        });

        // ...
    });
}

// ... (rest of the code)
