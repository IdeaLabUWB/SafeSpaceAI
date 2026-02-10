// SafeSpace AI Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user data
    loadUserData();
});

function initializeDashboard() {
    console.log('SafeSpace AI Dashboard initialized');
    
    // Add smooth animations
    animateCards();
    
    // Set current time
    updateTime();
}

function setupEventListeners() {
    // Mood selection buttons
    const moodButtons = document.querySelectorAll('.mood-btn');
    moodButtons.forEach(button => {
        button.addEventListener('click', function() {
            selectMood(this);
        });
    });
    
    // Action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            handleActionClick(this);
        });
    });
    
    // Resource links
    const resourceLinks = document.querySelectorAll('.resource-link');
    resourceLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleResourceClick(this);
        });
    });
}

function selectMood(button) {
    // Remove previous selection
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selection to clicked button
    button.classList.add('selected');
    
    // Get mood data
    const mood = button.dataset.mood;
    const moodEmoji = button.textContent;
    
    // Store mood selection
    localStorage.setItem('currentMood', JSON.stringify({
        mood: mood,
        emoji: moodEmoji,
        timestamp: new Date().toISOString()
    }));
    
    // Show feedback
    showMoodFeedback(mood);
    
    console.log(`Mood selected: ${mood}`);
}

function showMoodFeedback(mood) {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = 'mood-feedback';
    feedback.textContent = getMoodMessage(mood);
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-sage);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(feedback);
    
    // Remove after 3 seconds
    setTimeout(() => {
        feedback.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 300);
    }, 3000);
}

function getMoodMessage(mood) {
    const messages = {
        'great': 'Wonderful! Keep up the positive energy! 🌟',
        'good': 'That\'s great to hear! 😊',
        'okay': 'It\'s okay to have neutral days. 💙',
        'anxious': 'I\'m here to help. Let\'s work through this together. 🤗',
        'overwhelmed': 'Take a deep breath. You\'re not alone. 💙'
    };
    return messages[mood] || 'Thank you for sharing how you feel.';
}

function handleActionClick(button) {
    const actionText = button.querySelector('.btn-text').textContent;
    
    // Add click animation
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
    
    // Handle different actions
    switch(actionText) {
        case 'Start Chat':
            startChatSession();
            break;
        case 'Breathing Exercise':
            startBreathingExercise();
            break;
        case 'Journal Entry':
            openJournal();
            break;
        default:
            console.log(`Action clicked: ${actionText}`);
    }
}

function startChatSession() {
    // Simulate starting a chat session
    showNotification('Starting chat session...', 'info');
    
    // In a real app, this would navigate to the chat interface
    setTimeout(() => {
        showNotification('Chat session ready! 💬', 'success');
    }, 1000);
}

function startBreathingExercise() {
    // Simulate starting breathing exercise
    showNotification('Preparing breathing exercise...', 'info');
    
    // In a real app, this would open the breathing exercise interface
    setTimeout(() => {
        showNotification('Breathing exercise started 🧘', 'success');
    }, 1000);
}

function openJournal() {
    // Simulate opening journal
    showNotification('Opening journal...', 'info');
    
    // In a real app, this would open the journal interface
    setTimeout(() => {
        showNotification('Journal ready for your thoughts 📝', 'success');
    }, 1000);
}

function handleResourceClick(link) {
    const resourceText = link.querySelector('.resource-text')?.textContent?.trim() ?? '';
    
    if (resourceText === 'Calming Sounds') {
        if (typeof window.toggleSoundCloudWidget === 'function') {
            window.toggleSoundCloudWidget();
        }
        return;
    }
    
    // Add click animation
    link.style.transform = 'translateX(8px)';
    setTimeout(() => {
        link.style.transform = '';
    }, 200);
    
    showNotification(`Opening ${resourceText}...`, 'info');
    
    // In a real app, this would open the resource
    setTimeout(() => {
        showNotification(`${resourceText} loaded 📚`, 'success');
    }, 1000);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
        'info': 'var(--accent-blue)',
        'success': 'var(--accent-green)',
        'warning': 'var(--primary-peach)',
        'error': 'var(--primary-blush)'
    };
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-weight: 500;
        animation: slideInUp 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function animateCards() {
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Update any time displays if they exist
    const timeElements = document.querySelectorAll('.current-time');
    timeElements.forEach(element => {
        element.textContent = timeString;
    });
}

function loadUserData() {
    // Load saved mood if available
    const savedMood = localStorage.getItem('currentMood');
    if (savedMood) {
        try {
            const moodData = JSON.parse(savedMood);
            const moodButton = document.querySelector(`[data-mood="${moodData.mood}"]`);
            if (moodButton) {
                moodButton.classList.add('selected');
            }
        } catch (e) {
            console.log('Error loading saved mood:', e);
        }
    }
    
    // Simulate loading user progress data
    setTimeout(() => {
        console.log('User data loaded');
    }, 500);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
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
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes slideInUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
