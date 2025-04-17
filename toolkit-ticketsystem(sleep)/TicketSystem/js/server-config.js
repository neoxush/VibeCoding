// Server configuration helper
let manualServerUrl = '';

// Create a server configuration dialog
function createServerConfigDialog() {
    // Check if dialog already exists
    if (document.getElementById('server-config-dialog')) {
        return;
    }
    
    // Create dialog container
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'server-config-dialog';
    dialogContainer.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 hidden';
    
    // Create dialog content
    dialogContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 class="text-xl font-bold mb-4">Server Configuration</h2>
            <p class="text-gray-600 mb-4">Enter the server IP address and port to connect to.</p>
            
            <div class="mb-4">
                <label for="server-ip" class="block text-sm font-medium text-gray-700 mb-1">Server IP</label>
                <input type="text" id="server-ip" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                       placeholder="192.168.1.x or localhost" value="localhost">
            </div>
            
            <div class="mb-6">
                <label for="server-port" class="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <input type="number" id="server-port" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                       placeholder="3000" value="3000">
            </div>
            
            <div class="flex justify-end space-x-3">
                <button id="cancel-server-config" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Cancel
                </button>
                <button id="save-server-config" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Connect
                </button>
            </div>
        </div>
    `;
    
    // Add dialog to body
    document.body.appendChild(dialogContainer);
    
    // Add event listeners
    const cancelButton = document.getElementById('cancel-server-config');
    const saveButton = document.getElementById('save-server-config');
    
    cancelButton.addEventListener('click', () => {
        dialogContainer.classList.add('hidden');
    });
    
    saveButton.addEventListener('click', () => {
        const serverIp = document.getElementById('server-ip').value;
        const serverPort = document.getElementById('server-port').value;
        
        if (!serverIp) {
            alert('Please enter a server IP address');
            return;
        }
        
        if (!serverPort) {
            alert('Please enter a server port');
            return;
        }
        
        // Save server URL
        manualServerUrl = `ws://${serverIp}:${serverPort}`;
        localStorage.setItem('manual-server-url', manualServerUrl);
        
        // Close dialog
        dialogContainer.classList.add('hidden');
        
        // Trigger connection
        if (typeof connectToServer === 'function') {
            connectToServer();
        } else {
            console.error('connectToServer function not found');
            alert('Could not connect to server. Please refresh the page and try again.');
        }
    });
    
    // Add click outside to close
    dialogContainer.addEventListener('click', (e) => {
        if (e.target === dialogContainer) {
            dialogContainer.classList.add('hidden');
        }
    });
}

// Show server configuration dialog
function showServerConfigDialog() {
    createServerConfigDialog();
    const dialog = document.getElementById('server-config-dialog');
    if (dialog) {
        dialog.classList.remove('hidden');
    }
}

// Get saved server URL
function getSavedServerUrl() {
    return localStorage.getItem('manual-server-url') || '';
}

// Create server config button
function createServerConfigButton() {
    const configButton = document.createElement('button');
    configButton.id = 'server-config-button';
    configButton.className = 'fixed bottom-4 right-36 bg-gray-600 hover:bg-gray-700 text-white rounded-full p-2 shadow-lg z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500';
    configButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
    `;
    configButton.title = "Configure Server";
    configButton.onclick = showServerConfigDialog;
    document.body.appendChild(configButton);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize on login or register pages
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPath !== 'login.html' && currentPath !== 'register.html') {
        createServerConfigButton();
        createServerConfigDialog();
    }
});
