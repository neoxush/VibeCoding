// Shared Network Server - Simple HTTP server for local network collaboration
// This server allows multiple clients to share data without a database

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PORT = 3000;
const DATA_DIR = './shared-data';
const DATA_FILES = {
    USERS: path.join(DATA_DIR, 'users.json'),
    TICKETS: path.join(DATA_DIR, 'tickets.json'),
    LOGS: path.join(DATA_DIR, 'logs.json')
};

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

// Function to ensure data files exist and are valid
function ensureDataFiles() {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`Created data directory: ${DATA_DIR}`);
    }

    // Initialize data files if they don't exist or are invalid
    for (const [key, file] of Object.entries(DATA_FILES)) {
        let needsInit = false;

        if (!fs.existsSync(file)) {
            needsInit = true;
        } else {
            try {
                const content = fs.readFileSync(file, 'utf8');
                JSON.parse(content); // Test if valid JSON
            } catch (error) {
                console.error(`Invalid JSON in ${file}, will reinitialize`);
                needsInit = true;
            }
        }

        if (needsInit) {
            fs.writeFileSync(file, '[]');
            console.log(`Initialized data file: ${file}`);
        }
    }

    return {
        success: true,
        message: 'Data files verified and initialized if needed'
    };
}

// Initialize data files on server start
ensureDataFiles();

// Create HTTP server
const server = http.createServer((req, res) => {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    console.log(`${req.method} ${pathname}`);

    // API endpoints
    if (pathname === '/api/data') {
        if (req.method === 'GET') {
            // Return all data
            try {
                const users = JSON.parse(fs.readFileSync(DATA_FILES.USERS, 'utf8'));
                const tickets = JSON.parse(fs.readFileSync(DATA_FILES.TICKETS, 'utf8'));
                const logs = JSON.parse(fs.readFileSync(DATA_FILES.LOGS, 'utf8'));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    users,
                    tickets,
                    logs
                }));
            } catch (error) {
                console.error('Error reading data files:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read data files' }));
            }
        } else if (req.method === 'POST') {
            // Update data
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    const data = JSON.parse(body);

                    // Update files
                    if (data.users) {
                        fs.writeFileSync(DATA_FILES.USERS, JSON.stringify(data.users, null, 2));
                    }

                    if (data.tickets) {
                        fs.writeFileSync(DATA_FILES.TICKETS, JSON.stringify(data.tickets, null, 2));
                    }

                    if (data.logs) {
                        fs.writeFileSync(DATA_FILES.LOGS, JSON.stringify(data.logs, null, 2));
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Error updating data files:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to update data files' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (pathname === '/api/ensure-data') {
        // Handle ensure-data request
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    // Ensure data files exist and are valid
                    const result = ensureDataFiles();

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    console.error('Error ensuring data files:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to ensure data files' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } else if (pathname.startsWith('/api/')) {
        // Handle specific data type endpoints
        const dataType = pathname.split('/')[2];

        if (dataType === 'users') {
            handleDataRequest(req, res, DATA_FILES.USERS);
        } else if (dataType === 'tickets') {
            handleDataRequest(req, res, DATA_FILES.TICKETS);
        } else if (dataType === 'logs') {
            handleDataRequest(req, res, DATA_FILES.LOGS);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    } else {
        // Serve static files
        serveStaticFile(req, res);
    }
});

// Handle data requests
function handleDataRequest(req, res, filePath) {
    if (req.method === 'GET') {
        // Return data
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (error) {
            console.error(`Error reading file: ${filePath}`, error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read data file' }));
        }
    } else if (req.method === 'POST') {
        // Update data
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                // Validate JSON
                JSON.parse(body);

                // Write to file
                fs.writeFileSync(filePath, body);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error(`Error updating file: ${filePath}`, error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to update data file' }));
            }
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
}

// Serve static files
function serveStaticFile(req, res) {
    // Get the file path
    let filePath = '.' + new URL(req.url, `http://${req.headers.host}`).pathname;
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
                res.writeHead(404);
                res.end('File not found');
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
}

// Start the server
server.listen(PORT, () => {
    const localIp = getLocalIpAddress();
    console.log(`Server running at http://${localIp}:${PORT}/`);
    console.log(`You can also access it at http://localhost:${PORT}/`);
});
