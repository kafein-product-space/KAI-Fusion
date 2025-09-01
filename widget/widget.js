/**
 * KAI-Fusion Widget - Pure JavaScript Chat Widget
 * Makes direct requests to target API without backend dependency
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        targetUrl: '',
        apiKey: '',
        position: 'right',
        color: '#2563eb',
        width: '400px',
        height: '600px',
        label: '💬'
    };

    // Widget state
    let isOpen = false;
    let elements = {};
    let sessionId = null;

    // Initialize widget
    function init() {
        // Get configuration from script attributes
        const script = document.currentScript || getCurrentScript();
        if (script) {
            const dataset = script.dataset || {};
            config.targetUrl = dataset.targetUrl || '';
            config.apiKey = dataset.apiKey || '';
            config.position = dataset.position || 'right';
            config.color = dataset.color || '#2563eb';
            config.width = dataset.width || '400px';
            config.height = dataset.height || '600px';
            config.label = dataset.label || '💬';
        }

        // Validate configuration
        if (!config.targetUrl) {
            console.error('[KAI Widget] Target URL is required');
            return;
        }

        // Generate session ID
        sessionId = generateSessionId();

        // Create widget elements
        createWidget();

        // Expose global API
        window.KAIWidget = {
            show: showWidget,
            hide: hideWidget,
            toggle: toggleWidget,
            updateConfig: updateConfig,
            getConfig: () => ({ ...config })
        };

        console.log('[KAI Widget] Initialized successfully');
    }

    function getCurrentScript() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    }

    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function createWidget() {
        // Create widget button
        elements.button = createElement('button', {
            id: 'kai-widget-button',
            className: 'kai-widget-button',
            innerHTML: config.label,
            onclick: toggleWidget
        });

        // Create widget container
        elements.container = createElement('div', {
            id: 'kai-widget-container',
            className: 'kai-widget-container'
        });

        // Create chat interface
        elements.chat = createChatInterface();
        elements.container.appendChild(elements.chat);

        // Apply styles
        applyStyles();

        // Add to DOM
        document.body.appendChild(elements.button);
        document.body.appendChild(elements.container);
    }

    function createElement(tag, props) {
        const element = document.createElement(tag);
        Object.keys(props).forEach(key => {
            if (key === 'onclick') {
                element.addEventListener('click', props[key]);
            } else {
                element[key] = props[key];
            }
        });
        return element;
    }

    function createChatInterface() {
        const chat = createElement('div', {
            className: 'kai-chat-interface',
            innerHTML: `
                <div class="kai-chat-header">
                    <div class="kai-chat-title">
                        <span class="kai-chat-icon">🤖</span>
                        KAI-Fusion AI
                    </div>
                    <button class="kai-chat-close" onclick="window.KAIWidget.hide()">×</button>
                </div>
                <div class="kai-chat-messages" id="kai-chat-messages">
                    <div class="kai-welcome-message">
                        <div class="kai-message kai-message-bot">
                            <div class="kai-message-content">
                                Hello! I'm your AI assistant. How can I help you today?
                            </div>
                        </div>
                    </div>
                </div>
                <div class="kai-chat-input">
                    <input type="text" id="kai-message-input" placeholder="Type your message..." />
                    <button id="kai-send-button">
                        <span class="kai-send-icon">→</span>
                    </button>
                </div>
                <div class="kai-chat-status">
                    <div class="kai-status-indicator" id="kai-status-indicator">
                        <span class="kai-status-dot"></span>
                        <span class="kai-status-text">Ready</span>
                    </div>
                </div>
            `
        });

        // Add event listeners
        setTimeout(() => {
            const messageInput = document.getElementById('kai-message-input');
            const sendButton = document.getElementById('kai-send-button');

            if (messageInput && sendButton) {
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') sendMessage();
                });
                sendButton.addEventListener('click', sendMessage);
            }
        }, 0);

        return chat;
    }

    function applyStyles() {
        const styles = `
            .kai-widget-button {
                position: fixed;
                bottom: 20px;
                ${config.position}: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: ${config.color};
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                transition: all 0.3s ease;
            }
            
            .kai-widget-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            }
            
            .kai-widget-container {
                position: fixed;
                bottom: 100px;
                ${config.position}: 20px;
                width: ${config.width};
                height: ${config.height};
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                z-index: 9998;
                display: none;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }
            
            .kai-chat-interface {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .kai-chat-header {
                background: ${config.color};
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .kai-chat-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
            }
            
            .kai-chat-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .kai-chat-close:hover {
                background: rgba(255,255,255,0.1);
            }
            
            .kai-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .kai-message {
                display: flex;
                max-width: 85%;
            }
            
            .kai-message-bot {
                align-self: flex-start;
            }
            
            .kai-message-user {
                align-self: flex-end;
            }
            
            .kai-message-content {
                padding: 12px 16px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .kai-message-bot .kai-message-content {
                background: #f1f3f5;
                color: #333;
            }
            
            .kai-message-user .kai-message-content {
                background: ${config.color};
                color: white;
            }
            
            .kai-chat-input {
                border-top: 1px solid #e9ecef;
                padding: 16px 20px;
                display: flex;
                gap: 12px;
                align-items: center;
            }
            
            #kai-message-input {
                flex: 1;
                border: 1px solid #e9ecef;
                border-radius: 24px;
                padding: 10px 16px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
            }
            
            #kai-message-input:focus {
                border-color: ${config.color};
            }
            
            #kai-send-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: ${config.color};
                color: white;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: transform 0.2s;
            }
            
            #kai-send-button:hover {
                transform: scale(1.1);
            }
            
            #kai-send-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .kai-chat-status {
                border-top: 1px solid #e9ecef;
                padding: 8px 20px;
                background: #f8f9fa;
            }
            
            .kai-status-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #6c757d;
            }
            
            .kai-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #28a745;
            }
            
            .kai-status-dot.connecting {
                background: #ffc107;
                animation: kai-pulse 2s infinite;
            }
            
            .kai-status-dot.error {
                background: #dc3545;
            }
            
            @keyframes kai-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .kai-typing-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 8px 16px;
                background: #f1f3f5;
                border-radius: 18px;
                font-size: 14px;
                color: #6c757d;
            }
            
            .kai-typing-dots {
                display: flex;
                gap: 2px;
            }
            
            .kai-typing-dots span {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: #6c757d;
                animation: kai-typing 1.4s infinite;
            }
            
            .kai-typing-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .kai-typing-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes kai-typing {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
            }
        `;

        // Add styles to page
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    function showWidget() {
        elements.container.style.display = 'block';
        isOpen = true;
    }

    function hideWidget() {
        elements.container.style.display = 'none';
        isOpen = false;
    }

    function toggleWidget() {
        if (isOpen) {
            hideWidget();
        } else {
            showWidget();
        }
    }

    function updateConfig(newConfig) {
        Object.assign(config, newConfig);
        console.log('[KAI Widget] Configuration updated:', config);
    }

    function setStatus(message, type = 'ready') {
        const statusIndicator = document.getElementById('kai-status-indicator');
        if (statusIndicator) {
            const dot = statusIndicator.querySelector('.kai-status-dot');
            const text = statusIndicator.querySelector('.kai-status-text');
            
            if (dot && text) {
                dot.className = `kai-status-dot ${type}`;
                text.textContent = message;
            }
        }
    }

    function addMessage(content, isUser = false) {
        const messagesContainer = document.getElementById('kai-chat-messages');
        if (!messagesContainer) return;

        const messageDiv = createElement('div', {
            className: `kai-message ${isUser ? 'kai-message-user' : 'kai-message-bot'}`,
            innerHTML: `<div class="kai-message-content">${content}</div>`
        });

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTypingIndicator() {
        const messagesContainer = document.getElementById('kai-chat-messages');
        if (!messagesContainer) return;

        const typingDiv = createElement('div', {
            id: 'kai-typing-indicator',
            className: 'kai-message kai-message-bot',
            innerHTML: `
                <div class="kai-typing-indicator">
                    Typing
                    <div class="kai-typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `
        });

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('kai-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async function sendMessage() {
        const messageInput = document.getElementById('kai-message-input');
        const sendButton = document.getElementById('kai-send-button');
        
        if (!messageInput || !messageInput.value.trim()) return;

        const message = messageInput.value.trim();
        messageInput.value = '';
        sendButton.disabled = true;

        // Add user message
        addMessage(message, true);

        // Show typing indicator
        showTypingIndicator();
        setStatus('Thinking...', 'connecting');

        try {
            const response = await sendToAPI(message);
            removeTypingIndicator();
            addMessage(response);
            setStatus('Ready', 'ready');
        } catch (error) {
            console.error('[KAI Widget] API Error:', error);
            removeTypingIndicator();
            addMessage('Sorry, I encountered an error. Please try again.', false);
            setStatus('Error', 'error');
        } finally {
            sendButton.disabled = false;
        }
    }

    async function sendToAPI(message) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            headers['X-API-Key'] = config.apiKey;
        }

        // Use only the working endpoint
        const url = config.targetUrl + '/api/workflow/execute';
        const payload = {
                input: message,
                message: message,
                session_id: sessionId
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return extractResponse(data);
        }

        throw new Error('API request failed');
    }

    function extractResponse(data) {
        // Try different response formats
        if (data.response) return data.response;
        if (data.result && data.result.response) return data.result.response;
        if (data.message) return data.message;
        if (data.text) return data.text;
        if (data.content) return data.content;
        
        // Fallback
        return typeof data === 'string' ? data : 'I received your message but couldn\'t parse the response.';
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();