// Generate a unique session ID
function generateSessionId() {
    return Math.random().toString(36).substr(2, 9);
}

// Store the current session ID
let currentSessionId = generateSessionId();




// Function to get element details
function getElementDetails(element) {
    const rect = element.getBoundingClientRect();
    return {
        tag: element.tagName,
        type: element.type || '',
        width: rect.width,
        height: rect.height,
        position: [rect.left, rect.top]
    };
}

// Function to safely send message to background
function sendToBackground(message) {
    try {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(message);
        }
    } catch (error) {
        console.error('Error sending message to background:', error);
    }
}

// Track mouse movements
document.addEventListener('mousemove', (e) => {
    const window_size = {
        width: window.innerWidth,
        height: window.innerHeight
    }
    sendToBackground({
        type: 'INTERACTIONS',
        data: [{
            action: 'mouse_move',
            timestamp: Date.now(),
            x: e.clientX,
            y: e.clientY,
            session_id: currentSessionId,
            window_size: window_size
        }]
    });
});

let lastScrollY = null;
// Track scroll events
document.addEventListener('scroll', () => {
        // Get current scroll position
        const currentScrollY = window.scrollY || window.pageYOffset;
        const window_size = {
            width: window.innerWidth,
            height: window.innerHeight
        }
        // Get total scrollable height and width
        const totalHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
        ) - window.innerHeight;

        // Get scroll direction
        const scrollDirection = lastScrollY === null ? 'n/a' : currentScrollY > lastScrollY ? 'down' : 'up';

        // Update last scroll position
        lastScrollY = currentScrollY;

        sendToBackground({
            type: 'INTERACTIONS',
            data: [{
                action: 'scroll',
                timestamp: Date.now(),
                session_id: currentSessionId,
                current_offset: currentScrollY,
                total_offset: totalHeight,
                scroll_direction: scrollDirection,
                window_size: window_size
            }]
    });
});

// Track clicks
document.addEventListener('click', (e) => {
        const window_size = {
            width: window.innerWidth,
            height: window.innerHeight
        }
        sendToBackground({
            type: 'INTERACTIONS',
            data: [{
            action: 'click',
            x: e.clientX,
            y: e.clientY,
            timestamp: Date.now(),
            session_id: currentSessionId,
            target: getElementDetails(e.target),
            window_size: window_size
            }]
        });
});

// Track keypresses
document.addEventListener('keypress', (e) => {
        const window_size = {
            width: window.innerWidth,
            height: window.innerHeight
        }
        sendToBackground({
            type: 'INTERACTIONS',
            data: [{
            action: 'keypress',
            timestamp: Date.now(),
            session_id: currentSessionId,
            window_size: window_size
        }]
    });
});

// Handle visibility change (tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Generate new session ID when tab becomes visible
        currentSessionId = generateSessionId();
    }
});
