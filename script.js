let highestZIndex = 100;
let currentTheme = 'dark';
const windows = new Map();
let folderCount = 0;

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
            createFolder(x,y, folderName);
            showNotification('Create Folder clicked');
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

function createFolder(x,y,folderName){
    const folder = document.createElement('div');
    folder.className = 'folder-icon';
    folder.style.left = `${x+40}px`;
    folder.style.top = `${y+40}px`;
    
    const icon = document.createElement('span');
    icon.className = 'folder-icon-image';
    icon.textContent = '📁';

    const name = document.createElement('span');
    name.className = 'folder-icon-name';
    name.textContent = folderCount == 1 ? "New Folder" : folderName;
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
       if (name.textContent.trim() === '') {
           name.textContent = folderCount === 1 ? 'Untitled Folder' : `Untitled Folder ${folderCount}`;
        }
    });

    folder.appendChild(icon);
    folder.appendChild(name);

    document.getElementById('desktop').appendChild(folder);
    makeiconDraggable(folder);
}

let makeiconDraggable = (folder) => {
    let draging = false;
    let startX, startY, startLeft, startTop;
    folder.addEventListener('mousedown', (e) => {
        if (e.target.isContentEditable) return;

        draging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(folder.style.left, 10) || 0;
        startTop = parseInt(folder.style.top, 10) || 0;

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onStopDrag);

        folder.style.cursor = 'grabbing';
    });    function onDrag(e) {
        if (!draging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const desktopEl = document.getElementById('desktop');
        const newLeft = Math.max(0, Math.min(window.innerWidth - folder.offsetWidth, startLeft + deltaX));
        const newTop = Math.max(28, Math.min(window.innerHeight - folder.offsetHeight, startTop + deltaY));

        folder.style.left = `${newLeft}px`;
        folder.style.top = `${newTop}px`;
    }

    function onStopDrag() {
        draging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onStopDrag);
    }
}