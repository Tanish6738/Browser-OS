let highestZIndex = 100;
let currentTheme = 'dark';
const windows = new Map();
let folderCount = 0;
const folders = new Map(); // Add this to track folder data

document.addEventListener('DOMContentLoaded', function() {
    initializeClock();
    initializeWindowManager();
    initializeDock();
    initializeContextMenu();
    initializeThemeToggle();
    initializeKeyboardShortcuts();
});

function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        const dateString = now.toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        const clockElement = document.getElementById('clock');
        if (clockElement) {
            clockElement.innerHTML = `${dateString} ${timeString}`;
        }
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

function initializeWindowManager() {
    const windowElements = document.querySelectorAll('.window');
    
    windowElements.forEach(windowEl => {
        const windowId = windowEl.id;
        const appName = windowEl.dataset.window;
        
        windows.set(windowId, {
            element: windowEl,
            isMinimized: false,
            isMaximized: false,
            originalPosition: { top: 0, left: 0, width: 0, height: 0 },
            appName: appName
        });
        
        setupWindowControls(windowEl);
        makeWindowDraggable(windowEl);
        setupWindowFocus(windowEl);
    });
}

function setupWindowControls(windowEl) {
    const closeBtn = windowEl.querySelector('[data-action="close"]');
    const minimizeBtn = windowEl.querySelector('[data-action="minimize"]');
    const maximizeBtn = windowEl.querySelector('[data-action="maximize"]');
    const windowId = windowEl.id;
    
    closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeWindow(windowId);
    });
    
    minimizeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeWindow(windowId);
    });
    
    maximizeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMaximizeWindow(windowId);
    });
}

function makeWindowDraggable(windowEl) {
    const header = windowEl.querySelector('.window-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('[data-action]')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(window.getComputedStyle(windowEl).left, 10);
        startTop = parseInt(window.getComputedStyle(windowEl).top, 10);
        
        bringToFront(windowEl.id);
        
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
        
        header.style.cursor = 'grabbing';
    });
    
    function handleDrag(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = Math.max(0, Math.min(window.innerWidth - windowEl.offsetWidth, startLeft + deltaX));
        const newTop = Math.max(28, Math.min(window.innerHeight - windowEl.offsetHeight, startTop + deltaY));
        
        windowEl.style.left = `${newLeft}px`;
        windowEl.style.top = `${newTop}px`;
    }
    
    function stopDrag() {
        isDragging = false;
        header.style.cursor = 'move';
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

function setupWindowFocus(windowEl) {
    windowEl.addEventListener('mousedown', () => {
        bringToFront(windowEl.id);
    });
}

function bringToFront(windowId) {
    const windowData = windows.get(windowId);
    if (!windowData) return;
    
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    
    windowData.element.classList.add('focused');
    windowData.element.style.zIndex = ++highestZIndex;
}

function openWindow(windowId) {
    const windowData = windows.get(windowId);
    if (!windowData) return;
    
    const windowEl = windowData.element;
    
    if (windowData.isMinimized) {
        windowEl.classList.add('restoring');
        setTimeout(() => windowEl.classList.remove('restoring'), 300);
        windowData.isMinimized = false;
    }
    
    windowEl.classList.remove('hidden');
    bringToFront(windowId);
    updateDockIndicator(windowData.appName, true);
}

function closeWindow(windowId) {
    const windowData = windows.get(windowId);
    if (!windowData) return;
    
    windowData.element.classList.add('hidden');
    windowData.isMinimized = false;
    windowData.isMaximized = false;
    updateDockIndicator(windowData.appName, false);
}

function minimizeWindow(windowId) {
    const windowData = windows.get(windowId);
    if (!windowData) return;
    
    const windowEl = windowData.element;
    windowEl.classList.add('minimizing');
    
    setTimeout(() => {
        windowEl.classList.add('hidden');
        windowEl.classList.remove('minimizing');
        windowData.isMinimized = true;
    }, 300);
}

function toggleMaximizeWindow(windowId) {
    const windowData = windows.get(windowId);
    if (!windowData) return;
    
    const windowEl = windowData.element;
    
    if (!windowData.isMaximized) {
        // Save current position and size
        windowData.originalPosition = {
            top: parseInt(window.getComputedStyle(windowEl).top, 10),
            left: parseInt(window.getComputedStyle(windowEl).left, 10),
            width: windowEl.offsetWidth,
            height: windowEl.offsetHeight
        };
        
        // Maximize
        windowEl.style.top = '28px';
        windowEl.style.left = '0px';
        windowEl.style.width = '100vw';
        windowEl.style.height = 'calc(100vh - 28px)';
        windowData.isMaximized = true;
    } else {
        // Restore
        const pos = windowData.originalPosition;
        windowEl.style.top = `${pos.top}px`;
        windowEl.style.left = `${pos.left}px`;
        windowEl.style.width = `${pos.width}px`;
        windowEl.style.height = `${pos.height}px`;
        windowData.isMaximized = false;
    }
}

function initializeDock() {
    const dockApps = document.querySelectorAll('.dock-app');
    
    dockApps.forEach(app => {
        app.addEventListener('click', () => {
            const appName = app.dataset.app;
            const windowId = `${appName}-window`;
            const windowData = windows.get(windowId);
            
            if (!windowData) return;
            
            if (windowData.element.classList.contains('hidden') || windowData.isMinimized) {
                openWindow(windowId);
            } else {
                minimizeWindow(windowId);
            }
        });
        
        app.addEventListener('mouseenter', () => {
            app.style.transform = 'translateY(-5px) scale(1.1)';
        });
        
        app.addEventListener('mouseleave', () => {
            app.style.transform = 'translateY(0) scale(1)';
        });
    });
}

function updateDockIndicator(appName, isActive) {
    const dockApp = document.querySelector(`[data-app="${appName}"]`);
    if (dockApp) {
        if (isActive) {
            dockApp.classList.add('active');
        } else {
            dockApp.classList.remove('active');
        }
    }
}

function initializeContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    const desktop = document.getElementById('desktop');
    
    desktop.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        const x = Math.min(e.clientX, window.innerWidth - contextMenu.offsetWidth);
        const y = Math.min(e.clientY, window.innerHeight - contextMenu.offsetHeight);
        
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.remove('hidden');
    });
    
    // Add click handler to deselect folders when clicking on empty desktop
    desktop.addEventListener('click', (e) => {
        // Only deselect if clicking on the desktop itself, not on a folder
        if (e.target === desktop) {
            deselectAllFolders();
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.classList.add('hidden');
        }
    });
    
    const menuItems = contextMenu.querySelectorAll('.context-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            handleContextMenuAction(item.textContent.trim());
            contextMenu.classList.add('hidden');
        });
    });
}

function handleContextMenuAction(action) {
    switch (action) {
        case 'Create Folder':
            const x = Math.random() * (window.innerWidth - 200);
            const y = Math.random() * (window.innerHeight - 200);
            folderCount++;
            const folderName = `New Folder ${folderCount}`;
            createFolder(x, y, folderName);
            showNotification('Folder created');
            break;
        case 'Create File':
            createFile();
            break;
        case 'Change Wallpaper':
            changeWallpaper();
            break;
        case 'Get Info':
            showNotification('Get Info clicked');
            break;
        case 'Refresh Desktop':
            location.reload();
            break;
    }
}

function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Set initial theme
    if (currentTheme === 'dark') {
        html.classList.add('dark');
        themeToggle.textContent = '☀️';
    } else {
        html.classList.remove('dark');
        themeToggle.textContent = '🌙';
    }
    
    themeToggle.addEventListener('click', () => {
        if (currentTheme === 'dark') {
            html.classList.remove('dark');
            themeToggle.textContent = '🌙';
            currentTheme = 'light';
        } else {
            html.classList.add('dark');
            themeToggle.textContent = '☀️';
            currentTheme = 'dark';
        }
        
        localStorage.setItem('theme', currentTheme);
    });
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && savedTheme !== currentTheme) {
        themeToggle.click();
    }
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('context-menu').classList.add('hidden');
        }
        
        if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
            e.preventDefault();
            const focusedWindow = document.querySelector('.window.focused');
            if (focusedWindow) {
                closeWindow(focusedWindow.id);
            }
        }
        
        if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
            e.preventDefault();
            const focusedWindow = document.querySelector('.window.focused');
            if (focusedWindow) {
                minimizeWindow(focusedWindow.id);
            }
        }

        // Delete folder with Delete key or Ctrl + D
        if (e.key === 'Delete' || ((e.metaKey || e.ctrlKey) && e.key === 'd')) {
            e.preventDefault();
            deleteSelectedFolder();
        }
    });
}

function changeWallpaper() {
    const wallpapers = [
        'https://images.unsplash.com/photo-1557682250-33bd709cbe85?ixlib=rb-4.0.3&auto=format&fit=crop&w=2029&q=80',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80'
    ];
    
    const currentBg = document.getElementById('desktop').style.backgroundImage;
    let currentIndex = wallpapers.findIndex(wp => currentBg.includes(wp));
    const nextIndex = (currentIndex + 1) % wallpapers.length;
    
    document.getElementById('desktop').style.backgroundImage = `url('${wallpapers[nextIndex]}')`;
    showNotification('Wallpaper changed');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-8 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}


// Cherry on the top for my self

function createFolder(x, y, folderName) {
    const folderId = `folder-${Date.now()}`;
    const folder = document.createElement('div');
    folder.className = 'folder-icon';
    folder.style.left = `${x + 40}px`;
    folder.style.top = `${y + 40}px`;
    folder.dataset.folderId = folderId;
    
    // Store folder data
    folders.set(folderId, {
        id: folderId,
        name: folderCount === 1 ? "New Folder" : folderName,
        contents: [], // Array to store items inside this folder
        x: x + 40,
        y: y + 40
    });
    
    const icon = document.createElement('span');
    icon.className = 'folder-icon-image';
    icon.textContent = '📁';

    const name = document.createElement('span');
    name.className = 'folder-icon-name';
    name.textContent = folderCount === 1 ? "New Folder" : folderName;
    name.contentEditable = true;
    name.spellcheck = false;

    name.addEventListener('mousedown', e => e.stopPropagation());
    name.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            name.blur();
        }
    });
    name.addEventListener('blur', () => {
        const newName = name.textContent.trim();
        if (newName === '') {
            name.textContent = folderCount === 1 ? 'Untitled Folder' : `Untitled Folder ${folderCount}`;
        }
        // Update folder data
        const folderData = folders.get(folderId);
        if (folderData) {
            folderData.name = name.textContent;
        }
    });

    // Add double-click to open folder
    folder.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openFolder(folderId);
    });

    // Add single click to select folder
    folder.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFolder(folderId);
    });

    // Add right-click context menu
    folder.addEventListener('contextmenu', (e) => {
        selectFolder(folderId);
        showDesktopFolderContextMenu(e, folderId);
    });

    folder.appendChild(icon);
    folder.appendChild(name);

    document.getElementById('desktop').appendChild(folder);
    makeIconDraggable(folder, 'folder');
}

// Folder opening functionality
function openFolder(folderId) {
    const folderData = folders.get(folderId);
    if (!folderData) return;

    // Create a folder window
    const folderWindow = createFolderWindow(folderId, folderData);
    document.getElementById('windows-container').appendChild(folderWindow);
    
    // Register the window
    windows.set(`folder-${folderId}`, {
        element: folderWindow,
        isMinimized: false,
        isMaximized: false,
        originalPosition: { top: 0, left: 0, width: 0, height: 0 },
        appName: 'folder'
    });
    
    setupWindowControls(folderWindow);
    makeWindowDraggable(folderWindow);
    setupWindowFocus(folderWindow);
    
    openWindow(`folder-${folderId}`);
}

function createFolderWindow(folderId, folderData) {
    const windowEl = document.createElement('div');
    windowEl.className = 'window absolute bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 z-10';
    windowEl.id = `folder-${folderId}`;
    windowEl.dataset.window = 'folder';
    windowEl.style.top = '100px';
    windowEl.style.left = '100px';
    windowEl.style.width = '600px';
    windowEl.style.height = '400px';
    
    windowEl.innerHTML = `
        <div class="window-header bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm flex items-center justify-between px-4 py-2 rounded-t-lg cursor-pointer border-b border-gray-200/50 dark:border-gray-600/50">
            <div class="flex space-x-2">
                <button class="w-3 h-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors" data-action="close"></button>
                <button class="w-3 h-3 bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors" data-action="minimize"></button>
                <button class="w-3 h-3 bg-green-500 hover:bg-green-600 rounded-full transition-colors" data-action="maximize"></button>
            </div>
            <div class="text-sm font-medium text-gray-700 dark:text-gray-200">${folderData.name}</div>
            <div class="w-16"></div>
        </div>
        <div class="window-content p-4 h-full">
            <div id="folder-contents-${folderId}" class="grid grid-cols-6 gap-4 h-full overflow-auto">
                ${renderFolderContents(folderData.contents)}
            </div>
        </div>
    `;
    
    addFolderContextMenu(windowEl, folderId); // Add context menu for folder actions
    addFolderContentHandlers(windowEl, folderId); // Add handlers for folder content items
    
    return windowEl;
}

function renderFolderContents(contents) {
    if (contents.length === 0) {
        return '<div class="col-span-6 flex items-center justify-center text-gray-500 dark:text-gray-400 h-full">This folder is empty</div>';
    }
    
    return contents.map(item => {
        return `
            <div class="flex flex-col items-center p-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded cursor-pointer folder-content-item" 
                 data-item-id="${item.id}" 
                 data-item-type="${item.type}"
                 data-item-name="${item.name}">
                <div class="text-3xl mb-2">${item.type === 'folder' ? '📁' : '📄'}</div>
                <div class="text-xs text-center text-gray-700 dark:text-gray-300">${item.name}</div>
            </div>
        `;
    }).join('');
}

// Drop zone functionality
function highlightDropZones(draggedFolderId) {
    const allFolders = document.querySelectorAll('.folder-icon');
    allFolders.forEach(folder => {
        if (folder.dataset.folderId !== draggedFolderId) {
            folder.classList.add('drop-zone-highlight');
        }
    });
}

function removeDropZoneHighlights() {
    const allFolders = document.querySelectorAll('.folder-icon');
    allFolders.forEach(folder => {
        folder.classList.remove('drop-zone-highlight', 'drop-zone-active');
    });
}

function checkDropTarget(x, y) {
    const element = document.elementFromPoint(x, y);
    const folder = element?.closest('.folder-icon');
    
    // Remove previous active highlights
    document.querySelectorAll('.drop-zone-active').forEach(el => {
        el.classList.remove('drop-zone-active');
    });
    
    if (folder && folder.classList.contains('drop-zone-highlight')) {
        folder.classList.add('drop-zone-active');
    }
}

function getDropTarget(x, y) {
    const element = document.elementFromPoint(x, y);
    return element?.closest('.folder-icon');
}

function moveItemToFolder(itemId, targetFolderId) {
    const itemFolder = folders.get(itemId);
    const targetFolder = folders.get(targetFolderId);
    
    if (!itemFolder || !targetFolder || itemId === targetFolderId) return;
    
    // Add item to target folder's contents
    targetFolder.contents.push({
        id: itemId,
        name: itemFolder.name,
        type: 'folder'
    });
    
    // Remove the folder from desktop
    const folderElement = document.querySelector(`[data-folder-id="${itemId}"]`);
    if (folderElement) {
        folderElement.remove();
    }
    
    // Update any open folder windows
    updateFolderWindow(targetFolderId);
    
    showNotification(`Moved "${itemFolder.name}" to "${targetFolder.name}"`);
}

function updateFolderWindow(folderId) {
    const windowId = `folder-${folderId}`;
    const windowEl = document.getElementById(windowId);
    if (!windowEl) return;
    
    const folderData = folders.get(folderId);
    const contentsEl = windowEl.querySelector(`#folder-contents-${folderId}`);
    if (contentsEl && folderData) {
        contentsEl.innerHTML = renderFolderContents(folderData.contents);
    }
}

let makeIconDraggable = (element, itemType = 'folder') => {
    let dragging = false;
    let startX, startY, startLeft, startTop;
    let draggedElement = null;
    
    element.addEventListener('mousedown', (e) => {
        if (e.target.isContentEditable) return;

        dragging = true;
        draggedElement = element;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(element.style.left, 10) || 0;
        startTop = parseInt(element.style.top, 10) || 0;

        // Add visual feedback
        element.style.zIndex = '1000';
        element.style.opacity = '0.8';
        
        // Highlight potential drop zones (only for folders)
        if (itemType === 'folder') {
            const itemId = element.dataset.folderId;
            highlightDropZones(itemId);
        }

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onStopDrag);

        element.style.cursor = 'grabbing';
    });

    function onDrag(e) {
        if (!dragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, startLeft + deltaX));
        const newTop = Math.max(28, Math.min(window.innerHeight - element.offsetHeight, startTop + deltaY));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        
        // Check for potential drop targets (only for folders)
        if (itemType === 'folder') {
            checkDropTarget(e.clientX, e.clientY);
        }
    }

    function onStopDrag(e) {
        if (!dragging) return;
        
        dragging = false;
        element.style.zIndex = '';
        element.style.opacity = '';
        element.style.cursor = '';
        
        // Remove drop zone highlights
        removeDropZoneHighlights();
        
        // Check if dropped on a folder (only for folders)
        if (itemType === 'folder') {
            const dropTarget = getDropTarget(e.clientX, e.clientY);
            if (dropTarget && dropTarget !== element) {
                const itemId = element.dataset.folderId;
                const targetId = dropTarget.dataset.folderId;
                moveItemToFolder(itemId, targetId);
            }
        }
        
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onStopDrag);
    }
}

// Additional folder management functions
function createFileInFolder(folderId, fileName) {
    const folderData = folders.get(folderId);
    if (!folderData) return;
    
    const fileId = `file-${Date.now()}`;
    folderData.contents.push({
        id: fileId,
        name: fileName,
        type: 'file'
    });
    
    updateFolderWindow(folderId);
    return fileId;
}

function createSubFolder(parentFolderId, subFolderName) {
    const parentFolder = folders.get(parentFolderId);
    if (!parentFolder) return;
    
    const subFolderId = `folder-${Date.now()}`;
    const subFolderData = {
        id: subFolderId,
        name: subFolderName,
        contents: [],
        parent: parentFolderId
    };
    
    folders.set(subFolderId, subFolderData);
    parentFolder.contents.push({
        id: subFolderId,
        name: subFolderName,
        type: 'folder'
    });
    
    updateFolderWindow(parentFolderId);
    return subFolderId;
}

// Add context menu for folder windows
function addFolderContextMenu(folderWindow, folderId) {
    const contentArea = folderWindow.querySelector('.window-content');
    
    contentArea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showFolderContextMenu(e, folderId);
    });
}

function showFolderContextMenu(e, folderId) {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-200 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 py-2 z-50 min-w-48';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    
    contextMenu.innerHTML = `
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="new-folder">
            New Folder
        </div>
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="new-file">
            New File
        </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Handle menu item clicks
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            if (action === 'new-folder') {
                createSubFolder(folderId, 'New Folder');
            } else if (action === 'new-file') {
                createFileInFolder(folderId, 'New File.txt');
            }
            document.body.removeChild(contextMenu);
        });
    });
    
    // Remove menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            if (document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
            }
            document.removeEventListener('click', removeMenu);
        });
    }, 100);
}

// Add event handlers for folder content items
function addFolderContentHandlers(folderWindow, folderId) {
    const contentArea = folderWindow.querySelector(`#folder-contents-${folderId}`);
    
    // Use event delegation to handle dynamically added content
    contentArea.addEventListener('dblclick', (e) => {
        const item = e.target.closest('.folder-content-item');
        if (item) {
            const itemId = item.dataset.itemId;
            const itemType = item.dataset.itemType;
            
            if (itemType === 'folder') {
                // Open subfolder
                openFolder(itemId);
            } else {
                // Handle file opening (you can extend this)
                showNotification(`Opening file: ${item.dataset.itemName}`);
            }
        }
    });
    
    // Add context menu for individual items
    contentArea.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.folder-content-item');
        if (item) {
            e.preventDefault();
            e.stopPropagation();
            showFolderItemContextMenu(e, item.dataset.itemId, item.dataset.itemType, item.dataset.itemName, folderId);
        }
    });
}

function showFolderItemContextMenu(e, itemId, itemType, itemName, parentFolderId) {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-200 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 py-2 z-50 min-w-48';
    contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
    contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 150)}px`;
    
    const openText = itemType === 'folder' ? 'Open' : 'Open';
    
    contextMenu.innerHTML = `
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="open">
            ${openText} "${itemName}"
        </div>
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="rename">
            Rename
        </div>
        ${itemType === 'folder' ? '<div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="move-out">Move to Desktop</div>' : ''}
        <hr class="my-1 border-gray-200/50 dark:border-gray-700/50" />
        <div class="context-menu-item px-4 py-2 hover:bg-red-100/50 dark:hover:bg-red-900/50 cursor-pointer text-sm transition-colors text-red-600 dark:text-red-400" data-action="delete">
            Delete "${itemName}"
        </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Handle menu item clicks
    contextMenu.querySelectorAll('.context-menu-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const action = menuItem.dataset.action;
            switch (action) {
                case 'open':
                    if (itemType === 'folder') {
                        openFolder(itemId);
                    } else {
                        showNotification(`Opening file: ${itemName}`);
                    }
                    break;
                case 'rename':
                    // You can implement rename functionality here
                    showNotification(`Rename functionality for "${itemName}" - Coming soon!`);
                    break;
                case 'move-out':
                    if (itemType === 'folder') {
                        moveToDesktop(itemId);
                    }
                    break;
                case 'delete':
                    deleteItemFromFolder(itemId, parentFolderId, itemName);
                    break;
            }
            document.body.removeChild(contextMenu);
        });
    });
    
    // Remove menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            if (document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
            }
            document.removeEventListener('click', removeMenu);
        });
    }, 100);
}

function deleteItemFromFolder(itemId, parentFolderId, itemName) {
    if (!confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
        return;
    }
    
    const parentFolder = folders.get(parentFolderId);
    if (!parentFolder) return;
    
    // Remove item from parent folder's contents
    parentFolder.contents = parentFolder.contents.filter(item => item.id !== itemId);
    
    // If it's a folder, also remove it from the folders map and close any open windows
    const itemFolder = folders.get(itemId);
    if (itemFolder) {
        const windowId = `folder-${itemId}`;
        const windowElement = document.getElementById(windowId);
        if (windowElement) {
            closeWindow(windowId);
            windowElement.remove();
            windows.delete(windowId);
        }
        folders.delete(itemId);
    }
    
    // Update the parent folder window
    updateFolderWindow(parentFolderId);
    
    showNotification(`Deleted "${itemName}"`);
}

// Folder selection and deletion functionality
let selectedFolder = null;

function selectFolder(folderId) {
    // Remove previous selection
    document.querySelectorAll('.folder-icon').forEach(folder => {
        folder.classList.remove('selected');
    });
    
    // Select new folder
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
    if (folderElement) {
        folderElement.classList.add('selected');
        selectedFolder = folderId;
    }
}

function deselectAllFolders() {
    document.querySelectorAll('.folder-icon').forEach(folder => {
        folder.classList.remove('selected');
    });
    selectedFolder = null;
}

function deleteFolder(folderId) {
    const folderData = folders.get(folderId);
    if (!folderData) return false;
    
    // Show confirmation dialog
    const folderName = folderData.name;
    if (!confirm(`Are you sure you want to delete "${folderName}"? This action cannot be undone.`)) {
        return false;
    }
    
    // Close any open folder windows
    const windowId = `folder-${folderId}`;
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        closeWindow(windowId);
        windowElement.remove();
        windows.delete(windowId);
    }
    
    // Remove folder element from desktop
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
    if (folderElement) {
        folderElement.remove();
    }
    
    // Remove from folders Map
    folders.delete(folderId);
    
    // If this folder was inside another folder, remove it from parent's contents
    folders.forEach((parentFolder, parentId) => {
        parentFolder.contents = parentFolder.contents.filter(item => item.id !== folderId);
        updateFolderWindow(parentId);
    });
    
    // Clear selection if this folder was selected
    if (selectedFolder === folderId) {
        selectedFolder = null;
    }
    
    showNotification(`Deleted folder "${folderName}"`);
    return true;
}

function deleteSelectedFolder() {
    if (selectedFolder) {
        deleteFolder(selectedFolder);
    }
}

// Add desktop context menu for folders
function showDesktopFolderContextMenu(e, folderId) {
    e.preventDefault();
    e.stopPropagation();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-200 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 py-2 z-50 min-w-48';
    contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
    contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 150)}px`;
    
    const folderData = folders.get(folderId);
    const folderName = folderData ? folderData.name : 'Folder';
    
    contextMenu.innerHTML = `
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="open">
            Open "${folderName}"
        </div>
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="rename">
            Rename
        </div>
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="move-out">
            Move to Desktop
        </div>
        <hr class="my-1 border-gray-200/50 dark:border-gray-700/50" />
        <div class="context-menu-item px-4 py-2 hover:bg-red-100/50 dark:hover:bg-red-900/50 cursor-pointer text-sm transition-colors text-red-600 dark:text-red-400" data-action="delete">
            Delete "${folderName}"
        </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Handle menu item clicks
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            switch (action) {
                case 'open':
                    openFolder(folderId);
                    break;
                case 'rename':
                    startRenamingFolder(folderId);
                    break;
                case 'move-out':
                    moveToDesktop(folderId);
                    break;
                case 'delete':
                    deleteFolder(folderId);
                    break;
            }
            document.body.removeChild(contextMenu);
        });
    });
    
    // Remove menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            if (document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
            }
            document.removeEventListener('click', removeMenu);
        });
    }, 100);
}

function startRenamingFolder(folderId) {
    const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
    if (!folderElement) return;
    
    const nameElement = folderElement.querySelector('.folder-icon-name');
    if (nameElement) {
        nameElement.focus();
        
        // Select all text for easy editing
        const range = document.createRange();
        range.selectNodeContents(nameElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

// Move folder to desktop (extract from parent folder)
function moveToDesktop(folderId) {
    const folderData = folders.get(folderId);
    if (!folderData) return;
    
    // Remove from all parent folders
    folders.forEach((parentFolder, parentId) => {
        const itemIndex = parentFolder.contents.findIndex(item => item.id === folderId);
        if (itemIndex !== -1) {
            parentFolder.contents.splice(itemIndex, 1);
            updateFolderWindow(parentId);
        }
    });
    
    // Create folder icon on desktop
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 200) + 50; // Avoid top menu bar
    
    const folder = document.createElement('div');
    folder.className = 'folder-icon';
    folder.style.left = `${x}px`;
    folder.style.top = `${y}px`;
    folder.dataset.folderId = folderId;
    
    const icon = document.createElement('span');
    icon.className = 'folder-icon-image';
    icon.textContent = '📁';

    const name = document.createElement('span');
    name.className = 'folder-icon-name';
    name.textContent = folderData.name;
    name.contentEditable = true;
    name.spellcheck = false;

    name.addEventListener('mousedown', e => e.stopPropagation());
    name.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            name.blur();
        }
    });
    name.addEventListener('blur', () => {
        const newName = name.textContent.trim();
        if (newName === '') {
            name.textContent = 'Untitled Folder';
        }
        folderData.name = name.textContent;
    });

    // Add event listeners
    folder.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openFolder(folderId);
    });

    folder.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFolder(folderId);
    });

    folder.addEventListener('contextmenu', (e) => {
        selectFolder(folderId);
        showDesktopFolderContextMenu(e, folderId);
    });

    folder.appendChild(icon);
    folder.appendChild(name);

    document.getElementById('desktop').appendChild(folder);
    makeIconDraggable(folder, 'folder');
    
    // Update folder position in data
    folderData.x = x;
    folderData.y = y;
    
    showNotification(`Moved "${folderData.name}" to desktop`);
}

// Enhanced file creation functionality
function createFile(fileName = 'New File.txt', parentFolderId = null) {
    const fileId = `file-${Date.now()}`;
    const fileData = {
        id: fileId,
        name: fileName,
        type: 'file',
        content: '',
        created: new Date(),
        modified: new Date()
    };
    
    if (parentFolderId) {
        // Add to parent folder
        const parentFolder = folders.get(parentFolderId);
        if (parentFolder) {
            parentFolder.contents.push({
                id: fileId,
                name: fileName,
                type: 'file'
            });
            updateFolderWindow(parentFolderId);
        }
    } else {
        // Create on desktop
        const x = Math.random() * (window.innerWidth - 200);
        const y = Math.random() * (window.innerHeight - 200) + 50;
        
        const fileElement = document.createElement('div');
        fileElement.className = 'folder-icon'; // Reuse folder styling for files
        fileElement.style.left = `${x}px`;
        fileElement.style.top = `${y}px`;
        fileElement.dataset.fileId = fileId;
        
        const icon = document.createElement('span');
        icon.className = 'folder-icon-image';
        icon.textContent = getFileIcon(fileName);

        const name = document.createElement('span');
        name.className = 'folder-icon-name';
        name.textContent = fileName;
        name.contentEditable = true;
        name.spellcheck = false;

        name.addEventListener('mousedown', e => e.stopPropagation());
        name.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                name.blur();
            }
        });
        name.addEventListener('blur', () => {
            const newName = name.textContent.trim();
            if (newName === '') {
                name.textContent = 'Untitled File';
            }
            fileData.name = name.textContent;
            icon.textContent = getFileIcon(name.textContent);
        });

        // Add event listeners
        fileElement.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openFile(fileId);
        });

        fileElement.addEventListener('click', (e) => {
            e.stopPropagation();
            // Could add file selection here
        });

        fileElement.addEventListener('contextmenu', (e) => {
            showFileContextMenu(e, fileId);
        });

        fileElement.appendChild(icon);
        fileElement.appendChild(name);

        document.getElementById('desktop').appendChild(fileElement);
        makeIconDraggable(fileElement, 'file');
    }
    
    // Store file data (you could extend this to save to localStorage)
    // For now, just show notification
    showNotification(`Created file: ${fileName}`);
    return fileId;
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'txt': '📄',
        'doc': '📄',
        'docx': '📄',
        'pdf': '📄',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'mp3': '🎵',
        'mp4': '🎬',
        'js': '📜',
        'html': '🌐',
        'css': '🎨',
        'zip': '🗜️'
    };
    return iconMap[extension] || '📄';
}

function openFile(fileId) {
    // Basic file opening - you can extend this
    showNotification(`Opening file with ID: ${fileId}`);
    // Could open a text editor window, image viewer, etc.
}

function showFileContextMenu(e, fileId) {
    e.preventDefault();
    e.stopPropagation();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-200 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 py-2 z-50 min-w-48';
    contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
    contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 150)}px`;
    
    contextMenu.innerHTML = `
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="open">
            Open
        </div>
        <div class="context-menu-item px-4 py-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors" data-action="rename">
            Rename
        </div>
        <hr class="my-1 border-gray-200/50 dark:border-gray-700/50" />
        <div class="context-menu-item px-4 py-2 hover:bg-red-100/50 dark:hover:bg-red-900/50 cursor-pointer text-sm transition-colors text-red-600 dark:text-red-400" data-action="delete">
            Delete
        </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Handle menu item clicks
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            switch (action) {
                case 'open':
                    openFile(fileId);
                    break;
                case 'rename':
                    // Implement rename functionality
                    showNotification('File rename functionality - Coming soon!');
                    break;
                case 'delete':
                    deleteFile(fileId);
                    break;
            }
            document.body.removeChild(contextMenu);
        });
    });
    
    // Remove menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            if (document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
            }
            document.removeEventListener('click', removeMenu);
        });
    }, 100);
}

function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }
    
    // Remove from desktop
    const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
    if (fileElement) {
        fileElement.remove();
    }
    
    // Remove from any parent folders
    folders.forEach((folder, folderId) => {
        folder.contents = folder.contents.filter(item => item.id !== fileId);
        updateFolderWindow(folderId);
    });
    
    showNotification('File deleted');
}