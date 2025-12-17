// enhanced-split-view/enhanced-split-view-for-chrome.user.js

// ... (previous code)

function handleDragEnd(e) {
    window.removeEventListener('mousemove', handleDragMove);
    if (dragState.isClick) {
        toggleMenu();
    } else if (myRole === 'source') {
        // AFTER: Firing a direct event to request a new target
        const event = new CustomEvent('stm-drag-source-request', {
            detail: {
                sourceId: myId,
            }
        });
        window.dispatchEvent(event);
    } else if (myRole === 'target') {
        // ... (similar logic for target-to-source)
    }
    ui.dot.style.cursor = 'grab';
    dragState = {};
}

// ... (rest of the code)

