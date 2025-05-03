// Store interactions
let interactions = [];

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
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message);
    }
}

// Mouse movement handler
document.addEventListener('mousemove', (e) => {
    const interaction = {
        action: 'mouse_move',
        time: Date.now(),
        cursor_pos: [e.clientX, e.clientY],
        screen_size: [window.innerWidth, window.innerHeight]
    };
    interactions.push(interaction);
});

// Scroll handler
let lastScrollY = window.scrollY;
document.addEventListener('scroll', (e) => {
    const currentScrollY = window.scrollY;
    const interaction = {
        action: 'scroll',
        direction: currentScrollY > lastScrollY ? 'down' : 'up',
        time: Date.now(),
        current_offset: currentScrollY,
        total_offset: document.documentElement.scrollHeight - window.innerHeight,
        screen_size: [window.innerWidth, window.innerHeight]
    };
    interactions.push(interaction);
    lastScrollY = currentScrollY;
});

// Click handler
document.addEventListener('click', (e) => {
    const interaction = {
        action: 'click',
        time: Date.now(),
        position: [e.clientX, e.clientY],
        DOMElement: getElementDetails(e.target)
    };
    interactions.push(interaction);
});

// Keypress handler
document.addEventListener('keypress', (e) => {
    const interaction = {
        action: 'KEYPRESS',
        time: Date.now()
    };
    interactions.push(interaction);
});

// Periodically send data to background script
setInterval(() => {
    if (interactions.length > 0) {
        sendToBackground({
            type: 'INTERACTIONS',
            data: interactions
        });
        interactions = []; // Clear the array after sending
    }
}, 1000); // Send every second 