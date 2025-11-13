const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 8080;
const SAVE_INTERVAL = 60000; // Save state every minute
const STATE_FILE = path.join(__dirname, 'checklist-state.json');
const IMAGES_DIR = path.join(__dirname, 'shared_images');

// Create images directory if it doesn't exist
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`Created shared images directory: ${IMAGES_DIR}`);
}

// Server state
let checklist = [];
const clients = new Map(); // Map of userId -> { ws, username, lastActive }
let nextUserId = 1;

// Create HTTP server
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Handle image requests
    if (url.pathname.startsWith('/shared_images/')) {
        const imagePath = path.join(IMAGES_DIR, path.basename(url.pathname));

        // Check if the file exists
        if (fs.existsSync(imagePath)) {
            const contentType = getContentType(imagePath);
            const imageData = fs.readFileSync(imagePath);

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(imageData);
            return;
        }

        // Image not found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Image not found');
        return;
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OpChckList Collaboration Server is running');
});

// Helper function to determine content type based on file extension
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp'
    };

    return contentTypes[ext] || 'application/octet-stream';
}

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Load saved state if exists
try {
    if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        const savedState = JSON.parse(data);
        checklist = savedState.checklist || [];
        nextUserId = savedState.nextUserId || 1;
        console.log(`Loaded state with ${checklist.length} items`);
    }
} catch (error) {
    console.error('Error loading saved state:', error);
}

// Save state periodically
setInterval(saveState, SAVE_INTERVAL);

// Handle WebSocket connections
wss.on('connection', (ws) => {
    const userId = `user_${nextUserId++}`;
    let username = `User ${userId}`;

    console.log(`New connection: ${userId}`);
    console.log(`Active clients: ${clients.size}`);
    console.log(`Current checklist items: ${checklist.length}`);

    // Send welcome message with userId
    ws.send(JSON.stringify({
        type: 'welcome',
        userId: userId,
        timestamp: Date.now()
    }));

    // Handle messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received message from ${userId}:`, data.type);

            // Add userId if not present
            if (!data.userId) {
                data.userId = userId;
            }

            // Update last active timestamp
            if (clients.has(userId)) {
                clients.get(userId).lastActive = Date.now();
            }

            // Handle different message types
            switch (data.type) {
                case 'join':
                    handleJoin(ws, userId, data);
                    break;
                case 'leave':
                    handleLeave(userId, data);
                    break;
                case 'requestState':
                    sendFullState(ws);
                    break;
                case 'itemAdded':
                    handleItemAdded(userId, data);
                    break;
                case 'itemUpdated':
                    handleItemUpdated(userId, data);
                    break;
                case 'itemRemoved':
                    handleItemRemoved(userId, data);
                    break;
                case 'itemStatusChanged':
                    handleItemStatusChanged(userId, data);
                    break;
                case 'startEditing':
                    handleStartEditing(userId, data);
                    break;
                case 'stopEditing':
                    handleStopEditing(userId, data);
                    break;
                case 'shareImage':
                    handleShareImage(userId, data);
                    break;
                case 'resetAll':
                    handleResetAll(userId);
                    break;
                default:
                    console.warn(`Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log(`Connection closed: ${userId}`);

        if (clients.has(userId)) {
            const client = clients.get(userId);

            // Broadcast user left message
            broadcastToOthers(userId, {
                type: 'userLeft',
                userId: userId,
                timestamp: Date.now()
            });

            // Remove client
            clients.delete(userId);

            // Save state
            saveState();

            // Update active users list
            broadcastActiveUsers();
        }
    });
});

// Message handlers
function handleJoin(ws, userId, data) {
    const username = data.username || `User ${userId}`;

    // Store client info
    clients.set(userId, {
        ws,
        username,
        lastActive: Date.now()
    });

    console.log(`User joined: ${username} (${userId})`);

    // Broadcast user joined message
    broadcastToOthers(userId, {
        type: 'userJoined',
        userId: userId,
        username: username,
        timestamp: Date.now()
    });

    // Update active users list
    broadcastActiveUsers();
}

function handleLeave(userId, data) {
    if (clients.has(userId)) {
        const client = clients.get(userId);
        console.log(`User left: ${client.username} (${userId})`);

        // Broadcast user left message
        broadcastToOthers(userId, {
            type: 'userLeft',
            userId: userId,
            timestamp: Date.now()
        });

        // Client will be removed on connection close
    }
}

function handleItemAdded(userId, data) {
    // Add the item to the checklist
    checklist.push(data.item);

    // Broadcast to other clients
    broadcastToOthers(userId, {
        type: 'itemAdded',
        userId: userId,
        item: data.item,
        timestamp: Date.now()
    });

    // Save state
    saveState();
}

function handleItemUpdated(userId, data) {
    if (data.index >= 0 && data.index < checklist.length) {
        // Update the item
        checklist[data.index] = data.item;

        // Broadcast to other clients
        broadcastToOthers(userId, {
            type: 'itemUpdated',
            userId: userId,
            index: data.index,
            item: data.item,
            timestamp: Date.now()
        });

        // Save state
        saveState();
    }
}

function handleItemRemoved(userId, data) {
    if (data.index >= 0 && data.index < checklist.length) {
        // Remove the item
        checklist.splice(data.index, 1);

        // Broadcast to other clients
        broadcastToOthers(userId, {
            type: 'itemRemoved',
            userId: userId,
            index: data.index,
            timestamp: Date.now()
        });

        // Save state
        saveState();
    }
}

function handleItemStatusChanged(userId, data) {
    if (data.index >= 0 && data.index < checklist.length) {
        // Update the item status
        checklist[data.index].done = data.done;

        // Broadcast to other clients
        broadcastToOthers(userId, {
            type: 'itemStatusChanged',
            userId: userId,
            index: data.index,
            done: data.done,
            timestamp: Date.now()
        });

        // Save state
        saveState();
    }
}

function handleStartEditing(userId, data) {
    // Broadcast to other clients
    broadcastToOthers(userId, {
        type: 'startEditing',
        userId: userId,
        index: data.index,
        timestamp: Date.now()
    });
}

function handleStopEditing(userId, data) {
    // Broadcast to other clients
    broadcastToOthers(userId, {
        type: 'stopEditing',
        userId: userId,
        index: data.index,
        timestamp: Date.now()
    });
}

function handleShareImage(userId, data) {
    try {
        if (!data.imageData || !data.imageId || !data.imageType) {
            console.error('Invalid image data received');
            return;
        }

        // Decode base64 image data
        const imageBuffer = Buffer.from(data.imageData, 'base64');
        const imageExt = data.imageType.split('/')[1] || 'png';
        const imageName = `${data.imageId}.${imageExt}`;
        const imagePath = path.join(IMAGES_DIR, imageName);

        // Save the image to disk
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`Image saved: ${imageName}`);

        // Create a URL for the image
        const imageUrl = `/shared_images/${imageName}`;

        // Update the checklist item with the shared image URL
        if (data.index >= 0 && data.index < checklist.length) {
            checklist[data.index].imagePath = imageUrl;
            checklist[data.index].imageId = data.imageId;
            checklist[data.index].isSharedImage = true;

            // Broadcast the updated item to all clients
            broadcastToAll({
                type: 'itemImageUpdated',
                userId: userId,
                index: data.index,
                imageUrl: imageUrl,
                imageId: data.imageId,
                isSharedImage: true,
                timestamp: Date.now()
            });

            // Save state
            saveState();
        }
    } catch (error) {
        console.error('Error handling shared image:', error);
    }
}

function handleResetAll(userId) {
    try {
        // Get the username for logging
        const client = clients.get(userId);
        const username = client ? client.username : `User ${userId}`;

        console.log(`Reset all requested by ${username} (${userId})`);

        // Clear the checklist
        checklist = [];

        // Broadcast the reset to all clients
        broadcastToAll({
            type: 'fullState',
            checklist: [],
            resetBy: userId,
            resetByUsername: username,
            timestamp: Date.now()
        });

        // Save state
        saveState();

        console.log('Checklist reset complete');
    } catch (error) {
        console.error('Error handling reset all:', error);
    }
}

// Helper functions
function sendFullState(ws) {
    // Clean up image paths for network transmission
    const cleanedChecklist = checklist.map(item => {
        // Create a copy of the item to avoid modifying the original
        const cleanItem = { ...item };

        // If the item has a blob URL, replace it with a placeholder
        // The client will need to handle this placeholder appropriately
        if (cleanItem.imagePath && cleanItem.imagePath.startsWith('blob:')) {
            cleanItem.imagePath = '';
            cleanItem.hasLocalImage = true;
        }

        return cleanItem;
    });

    ws.send(JSON.stringify({
        type: 'fullState',
        checklist: cleanedChecklist,
        timestamp: Date.now()
    }));
}

function broadcastToOthers(senderId, message) {
    clients.forEach((client, clientId) => {
        if (clientId !== senderId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

function broadcastToAll(message) {
    clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    });
}

function broadcastActiveUsers() {
    const activeUsers = [];

    clients.forEach((client, userId) => {
        activeUsers.push({
            userId: userId,
            username: client.username,
            lastActive: client.lastActive
        });
    });

    broadcastToAll({
        type: 'activeUsers',
        users: activeUsers,
        timestamp: Date.now()
    });
}

function saveState() {
    try {
        const state = {
            checklist: checklist,
            nextUserId: nextUserId,
            timestamp: Date.now()
        };

        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
        console.log(`State saved with ${checklist.length} items`);
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

// Start the server
server.listen(PORT, () => {
    console.log(`OpChckList Collaboration Server running on port ${PORT}`);
});
