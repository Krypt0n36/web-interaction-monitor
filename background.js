// Store interactions in memory
let storedInteractions = [];
let downloadedSessions = [];
let interactionLimit = 1000; // Default limit
let totalStats = {
    mouse_move: 0,
    scroll: 0,
    click: 0,
    keypress: 0
};

// Function to load persisted data
async function loadPersistedData() {
    try {
        const data = await chrome.storage.local.get([
            'downloadedSessions',
            'interactionLimit',
            'totalStats'
        ]);
        
        if (data.downloadedSessions) {
            downloadedSessions = data.downloadedSessions;
        }
        if (data.interactionLimit) {
            interactionLimit = data.interactionLimit;
        }
        if (data.totalStats) {
            totalStats = data.totalStats;
        }
    } catch (error) {
        console.error('Error loading persisted data:', error);
    }
}

// Function to save data to storage
async function saveToStorage() {
    try {
        await chrome.storage.local.set({
            downloadedSessions,
            interactionLimit,
            totalStats
        });
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

// Function to safely handle downloads
function downloadInteractions(interactions) {
    try {
        const jsonString = JSON.stringify(interactions, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `interactions-${timestamp}.json`;
        
        // Store session info before downloading
        const sessionInfo = {
            timestamp: new Date().toISOString(),
            count: interactions.length,
            filename: filename,
            stats: {
                mouse_move: interactions.filter(i => i.action === 'mouse_move').length,
                scroll: interactions.filter(i => i.action === 'scroll').length,
                click: interactions.filter(i => i.action === 'click').length,
                keypress: interactions.filter(i => i.action === 'keypress').length
            }
        };
        downloadedSessions.push(sessionInfo);
        saveToStorage(); // Save after adding new session
        
        // Create a data URL instead of using Blob
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
        
        chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('Download failed:', chrome.runtime.lastError);
            }
        });
    } catch (error) {
        console.error('Error downloading interactions:', error);
    }
}

// Function to safely handle messages
function handleMessage(message, sender, sendResponse) {
    try {
        if (message.type === 'INTERACTIONS') {
            // Add timestamp to each interaction
            const interactionsWithMetadata = message.data.map(interaction => ({
                ...interaction,
                timestamp: new Date().toISOString()
            }));
            
            // Update total stats
            interactionsWithMetadata.forEach(interaction => {
                totalStats[interaction.action]++;
            });
            saveToStorage(); // Save after updating total stats
            
            storedInteractions.push(...interactionsWithMetadata);
            
            // Check against current interaction limit
            if (storedInteractions.length > interactionLimit) {
                // Download the current interactions before clearing
                downloadInteractions(storedInteractions);
                // Clear the stored interactions but keep total stats
                storedInteractions = [];
            }
        } else if (message.type === 'GET_INTERACTIONS') {
            if (message.showAllSessions) {
                // Combine current and downloaded sessions
                const allInteractions = [...storedInteractions];
                sendResponse(allInteractions);
            } else {
                // Send only current session
                sendResponse(storedInteractions);
            }
        } else if (message.type === 'GET_DOWNLOAD_HISTORY') {
            sendResponse(downloadedSessions);
        } else if (message.type === 'GET_TOTAL_STATS') {
            sendResponse(totalStats);
        } else if (message.type === 'GET_INTERACTION_LIMIT') {
            sendResponse({ limit: interactionLimit });
        } else if (message.type === 'SET_INTERACTION_LIMIT') {
            if (message.limit >= 100 && message.limit <= 10000) {
                interactionLimit = message.limit;
                saveToStorage(); // Save after updating limit
                sendResponse({ success: true });
            } else {
                sendResponse({ error: 'Invalid limit value' });
            }
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: 'Failed to process message' });
    }
    return true; // Keep the message channel open for async response
}

// Set up message listener
chrome.runtime.onMessage.addListener(handleMessage);

// Load persisted data when extension starts
loadPersistedData();

// Handle extension update/reload
chrome.runtime.onInstalled.addListener(() => {
    // Clear stored interactions but keep persisted data
    storedInteractions = [];
    // Don't reset downloadedSessions, interactionLimit, or totalStats
}); 