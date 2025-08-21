// RAG Chatbot JavaScript
class RAGChatbot {
  constructor() {
    // Get domain from URL parameters (widget) or current location
    const urlParams = new URLSearchParams(window.location.search);
    const domain = urlParams.get("domain") || window.location.hostname;

    // Create domain-specific cache keys
    this.domain = domain;
    this.cacheKey = `chat_${domain}`;

    // Get API configuration from URL parameters or localStorage
    const apiUrlFromParams = urlParams.get("api_url");
    const apiKeyFromParams = urlParams.get("api_key");

    const currentLocation = window.location;
    const defaultEndpoint = `${currentLocation.protocol}//${currentLocation.host}`;

    this.apiEndpoint =
      apiUrlFromParams ||
      localStorage.getItem(`${this.cacheKey}_apiEndpoint`) ||
      defaultEndpoint;
    this.apiKey =
      apiKeyFromParams || localStorage.getItem(`${this.cacheKey}_apiKey`) || "";
    this.workflowId =
      localStorage.getItem(`${this.cacheKey}_workflowId`) || null;
    this.sessionId = this.generateSessionId();
    this.isConnected = false;
    this.isLoading = false;

    this.initializeElements();
    this.bindEvents();
    this.checkConnection();
    this.updateWelcomeTime();
  }

  initializeElements() {
    this.chatContainer = document.getElementById("chatContainer");
    this.messageInput = document.getElementById("messageInput");
    this.sendButton = document.getElementById("sendButton");
    this.statusIndicator = document.getElementById("statusIndicator");
    this.clearButton = document.getElementById("clearButton");
    this.settingsButton = document.getElementById("settingsButton");
    this.settingsModal = document.getElementById("settingsModal");
    this.apiEndpointInput = document.getElementById("apiEndpoint");
    this.apiKeyInput = document.getElementById("apiKey");
    this.workflowIdInput = document.getElementById("workflowId");
    this.saveSettingsButton = document.getElementById("saveSettings");
    this.closeSettingsButton = document.getElementById("closeSettings");
    this.cancelSettingsButton = document.getElementById("cancelSettings");

    // Set initial values
    if (this.apiEndpointInput) this.apiEndpointInput.value = this.apiEndpoint;
    if (this.apiKeyInput) this.apiKeyInput.value = this.apiKey;
    if (this.workflowIdInput)
      this.workflowIdInput.value = this.workflowId || "";
  }

  bindEvents() {
    // Send message events
    this.sendButton.addEventListener("click", () => this.sendMessage());
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Clear conversation
    if (this.clearButton) {
      this.clearButton.addEventListener("click", () =>
        this.clearConversation()
      );
    }

    // Settings modal events
    if (this.settingsButton) {
      this.settingsButton.addEventListener("click", () => this.showSettings());
    }
    if (this.closeSettingsButton) {
      this.closeSettingsButton.addEventListener("click", () =>
        this.hideSettings()
      );
    }
    if (this.cancelSettingsButton) {
      this.cancelSettingsButton.addEventListener("click", () =>
        this.hideSettings()
      );
    }
    if (this.saveSettingsButton) {
      this.saveSettingsButton.addEventListener("click", () =>
        this.saveSettings()
      );
    }

    // Close modal when clicking outside
    if (this.settingsModal) {
      this.settingsModal.addEventListener("click", (e) => {
        if (e.target === this.settingsModal) {
          this.hideSettings();
        }
      });
    }
  }

  generateSessionId() {
    return `chat_${this.domain}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  updateWelcomeTime() {
    // Add example question handlers
    const exampleButtons = document.querySelectorAll(".example-btn");
    exampleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const question = button.textContent.trim();
        document.getElementById("messageInput").value = question;
        this.sendMessage();
      });
    });
  }

  async checkConnection() {
    try {
      console.log("Checking connection to:", `${this.apiEndpoint}/health`);
      const response = await fetch(`${this.apiEndpoint}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        mode: "cors",
        cache: "no-cache",
      });

      console.log(
        "Health check response:",
        response.status,
        response.statusText
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Health check data:", data);
        this.setConnectionStatus(true, "Connected");
        this.enableInput();
      } else {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Connection check failed:", error);
      this.setConnectionStatus(false, "Connection failed");
      this.disableInput();

      // Retry connection after 5 seconds
      setTimeout(() => this.checkConnection(), 5000);
    }
  }

  setConnectionStatus(connected, message) {
    this.isConnected = connected;
    const indicator = this.statusIndicator.querySelector("div");
    const text = this.statusIndicator.querySelector("span");

    if (connected) {
      indicator.className = "w-1.5 h-1.5 bg-green-400 rounded-full";
      text.textContent = message || "Connected";
    } else {
      indicator.className = "w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse";
      text.textContent = message || "Connecting...";
    }
  }

  enableInput() {
    this.messageInput.disabled = false;
    this.sendButton.disabled = false;
    this.messageInput.focus();
  }

  disableInput() {
    this.messageInput.disabled = true;
    this.sendButton.disabled = true;
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isLoading || !this.isConnected) return;

    // Add user message to chat
    this.addMessage("user", message);
    this.messageInput.value = "";

    // Show typing indicator
    const typingId = this.addTypingIndicator();
    this.setLoading(true);

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["X-API-Key"] = this.apiKey;
      }

      // Use the workflow execute API
      const response = await fetch(`${this.apiEndpoint}/api/workflow/execute`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          input_data: {
            input: message,
            message: message,
            session_id: this.sessionId,
          },
          execution_config: {
            session_id: this.sessionId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Remove typing indicator and add response
      this.removeMessage(typingId);

      // Handle workflow execute API response format
      let responseText = "";
      console.log("API Response:", data);

      if (data.status === "completed" && data.result) {
        if (data.result.response) {
          responseText = data.result.response;
        } else if (data.result.message) {
          responseText = data.result.message;
        } else {
          responseText = JSON.stringify(data.result);
        }
      } else if (data.status === "failed") {
        responseText = `Error: ${data.error || "Workflow execution failed"}`;
      } else {
        responseText =
          "I apologize, but I encountered an issue processing your request.";
      }

      this.addMessage("assistant", responseText);
    } catch (error) {
      console.error("Error sending message:", error);
      this.removeMessage(typingId);
      this.addMessage(
        "assistant",
        `I'm sorry, I encountered an error: ${error.message}. Please check your connection and try again.`
      );
    } finally {
      this.setLoading(false);
    }
  }

  addMessage(sender, content, timestamp = null) {
    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    const messageTime = timestamp || new Date().toLocaleTimeString();

    const messageDiv = document.createElement("div");
    messageDiv.id = messageId;
    messageDiv.className = "message-bubble flex items-start space-x-3";

    if (sender === "user") {
      messageDiv.innerHTML = `
                  <div class="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center ml-auto">
                      <i class="fas fa-user text-white text-sm"></i>
                  </div>
                  <div class="flex-1 flex flex-col items-end">
                      <div class="bg-blue-500 text-white rounded-lg p-3 max-w-xs lg:max-w-md">
                          <p>${this.escapeHtml(content)}</p>
                      </div>
                      <div class="flex items-center mt-1 text-xs text-gray-500">
                          <span>${messageTime}</span>
                          <i class="fas fa-clock ml-1"></i>
                      </div>
                  </div>
              `;
      messageDiv.classList.add("flex-row-reverse");
    } else {
      messageDiv.innerHTML = `
                  <div class="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                      <i class="fas fa-robot text-white text-sm"></i>
                  </div>
                  <div class="flex-1">
                      <div class="bg-gray-100 rounded-lg p-3 max-w-xs lg:max-w-md">
                          <p class="text-gray-800">${this.formatMessage(
                            content
                          )}</p>
                      </div>
                      <div class="flex items-center mt-1 text-xs text-gray-500">
                          <i class="fas fa-clock mr-1"></i>
                          <span>${messageTime}</span>
                      </div>
                  </div>
              `;
    }

    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
    return messageId;
  }

  addTypingIndicator() {
    const typingId = `typing_${Date.now()}`;
    const typingDiv = document.createElement("div");
    typingDiv.id = typingId;
    typingDiv.className = "message-bubble flex items-start space-x-3";
    typingDiv.innerHTML = `
              <div class="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                  <i class="fas fa-robot text-white text-sm"></i>
              </div>
              <div class="flex-1">
                  <div class="bg-gray-100 rounded-lg p-3 max-w-xs lg:max-w-md">
                      <div class="typing-animation"></div>
                  </div>
              </div>
          `;

    this.chatContainer.appendChild(typingDiv);
    this.scrollToBottom();
    return typingId;
  }

  removeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.remove();
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.sendButton.disabled = loading || !this.isConnected;
    this.messageInput.disabled = loading || !this.isConnected;

    const icon = this.sendButton.querySelector("i");
    if (loading) {
      icon.className = "fas fa-spinner fa-spin";
    } else {
      icon.className = "fas fa-paper-plane";
    }
  }

  clearConversation() {
    if (confirm("Are you sure you want to clear the conversation?")) {
      // Keep only the welcome message
      const messages = this.chatContainer.querySelectorAll(".message-bubble");
      messages.forEach((message, index) => {
        if (index > 0) {
          // Skip first message (welcome)
          message.remove();
        }
      });

      // Generate new session ID
      this.sessionId = this.generateSessionId();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }, 100);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatMessage(content) {
    // Basic markdown-like formatting
    let formatted = this.escapeHtml(content);

    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Code blocks
    formatted = formatted.replace(
      /```(.*?)```/gs,
      '<pre class="bg-gray-800 text-green-400 p-2 rounded text-sm overflow-x-auto mt-2"><code>$1</code></pre>'
    );

    // Inline code
    formatted = formatted.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>'
    );

    // Line breaks
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }

  showSettings() {
    this.settingsModal.classList.remove("hidden");
    this.settingsModal.classList.add("flex");
  }

  hideSettings() {
    this.settingsModal.classList.add("hidden");
    this.settingsModal.classList.remove("flex");
  }

  saveSettings() {
    const newEndpoint = this.apiEndpointInput.value.trim();
    const newApiKey = this.apiKeyInput.value.trim();
    const newWorkflowId = this.workflowIdInput.value.trim();

    if (newEndpoint) {
      this.apiEndpoint = newEndpoint;
      localStorage.setItem(`${this.cacheKey}_apiEndpoint`, newEndpoint);
    }

    this.apiKey = newApiKey;
    localStorage.setItem(`${this.cacheKey}_apiKey`, newApiKey);

    this.workflowId = newWorkflowId || null;
    if (newWorkflowId) {
      localStorage.setItem(`${this.cacheKey}_workflowId`, newWorkflowId);
    } else {
      localStorage.removeItem(`${this.cacheKey}_workflowId`);
    }

    this.hideSettings();
    this.setConnectionStatus(false, "Reconnecting...");
    setTimeout(() => this.checkConnection(), 1000);
  }
}

// Initialize chatbot when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const chatbot = new RAGChatbot();

  // Make chatbot available globally for debugging
  window.chatbot = chatbot;
});
