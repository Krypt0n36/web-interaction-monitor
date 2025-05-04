// Store interactions in memory
let storedInteractions = {}; // Structure: { tab_id: { session_id: [interactions] } }
let downloadedSessions = [];
let interactionLimit = 5000; // Default limit
let totalStats = {
    mouse_move: 0,
    scroll: 0,
    click: 0,
    keypress: 0
};
let on = true;
// Function to load persisted data
async function loadPersistedData() {
    try {
        const data = await chrome.storage.local.get([
            'downloadedSessions',
            'interactionLimit',
            'totalStats',
            'on'
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
        if (data.on) {
            on = data.on;
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
            totalStats,
            on
        });
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

// Function to get total interaction count across all tabs and sessions
function getTotalInteractionCount() {
    return Object.values(storedInteractions).reduce((tabTotal, tabSessions) => {
        return tabTotal + Object.values(tabSessions).reduce((sessionTotal, sessionInteractions) => {
            return sessionTotal + sessionInteractions.length;
        }, 0);
    }, 0);
}

// Function to safely handle downloads
function downloadInteractions() {
    try {
        // Download storedInteractions object directly
        const jsonString = JSON.stringify(storedInteractions, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `interactions-${timestamp}.json`;
        
        // Store session info before downloading
        const sessionInfo = {
            timestamp: new Date().toISOString(),
            count: getTotalInteractionCount(),
            filename: filename,
            tabs: Object.entries(storedInteractions).map(([tabId, tabSessions]) => ({
                tab_id: tabId,
                sessions: Object.entries(tabSessions).map(([sessionId, sessionInteractions]) => ({
                    session_id: sessionId,
                    count: sessionInteractions.length,
                    stats: {
                        mouse_move: sessionInteractions.filter(i => i.action === 'mouse_move').length,
                        scroll: sessionInteractions.filter(i => i.action === 'scroll').length,
                        click: sessionInteractions.filter(i => i.action === 'click').length,
                        keypress: sessionInteractions.filter(i => i.action === 'keypress').length
                    }
                }))
            }))
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

        // Clear stored interactions after successful download
        storedInteractions = {};
    } catch (error) {
        console.error('Error downloading interactions:', error);
    }
}
// Function to safely handle messages
function handleMessage(message, sender, sendResponse) {
    try {
        if (message.type === 'INTERACTIONS') {
            if (on) {
                // Update total stats
                message.data.forEach(interaction => {
                    totalStats[interaction.action]++;
                });
                saveToStorage(); // Save after updating total stats
                
                // Add interactions to their respective tab and session groups
                message.data.forEach(interaction => {
                    // Use a default tab ID if sender.tab is not available
                    const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id.toString() : 'unknown_tab';
                    const sessionId = interaction.session_id;
                    // Initialize tab if it doesn't exist
                    if (!storedInteractions[tabId]) {
                        storedInteractions[tabId] = {};
                    }
                    
                    // Initialize session if it doesn't exist
                    if (!storedInteractions[tabId][sessionId]) {
                        storedInteractions[tabId][sessionId] = [];
                    }
                    
                    delete interaction.session_id;

                    storedInteractions[tabId][sessionId].push(interaction);
                });
                
                // Check against current interaction limit
                if (getTotalInteractionCount() > interactionLimit) {
                    // Download the current interactions before clearing
                    downloadInteractions();
                }
            }
        } else if (message.type === 'GET_INTERACTIONS') {
            if (message.showAllSessions) {
                // Combine all interactions from all tabs and sessions
                const allInteractions = Object.values(storedInteractions).reduce((acc, tabSessions) => {
                    return acc.concat(Object.values(tabSessions).flat());
                }, []);
                sendResponse(allInteractions);
            } else {
                // Send only current session from current tab
                const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id.toString() : 'unknown_tab';
                if (storedInteractions[tabId]) {
                    const sessions = Object.entries(storedInteractions[tabId]);
                    if (sessions.length > 0) {
                        const currentSession = sessions[sessions.length - 1][1];
                        sendResponse(currentSession);
                    } else {
                        sendResponse([]);
                    }
                } else {
                    sendResponse([]);
                }
            }
        } else if (message.type === 'GET_DOWNLOAD_HISTORY') {
            sendResponse(downloadedSessions);
        } else if (message.type === 'GET_TOTAL_STATS') {
            sendResponse(totalStats);
        } else if (message.type === 'GET_INTERACTION_LIMIT') {
            sendResponse({ limit: interactionLimit, on: on });
        } else if (message.type === 'SET_INTERACTION_LIMIT') {
            if (message.limit >= 100 && message.limit <= 10000) {
                interactionLimit = message.limit;
                saveToStorage(); // Save after updating limit
                sendResponse({ success: true });
            } else {
                sendResponse({ error: 'Invalid limit value' });
            }
        } else if (message.type === 'START_COLLECTING') {
            on = true;
        } else if (message.type === 'STOP_COLLECTING') {
            on = false; 
            downloadInteractions();
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
    storedInteractions = {};
    // Don't reset downloadedSessions, interactionLimit, or totalStats
}); 