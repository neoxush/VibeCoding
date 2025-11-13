const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const os = require('os');

// Get local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over non-IPv4 and internal (loopback) addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback to localhost
}

const PORT = 3000;
const localIp = getLocalIpAddress();

// Enable CORS for all requests
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Create HTTP server
const server = http.createServer((req, res) => {
    // Set CORS headers for all responses
    setCorsHeaders(res);

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    console.log(`Request for ${req.url}`);

    // Get the file path
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Get the file extension
    const extname = path.extname(filePath);

    // Set the content type based on the file extension
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
    }

    // Read the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                fs.readFile('./404.html', (error, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://${localIp}:${PORT}/`);
    console.log(`You can also access it at http://localhost:${PORT}/`);
});

// Create WebSocket server for real-time communication
const wss = new WebSocket.Server({ server });

// Store for shared data
const sharedData = {
    tickets: [],
    users: [],
    messageLogs: []
};

// Load initial data if exists
try {
    if (fs.existsSync('./shared-data.json')) {
        const data = fs.readFileSync('./shared-data.json', 'utf8');
        const parsed = JSON.parse(data);
        sharedData.tickets = parsed.tickets || [];
        sharedData.users = parsed.users || [];
        sharedData.messageLogs = parsed.messageLogs || [];
        console.log('Loaded shared data from file');
    }
} catch (err) {
    console.error('Error loading shared data:', err);
}

// Save data to file
function saveSharedData() {
    try {
        fs.writeFileSync('./shared-data.json', JSON.stringify(sharedData), 'utf8');
    } catch (err) {
        console.error('Error saving shared data:', err);
    }
}

// Broadcast to all clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    // Send initial data to the client
    ws.send(JSON.stringify({
        type: 'init',
        data: sharedData
    }));

    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            console.log('Received:', msg.type);

            switch (msg.type) {
                case 'get-data':
                    // Send all data to the client
                    ws.send(JSON.stringify({
                        type: 'init',
                        data: sharedData
                    }));
                    break;

                case 'update-tickets':
                    // Update tickets
                    sharedData.tickets = msg.data;
                    saveSharedData();
                    // Broadcast to all clients
                    broadcast({
                        type: 'tickets-updated',
                        data: sharedData.tickets
                    });
                    break;

                case 'update-users':
                    // Update users
                    sharedData.users = msg.data;
                    saveSharedData();
                    // Broadcast to all clients
                    broadcast({
                        type: 'users-updated',
                        data: sharedData.users
                    });
                    break;

                case 'update-logs':
                    // Update message logs
                    sharedData.messageLogs = msg.data;
                    saveSharedData();
                    // Broadcast to all clients
                    broadcast({
                        type: 'logs-updated',
                        data: sharedData.messageLogs
                    });
                    break;

                case 'new-ticket':
                    // Add new ticket notification
                    broadcast({
                        type: 'new-ticket',
                        data: msg.data
                    });
                    break;

                case 'ticket-updated':
                    // Ticket status changed notification
                    broadcast({
                        type: 'ticket-updated',
                        data: msg.data
                    });
                    break;

                case 'new-comment':
                    // New comment notification
                    broadcast({
                        type: 'new-comment',
                        data: msg.data
                    });
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Handle disconnections
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Create a 404 page if it doesn't exist
if (!fs.existsSync('./404.html')) {
    const html404 = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>404 - Page Not Found</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #333; }
            p { color: #666; }
        </style>
    </head>
    <body>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <p><a href="/">Go back to home page</a></p>
    </body>
    </html>
    `;
    fs.writeFileSync('./404.html', html404);
}

console.log('WebSocket server is running');
