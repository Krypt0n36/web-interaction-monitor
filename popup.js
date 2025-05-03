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

// Function to safely send message to background
function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Extension context error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(response);
            });
        } catch (error) {
            console.error('Extension context error:', error);
            reject(error);
        }
    });
}

// Function to format the interaction data for display
function formatInteraction(interaction) {
    let details = '';
    
    switch(interaction.action) {
        case 'mouse_move':
            details = `Mouse moved to (${interaction.cursor_pos[0]}, ${interaction.cursor_pos[1]})`;
            break;
        case 'scroll':
            details = `Scrolled ${interaction.direction} to offset ${interaction.current_offset}`;
            break;
        case 'click':
            details = `Clicked on ${interaction.DOMElement.tag} at (${interaction.position[0]}, ${interaction.position[1]})`;
            break;
        case 'keypress':
            details = 'Key pressed';
            break;
    }
    
    return `
        <div class="interaction">
            <div class="timestamp">${new Date(interaction.time).toLocaleTimeString()}</div>
            <div>${details}</div>
        </div>
    `;
}

// Function to update statistics display
async function updateStats(interactions) {
    const stats = {
        mouse_move: 0,
        scroll: 0,
        click: 0,
        keypress: 0
    };

    // Calculate current session stats
    interactions.forEach(interaction => {
        stats[interaction.action]++;
    });

    // Get total stats from background
    try {
        const totalStatsResponse = await sendMessageToBackground({ type: 'GET_TOTAL_STATS' });
        if (totalStatsResponse) {
            totalStats = totalStatsResponse;
        }
    } catch (error) {
        console.error('Failed to fetch total stats:', error);
    }

    const showTotal = document.getElementById('sessionToggle').checked;
    const statsTitle = document.getElementById('statsTitle');
    statsTitle.textContent = showTotal ? 'Total Statistics' : 'Current Session Statistics';

    const displayStats = showTotal ? totalStats : stats;

    document.getElementById('mouseMoveCount').textContent = displayStats.mouse_move;
    document.getElementById('scrollCount').textContent = displayStats.scroll;
    document.getElementById('clickCount').textContent = displayStats.click;
    document.getElementById('keypressCount').textContent = displayStats.keypress;
}

// Function to update download history
function updateDownloadHistory() {
    const historyContainer = document.getElementById('downloadHistory');
    if (downloadedSessions.length === 0) {
        historyContainer.innerHTML = '<div class="history-item">No downloaded sessions yet</div>';
        return;
    }

    historyContainer.innerHTML = downloadedSessions.map(session => `
        <div class="history-item">
            <div>File: ${session.filename}</div>
            <div>Interactions: ${session.count}</div>
            <div>Date: ${new Date(session.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}

// Function to update all displays
async function updateDisplay() {
    try {
        const interactions = await sendMessageToBackground({ type: 'GET_INTERACTIONS' });
        if (interactions) {
            updateStats(interactions);
        }
    } catch (error) {
        console.error('Failed to update display:', error);
        clearInterval(updateInterval);
        document.body.innerHTML = '<div style="color: red; padding: 20px;">Extension context invalid. Please reload the extension.</div>';
    }
}

// Function to fetch download history
async function fetchDownloadHistory() {
    try {
        const sessions = await sendMessageToBackground({ type: 'GET_DOWNLOAD_HISTORY' });
        if (sessions) {
            downloadedSessions = sessions;
            updateDownloadHistory();
        }
    } catch (error) {
        console.error('Failed to fetch download history:', error);
    }
}

// Function to fetch current interaction limit
async function fetchCurrentLimit() {
    try {
        const response = await sendMessageToBackground({ type: 'GET_INTERACTION_LIMIT' });
        if (response && response.limit) {
            document.getElementById('interactionLimit').value = response.limit;
        }
    } catch (error) {
        console.error('Failed to fetch interaction limit:', error);
    }
}

// Function to validate and apply interaction limit
async function applyInteractionLimit() {
    const limitInput = document.getElementById('interactionLimit');
    const applyButton = document.getElementById('applyLimit');
    const newLimit = parseInt(limitInput.value);

    // Disable button while processing
    applyButton.disabled = true;

    if (newLimit >= 100 && newLimit <= 10000) {
        try {
            const response = await sendMessageToBackground({ 
                type: 'SET_INTERACTION_LIMIT',
                limit: newLimit
            });
            if (response && response.error) {
                limitInput.value = 1000; // Reset to default if error
                showToast('Invalid limit value. Reset to default (1000).');
            } else {
                showToast(`Interaction limit updated to ${newLimit}`);
            }
        } catch (error) {
            console.error('Failed to update interaction limit:', error);
            limitInput.value = 1000; // Reset to default if error
            showToast('Failed to update limit. Reset to default (1000).');
        }
    } else {
        limitInput.value = 1000; // Reset to default if invalid
        showToast('Invalid limit value. Reset to default (1000).');
    }

    // Re-enable button after processing
    applyButton.disabled = false;
}

// Handle interaction limit changes
document.getElementById('interactionLimit').addEventListener('input', (e) => {
    const newLimit = parseInt(e.target.value);
    const applyButton = document.getElementById('applyLimit');
    applyButton.disabled = !(newLimit >= 100 && newLimit <= 10000);
});

// Handle apply button click
document.getElementById('applyLimit').addEventListener('click', applyInteractionLimit);

// Handle session toggle
document.getElementById('sessionToggle').addEventListener('change', (e) => {
    updateDisplay(); // This will update the stats with the new toggle state
});

// Update display when popup opens
document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    fetchDownloadHistory();
    fetchCurrentLimit();
    
    // Set up periodic updates
    updateInterval = setInterval(() => {
        updateDisplay();
        fetchDownloadHistory();
    }, 1000);
});

// Clean up on popup close
window.addEventListener('unload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}); 