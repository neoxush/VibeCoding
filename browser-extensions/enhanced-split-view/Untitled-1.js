// enhanced-split-view/enhanced-split-view-for-chrome.user.js

// ... (previous code)

function handleDragEnd(e) {
    window.removeEventListener('mousemove', handleDragMove);
    if (dragState.isClick) {
        toggleMenu();
    } else if (myRole === 'source') {
        // BEFORE: Broadcasting a "request" with screen coordinates
        GM_setValue(KEY_DRAG_PAIR_REQUEST, {
            sourceId: myId,
            timestamp: Date.now(),
            dropX: e.screenX, // <-- The X coordinate of the drop
            dropY: e.screenY  // <-- The Y coordinate of the drop
        });
    } else if (myRole === 'target') {
        // ... (similar logic for target-to-source)
    }
    ui.dot.style.cursor = 'grab';
    dragState = {};
}

// ... (rest of the code)
