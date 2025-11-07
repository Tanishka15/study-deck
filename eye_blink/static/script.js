// Modern Eye Blink Detection System - JavaScript

let isDetecting = false;
let statsInterval = null;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const refreshBtn = document.getElementById('refreshBtn');
const videoFeed = document.getElementById('videoFeed');
const videoOverlay = document.getElementById('videoOverlay');
const playButton = document.getElementById('playButton');
const recordingBadge = document.getElementById('recordingBadge');
const statusIndicator = document.getElementById('statusIndicator');
const drowsinessAlert = document.getElementById('drowsinessAlert');
const statusCard = document.getElementById('statusCard');

// Stat elements
const totalBlinks = document.getElementById('totalBlinks');
const earValue = document.getElementById('earValue');
const blinkRate = document.getElementById('blinkRate');
const avgBlinkRate = document.getElementById('avgBlinkRate');
const sessionTime = document.getElementById('sessionTime');
const statusValue = document.getElementById('statusValue');

// Setting elements
const earThreshold = document.getElementById('earThreshold');
const earThresholdValue = document.getElementById('earThresholdValue');
const consecFrames = document.getElementById('consecFrames');
const consecFramesValue = document.getElementById('consecFramesValue');
const drowsinessThreshold = document.getElementById('drowsinessThreshold');
const drowsinessThresholdValue = document.getElementById('drowsinessThresholdValue');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Eye Blink Detection System initialized');
    setupEventListeners();
    updateStats(); // Initial stats load
});

// Event Listeners
function setupEventListeners() {
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);
    resetBtn.addEventListener('click', resetCounters);
    exportBtn.addEventListener('click', exportData);
    refreshBtn.addEventListener('click', updateStats);
    playButton.addEventListener('click', startDetection);
    
    // Settings sliders
    earThreshold.addEventListener('input', function() {
        earThresholdValue.textContent = this.value;
        updateSettings();
    });
    
    consecFrames.addEventListener('input', function() {
        consecFramesValue.textContent = this.value;
        updateSettings();
    });
    
    drowsinessThreshold.addEventListener('input', function() {
        drowsinessThresholdValue.textContent = this.value;
        updateSettings();
    });
}

// Start Detection
async function startDetection() {
    try {
        const response = await fetch('/api/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            isDetecting = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            // Show video feed
            videoFeed.src = '/video_feed';
            videoOverlay.classList.add('hidden');
            recordingBadge.style.display = 'flex';
            
            // Update status
            updateStatusIndicator('Detecting', true);
            
            // Start stats update interval
            statsInterval = setInterval(updateStats, 500);
            
            showNotification('Detection started successfully!', 'success');
        } else {
            showNotification('Failed to start detection: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error starting detection:', error);
        showNotification('Error starting detection', 'error');
    }
}

// Stop Detection
async function stopDetection() {
    try {
        const response = await fetch('/api/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            isDetecting = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            
            // Hide video feed
            videoFeed.src = '';
            videoOverlay.classList.remove('hidden');
            recordingBadge.style.display = 'none';
            
            // Update status
            updateStatusIndicator('Stopped', false);
            
            // Stop stats update
            if (statsInterval) {
                clearInterval(statsInterval);
                statsInterval = null;
            }
            
            showNotification('Detection stopped', 'info');
        }
    } catch (error) {
        console.error('Error stopping detection:', error);
        showNotification('Error stopping detection', 'error');
    }
}

// Reset Counters
async function resetCounters() {
    if (!confirm('Are you sure you want to reset all counters?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStats();
            showNotification('Counters reset successfully!', 'success');
        }
    } catch (error) {
        console.error('Error resetting counters:', error);
        showNotification('Error resetting counters', 'error');
    }
}

// Export Data
async function exportData() {
    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Data exported to: ' + data.filepath, 'success');
        } else {
            showNotification('Export failed: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Error exporting data', 'error');
    }
}

// Update Statistics
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Update values with animations
        animateValue(totalBlinks, parseInt(totalBlinks.textContent), stats.total_blinks);
        earValue.textContent = stats.current_ear.toFixed(3);
        blinkRate.textContent = stats.blink_rate.toFixed(1);
        avgBlinkRate.textContent = stats.avg_blink_rate.toFixed(1);
        sessionTime.textContent = stats.session_duration.toFixed(1) + 's';
        statusValue.textContent = stats.status;
        
        // Update status card color
        if (stats.is_drowsy) {
            statusCard.style.background = 'linear-gradient(135deg, rgba(255, 71, 87, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%)';
            statusCard.style.borderColor = 'var(--danger-color)';
            statusValue.style.color = 'var(--danger-color)';
            drowsinessAlert.style.display = 'flex';
        } else {
            statusCard.style.background = 'linear-gradient(135deg, rgba(26, 31, 58, 0.8) 0%, rgba(21, 25, 48, 0.8) 100%)';
            statusCard.style.borderColor = 'rgba(0, 255, 100, 0.1)';
            statusValue.style.color = 'var(--primary-color)';
            drowsinessAlert.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Update Settings
async function updateSettings() {
    try {
        const settings = {
            ear_threshold: parseFloat(earThreshold.value),
            consec_frames: parseInt(consecFrames.value),
            drowsiness_threshold: parseFloat(drowsinessThreshold.value)
        };
        
        await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
    } catch (error) {
        console.error('Error updating settings:', error);
    }
}

// Update Status Indicator
function updateStatusIndicator(text, active) {
    const statusText = statusIndicator.querySelector('.status-text');
    const statusDot = statusIndicator.querySelector('.status-dot');
    
    statusText.textContent = text;
    
    if (active) {
        statusDot.style.background = 'var(--success-color)';
        statusIndicator.style.background = 'rgba(0, 255, 100, 0.1)';
        statusIndicator.style.borderColor = 'rgba(0, 255, 100, 0.3)';
    } else {
        statusDot.style.background = 'var(--warning-color)';
        statusIndicator.style.background = 'rgba(255, 165, 0, 0.1)';
        statusIndicator.style.borderColor = 'rgba(255, 165, 0, 0.3)';
    }
}

// Animate Number Changes
function animateValue(element, start, end, duration = 300) {
    if (start === end) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '10px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        animation: 'slideIn 0.3s ease-out',
        boxShadow: '0 5px 20px rgba(0, 0, 0, 0.3)'
    });
    
    // Set color based on type
    const colors = {
        success: 'linear-gradient(135deg, #00d084, #00ff64)',
        error: 'linear-gradient(135deg, #ff4757, #ffa502)',
        info: 'linear-gradient(135deg, #0066cc, #00a8ff)',
        warning: 'linear-gradient(135deg, #e67e22, #ffa500)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Handle page visibility
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isDetecting) {
        console.log('Page hidden, detection continues in background');
    } else if (!document.hidden && isDetecting) {
        console.log('Page visible again');
        updateStats();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function(e) {
    if (isDetecting) {
        e.preventDefault();
        e.returnValue = 'Detection is running. Are you sure you want to leave?';
        return e.returnValue;
    }
});

console.log('🎉 Eye Blink Detection System Ready!');
