// SafeSpace AI Chat Interface JavaScript

class ChatInterface {
    constructor() {
        this.chatContainer = document.getElementById('chatContainer');
        this.dashboardContainer = document.getElementById('dashboardContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.micBtn = document.getElementById('micBtn');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.sendBtn = document.getElementById('sendBtn');
        this.backBtn = document.getElementById('backBtn');
        this.startChatBtn = document.getElementById('startChatBtn');
        this.breathingExerciseBtn = document.getElementById('breathingExerciseBtn');
        this.breathingModal = document.getElementById('breathingModal');
        this.breathingCloseBtn = document.getElementById('breathingCloseBtn');
        this.breathingToggleBtn = document.getElementById('breathingToggleBtn');
        this.breathingResetBtn = document.getElementById('breathingResetBtn');
        this.breathingVisualizer = document.getElementById('breathingVisualizer');
        this.breathingPhaseLabel = document.getElementById('breathingPhaseLabel');
        this.breathingCount = document.getElementById('breathingCount');
        this.breathingCycle = document.getElementById('breathingCycle');
        this.breathingDot = document.getElementById('breathingDot');
        this.phaseCards = document.querySelectorAll('[data-phase-card]');
        
        this.isTyping = false;
        this.isListening = false;
        this.speechRecognition = null;
        this.speechBaseText = '';
        this.messageHistory = [];
        this.breathingState = {
            phases: [
                { key: 'inhale', label: 'Inhale', seconds: 4, progress: 0 },
                { key: 'hold-1', label: 'Hold', seconds: 4, progress: 0.25 },
                { key: 'exhale', label: 'Exhale', seconds: 4, progress: 0.5 },
                { key: 'hold-2', label: 'Hold', seconds: 4, progress: 0.75 }
            ],
            cycleTarget: 4,
            currentPhaseIndex: 0,
            remaining: 4,
            cycle: 1,
            intervalId: null,
            isRunning: false
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupAutoResize();
        this.setupSpeechRecognition();
        this.loadWelcomeMessage();
        this.updateBreathingUI();
        this.updateVoiceUI();
    }
    
    setupEventListeners() {
        // Start Chat button
        this.startChatBtn.addEventListener('click', () => {
            this.openChat();
        });

        if (this.breathingExerciseBtn) {
            this.breathingExerciseBtn.addEventListener('click', () => {
                this.openBreathingExercise();
            });
        }
        
        // Back button
        this.backBtn.addEventListener('click', () => {
            this.closeChat();
        });

        if (this.breathingCloseBtn) {
            this.breathingCloseBtn.addEventListener('click', () => {
                this.closeBreathingExercise();
            });
        }

        if (this.breathingModal) {
            this.breathingModal.addEventListener('click', (e) => {
                if (e.target === this.breathingModal) {
                    this.closeBreathingExercise();
                }
            });
        }

        if (this.breathingToggleBtn) {
            this.breathingToggleBtn.addEventListener('click', () => {
                this.toggleBreathingExercise();
            });
        }

        if (this.breathingResetBtn) {
            this.breathingResetBtn.addEventListener('click', () => {
                this.resetBreathingExercise();
                this.startBreathingExercise();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.breathingModal?.classList.contains('active')) {
                this.closeBreathingExercise();
            }
        });
        
        // Send button
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        if (this.micBtn) {
            this.micBtn.addEventListener('click', () => {
                this.toggleVoiceInput();
            });
        }
        
        // Enter key to send
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Quick response buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-response-btn')) {
                const response = e.target.dataset.response;
                this.sendQuickResponse(response);
            }
        });
        
        // Auto-hide quick responses after first message
        this.messageInput.addEventListener('input', () => {
            this.hideQuickResponses();
        });
    }
    
    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this.updateVoiceUI('Voice input is not supported in this browser.', true);
            return;
        }

        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.lang = 'en-US';
        this.speechRecognition.interimResults = true;
        this.speechRecognition.continuous = false;

        this.speechRecognition.onstart = () => {
            this.isListening = true;
            this.speechBaseText = this.messageInput.value.trim();
            this.updateVoiceUI('Listening...');
        };

        this.speechRecognition.onresult = (event) => {
            let transcript = '';

            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                transcript += event.results[i][0].transcript;
            }

            const baseText = this.speechBaseText ? `${this.speechBaseText} ` : '';
            this.messageInput.value = `${baseText}${transcript}`.trimStart();
            this.messageInput.dispatchEvent(new Event('input'));
            this.updateVoiceUI(event.results[event.results.length - 1].isFinal ? 'Voice captured.' : 'Listening...');
        };

        this.speechRecognition.onerror = (event) => {
            this.isListening = false;

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.updateVoiceUI('Microphone permission is blocked.', true);
            } else if (event.error === 'no-speech') {
                this.updateVoiceUI('No speech detected. Try again.');
            } else {
                this.updateVoiceUI('Voice input is unavailable right now.', true);
            }

            this.updateMicButton();
        };

        this.speechRecognition.onend = () => {
            this.isListening = false;
            this.updateMicButton();

            if (this.voiceStatus && this.voiceStatus.dataset.error !== 'true') {
                this.updateVoiceUI(this.messageInput.value.trim() ? 'Voice input ready.' : '');
            }
        };
    }
    
    openChat() {
        this.dashboardContainer.style.display = 'none';
        this.chatContainer.classList.add('active');
        this.messageInput.focus();
        
        // Add opening animation
        this.chatContainer.style.animation = 'fadeIn 0.3s ease';
        
        console.log('Chat opened');
    }
    
    closeChat() {
        this.stopVoiceInput();
        this.chatContainer.classList.remove('active');
        this.dashboardContainer.style.display = 'block';
        
        console.log('Chat closed');
    }

    openBreathingExercise() {
        if (!this.breathingModal) return;

        this.breathingModal.classList.add('active');
        this.breathingModal.setAttribute('aria-hidden', 'false');
        this.resetBreathingExercise();
        this.startBreathingExercise();
    }

    closeBreathingExercise() {
        if (!this.breathingModal) return;

        this.stopBreathingTimer();
        this.breathingModal.classList.remove('active');
        this.breathingModal.setAttribute('aria-hidden', 'true');
    }

    toggleBreathingExercise() {
        if (!this.breathingState.isRunning && this.breathingState.remaining === 0) {
            this.resetBreathingExercise();
        }

        if (this.breathingState.isRunning) {
            this.stopBreathingTimer();
            this.breathingToggleBtn.textContent = 'Resume';
            return;
        }

        this.startBreathingExercise();
    }

    startBreathingExercise() {
        this.stopBreathingTimer();
        this.breathingState.isRunning = true;
        if (this.breathingToggleBtn) {
            this.breathingToggleBtn.textContent = 'Pause';
        }
        this.updateBreathingUI();

        this.breathingState.intervalId = window.setInterval(() => {
            this.advanceBreathingExercise();
        }, 1000);
    }

    stopBreathingTimer() {
        if (this.breathingState.intervalId) {
            window.clearInterval(this.breathingState.intervalId);
            this.breathingState.intervalId = null;
        }
        this.breathingState.isRunning = false;
    }

    resetBreathingExercise() {
        this.stopBreathingTimer();
        this.breathingState.currentPhaseIndex = 0;
        this.breathingState.cycle = 1;
        this.breathingState.remaining = this.breathingState.phases[0].seconds;
        if (this.breathingToggleBtn) {
            this.breathingToggleBtn.textContent = 'Pause';
        }
        this.updateBreathingUI();
    }

    advanceBreathingExercise() {
        this.breathingState.remaining -= 1;

        if (this.breathingState.remaining > 0) {
            this.updateBreathingUI();
            return;
        }

        const phaseCount = this.breathingState.phases.length;
        const completedCycle = this.breathingState.currentPhaseIndex === phaseCount - 1;

        if (completedCycle) {
            if (this.breathingState.cycle >= this.breathingState.cycleTarget) {
                this.stopBreathingTimer();
                this.breathingState.remaining = 0;
                this.breathingState.currentPhaseIndex = phaseCount - 1;
                this.updateBreathingUI(true);
                if (this.breathingToggleBtn) {
                    this.breathingToggleBtn.textContent = 'Start Again';
                }
                return;
            }

            this.breathingState.cycle += 1;
        }

        this.breathingState.currentPhaseIndex = (this.breathingState.currentPhaseIndex + 1) % phaseCount;
        this.breathingState.remaining = this.getCurrentBreathingPhase().seconds;
        this.updateBreathingUI();
    }

    getCurrentBreathingPhase() {
        return this.breathingState.phases[this.breathingState.currentPhaseIndex];
    }

    updateBreathingUI(isComplete = false) {
        const phase = this.getCurrentBreathingPhase();
        if (!phase) return;

        if (this.breathingPhaseLabel) {
            this.breathingPhaseLabel.textContent = isComplete ? 'Complete' : phase.label;
        }

        if (this.breathingCount) {
            this.breathingCount.textContent = isComplete ? 'Done' : this.breathingState.remaining;
        }

        if (this.breathingCycle) {
            this.breathingCycle.textContent = isComplete
                ? 'Four calming cycles completed'
                : `Cycle ${this.breathingState.cycle} of ${this.breathingState.cycleTarget}`;
        }

        if (this.breathingVisualizer) {
            this.breathingVisualizer.dataset.phase = phase.key;
            this.breathingVisualizer.dataset.complete = isComplete ? 'true' : 'false';
            this.breathingVisualizer.style.setProperty('--breathing-progress', String(phase.progress));
        }

        this.updateBreathingDot(isComplete);

        this.phaseCards.forEach((card) => {
            const isActive = !isComplete && card.dataset.phaseCard === phase.key;
            card.classList.toggle('active', isActive);
        });
    }

    updateBreathingDot(isComplete = false) {
        if (!this.breathingDot || !this.breathingVisualizer) return;

        const phase = this.getCurrentBreathingPhase();
        const size = this.breathingVisualizer.clientWidth;
        const dotSize = this.breathingDot.offsetWidth || 22;
        const travel = Math.max(size - dotSize, 0);

        if (isComplete) {
            this.breathingDot.style.left = '0px';
            this.breathingDot.style.top = '0px';
            return;
        }

        const elapsedFraction = (phase.seconds - this.breathingState.remaining) / phase.seconds;
        let x = 0;
        let y = 0;

        if (phase.key === 'inhale') {
            x = travel * elapsedFraction;
        } else if (phase.key === 'hold-1') {
            x = travel;
            y = travel * elapsedFraction;
        } else if (phase.key === 'exhale') {
            x = travel * (1 - elapsedFraction);
            y = travel;
        } else if (phase.key === 'hold-2') {
            y = travel * (1 - elapsedFraction);
        }

        this.breathingDot.style.left = `${x}px`;
        this.breathingDot.style.top = `${y}px`;
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.stopVoiceInput();
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        // Hide quick responses
        this.hideQuickResponses();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        this.callRagApi(message);
    }

    toggleVoiceInput() {
        if (!this.speechRecognition) {
            this.updateVoiceUI('Voice input is not supported in this browser.', true);
            return;
        }

        if (this.isListening) {
            this.stopVoiceInput();
            this.updateVoiceUI(this.messageInput.value.trim() ? 'Voice input paused.' : '');
            return;
        }

        this.voiceStatus?.removeAttribute('data-error');

        try {
            this.speechRecognition.start();
        } catch (error) {
            this.updateVoiceUI('Voice input could not start.', true);
        }
    }

    stopVoiceInput() {
        if (!this.speechRecognition || !this.isListening) return;
        this.speechRecognition.stop();
    }

    updateVoiceUI(message = '', isError = false) {
        if (this.voiceStatus) {
            this.voiceStatus.textContent = message;
            this.voiceStatus.dataset.error = isError ? 'true' : 'false';
        }

        this.updateMicButton();
    }

    updateMicButton() {
        if (!this.micBtn) return;

        const unsupported = !this.speechRecognition;
        this.micBtn.disabled = unsupported;
        this.micBtn.classList.toggle('active', this.isListening);
        this.micBtn.classList.toggle('unsupported', unsupported);
        this.micBtn.setAttribute(
            'aria-label',
            unsupported ? 'Voice input unavailable' : this.isListening ? 'Stop voice input' : 'Start voice input'
        );
    }
    
    async callRagApi(userMessage) {
        try {
            const response = await fetch("http://127.0.0.1:8000/rag", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userMessage })
            });
    
            const data = await response.json();
    
            this.hideTypingIndicator();
            this.addMessage(data.reply, "bot");
    
        } catch (err) {
            this.hideTypingIndicator();
            this.addMessage("Sorry, I’m having trouble connecting right now.", "bot");
            console.error("RAG API Error:", err);
        }
    }

    
    sendQuickResponse(response) {
        this.messageInput.value = response;
        this.sendMessage();
    }
    
    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        const avatarIcon = document.createElement('div');
        avatarIcon.className = 'avatar-icon';
        avatarIcon.textContent = sender === 'user' ? '👤' : '🤖';
        
        avatarDiv.appendChild(avatarIcon);
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        
        const messageText = document.createElement('p');
        messageText.textContent = content;
        
        messageBubble.appendChild(messageText);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.getCurrentTime();
        
        messageContent.appendChild(messageBubble);
        messageContent.appendChild(messageTime);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store message in history
        this.messageHistory.push({
            content: content,
            sender: sender,
            timestamp: new Date().toISOString()
        });
    }
    
    generateBotResponse(userMessage) {
        const responses = this.getContextualResponses(userMessage);
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        this.addMessage(response, 'bot');
        
        // Add helpful suggestions for certain responses
        if (this.shouldShowSuggestions(response)) {
            setTimeout(() => {
                this.addSuggestions(response);
            }, 500);
        }
    }
    
    getContextualResponses(userMessage) {
        const message = userMessage.toLowerCase();
        
        if (message.includes('anxious') || message.includes('anxiety')) {
            return [
                "I understand you're feeling anxious. That's completely normal. Let's work through this together. Can you tell me what's making you feel this way?",
                "Anxiety can feel overwhelming, but remember that this feeling will pass. Would you like to try a breathing exercise together?",
                "You're not alone in this. Many people experience anxiety, and it's okay to feel this way. What would help you feel more grounded right now?"
            ];
        }
        
        if (message.includes('panic') || message.includes('panic attack')) {
            return [
                "I'm here with you during this panic attack. Let's focus on getting through this moment together. Can you try taking slow, deep breaths with me?",
                "Panic attacks can be scary, but they're not dangerous. You're safe, and this will pass. Let's work on grounding techniques together.",
                "I understand this feels overwhelming right now. Let's take it one breath at a time. You're doing great by reaching out."
            ];
        }
        
        if (message.includes('calm') || message.includes('calming') || message.includes('breathe')) {
            return [
                "Great! Let's focus on calming techniques. Try the 4-7-8 breathing: inhale for 4 counts, hold for 7, exhale for 8. Would you like to try this together?",
                "Breathing exercises can be very helpful. Let's start with simple deep breaths. Inhale slowly through your nose, hold for a moment, then exhale gently.",
                "I'm glad you want to focus on calming down. Sometimes counting backwards from 10 can help ground us. Would you like to try that?"
            ];
        }
        
        if (message.includes('overwhelmed') || message.includes('stress')) {
            return [
                "Feeling overwhelmed is understandable. Let's break things down into smaller, manageable pieces. What's one small thing you can focus on right now?",
                "When we feel overwhelmed, it helps to pause and take a step back. What's causing you the most stress right now?",
                "You're doing great by acknowledging these feelings. Sometimes just talking about what's overwhelming us can help. What's on your mind?"
            ];
        }
        
        if (message.includes('sad') || message.includes('depressed') || message.includes('down')) {
            return [
                "I'm sorry you're feeling down. These feelings are valid, and it's okay to not be okay sometimes. What's been weighing on your mind?",
                "Feeling sad can be really difficult. You're not alone in this. Is there something specific that's been making you feel this way?",
                "It takes courage to share these feelings. Thank you for trusting me. What would feel helpful right now?"
            ];
        }
        
        // Default responses
        return [
            "Thank you for sharing that with me. I'm here to listen and support you. Can you tell me more about what you're experiencing?",
            "I appreciate you opening up to me. How are you feeling about this situation?",
            "That sounds challenging. I'm here to help you work through this. What would be most helpful for you right now?",
            "Thank you for trusting me with your thoughts. You're doing great by reaching out. What's on your mind?",
            "I'm here to support you through this. Can you help me understand what you're going through?"
        ];
    }
    
    shouldShowSuggestions(response) {
        return response.includes('breathing') || response.includes('exercise') || response.includes('grounding');
    }
    
    addSuggestions(response) {
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'quick-responses';
        
        const suggestions = [
            "Yes, let's try breathing together",
            "I'd like to try grounding techniques",
            "Can you guide me through it?",
            "I'm ready to try"
        ];
        
        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'quick-response-btn';
            btn.textContent = suggestion;
            btn.dataset.response = suggestion;
            suggestionsDiv.appendChild(btn);
        });
        
        this.chatMessages.appendChild(suggestionsDiv);
        this.scrollToBottom();
    }
    
    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator active';
        typingDiv.id = 'typingIndicator';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        const avatarIcon = document.createElement('div');
        avatarIcon.className = 'avatar-icon';
        avatarIcon.textContent = '🤖';
        
        avatarDiv.appendChild(avatarIcon);
        
        const typingDots = document.createElement('div');
        typingDots.className = 'typing-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDots.appendChild(dot);
        }
        
        typingDiv.appendChild(avatarDiv);
        typingDiv.appendChild(typingDots);
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        this.isTyping = false;
    }
    
    hideQuickResponses() {
        const quickResponses = document.querySelectorAll('.quick-responses');
        quickResponses.forEach(response => {
            if (!response.querySelector('.quick-response-btn')) return;
            response.style.opacity = '0';
            setTimeout(() => {
                if (response.parentNode) {
                    response.remove();
                }
            }, 300);
        });
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    loadWelcomeMessage() {
        // Welcome message is already in HTML, just ensure it's visible
        console.log('Welcome message loaded');
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chatInterface = new ChatInterface();
});

// Update the original startChatSession function to use the new chat interface
function startChatSession() {
    if (window.chatInterface) {
        window.chatInterface.openChat();
    } else {
        showNotification('Starting chat session...', 'info');
        setTimeout(() => {
            showNotification('Chat session ready! 💬', 'success');
        }, 1000);
    }
}
