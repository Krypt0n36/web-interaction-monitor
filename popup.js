// Store downloaded sessions history
let downloadedSessions = [];
let updateInterval;
let totalStats = {
    mouse_move: 0,
    scroll: 0,
    click: 0,
    keypress: 0
};

// Function to show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Function to safely send messages to background script
async function sendMessageToBackground(message) {
    try {
        return await chrome.runtime.sendMessage(message);
    } catch (error) {
        if (error.message.includes('Extension context invalidated')) {
            document.getElementById('stats').innerHTML = '<p class="error">Extension context invalidated. Please reload the extension.</p>';
            return null;
        }
        throw error;
    }
}

document.querySelector('.toggle-button').addEventListener('click', async () => {
    const toggleButton = document.querySelector('.toggle-button');
    if (toggleButton.classList.contains('on')) {
        toggleButton.classList.remove('on');
        toggleButton.classList.add('off');
        await sendMessageToBackground({ type: 'STOP_COLLECTING' });
    }else{
        toggleButton.classList.remove('off');
        toggleButton.classList.add('on');
        await sendMessageToBackground({ type: 'START_COLLECTING' });
    }
});

// Function to update stats display
function updateStats(stats) {
    document.getElementById('mouse-move-count').textContent = stats.mouse_move;
    document.getElementById('scroll-count').textContent = stats.scroll;
    document.getElementById('click-count').textContent = stats.click;
    document.getElementById('keypress-count').textContent = stats.keypress;
}

// Function to update download history display
function updateDownloadHistory() {
    const historyList = document.getElementById('download-history');
    historyList.innerHTML = '';

    downloadedSessions.forEach(session => {
        const downloadItem = document.createElement('div');
        downloadItem.className = 'download-item';
        downloadItem.innerHTML = `
            <span class="download-name">
                <div class="checkmark-circle">
                    <div class="checkmark"></div>
                </div>
                <input type="text" value="${session.filename}" readonly>
            </span>
            <span class="download-time">${new Date(session.timestamp).toLocaleString()}</span>
        `;
        historyList.appendChild(downloadItem);
    });
}

// Function to update the display
async function updateDisplay() {
    try {
        const stats = await sendMessageToBackground({ type: 'GET_TOTAL_STATS' });
        if (stats) {
            updateStats(stats);
        }
    } catch (error) {
        console.error('Error updating display:', error);
    }
}

// Function to fetch and update download history
async function fetchDownloadHistory() {
    try {
        const history = await sendMessageToBackground({ type: 'GET_DOWNLOAD_HISTORY' });
        if (history) {
            downloadedSessions = history;
            updateDownloadHistory();
        }
    } catch (error) {
        console.error('Error fetching download history:', error);
    }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
    // Set up interaction limit control
    const limitInput = document.getElementById('interaction-limit');
    const applyButton = document.getElementById('apply-limit');
    
    // Load current limit
    const {limit, on} = await sendMessageToBackground({ type: 'GET_INTERACTION_LIMIT' });
    limitInput.value = limit;
    // Set the toggle button to the correct state
    if (on == true) {
        document.querySelector('.toggle-button').classList.remove('off');
        document.querySelector('.toggle-button').classList.add('on');
        document.querySelector('.toggle-button').value = 'ON'   ;
    }else if (on == false) {
        document.querySelector('.toggle-button').classList.remove('on');
        document.querySelector('.toggle-button').classList.add('off');
        document.querySelector('.toggle-button').value = 'OFF';
    }else{
        document.querySelector('.toggle-button').value = on;
    }
    
    applyButton.addEventListener('click', async () => {
        const newLimit = parseInt(limitInput.value);
        if (newLimit >= 100 && newLimit <= 10000) {
            const result = await sendMessageToBackground({
                type: 'SET_INTERACTION_LIMIT',
                limit: newLimit
            });
            if (result && result.success) {
                applyButton.textContent = 'Applied!';
                setTimeout(() => {
                    applyButton.textContent = 'Apply';
                }, 2000);
            }
        } else {
            alert('Please enter a limit between 100 and 10000');
        }
    });

    // Initial update
    updateDisplay();
    fetchDownloadHistory();

    // Set up periodic updates
    const updateInterval = setInterval(() => {
        updateDisplay();
        fetchDownloadHistory();
    }, 1000);

    // Clean up interval when popup is closed
    window.addEventListener('unload', () => {
        clearInterval(updateInterval);
    });
}); 