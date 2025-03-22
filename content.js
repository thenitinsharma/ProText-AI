
(function () {
    // Create the floating button with minimal black & white design
    const btn = document.createElement("div");
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
    </svg>`;
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.background = "#282828";
    btn.style.color = "white";
    btn.style.padding = "10px";
    btn.style.borderRadius = "50%";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.zIndex = "9999";
    btn.style.transition = "transform 0.2s, background-color 0.2s";
    document.body.appendChild(btn);
    
    // Add hover effect
    btn.addEventListener("mouseenter", function() {
        btn.style.transform = "scale(1.1)";
    });
    
    btn.addEventListener("mouseleave", function() {
        btn.style.transform = "scale(1)";
    });

    // Create notification element
    const notification = document.createElement("div");
    notification.style.position = "fixed";
    notification.style.bottom = "70px";
    notification.style.right = "20px";
    notification.style.background = "rgba(40, 40, 40, 0.9)";
    notification.style.color = "white";
    notification.style.padding = "12px 16px";
    notification.style.borderRadius = "8px";
    notification.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
    notification.style.fontFamily = "system-ui, -apple-system, sans-serif";
    notification.style.fontSize = "14px";
    notification.style.zIndex = "10000";
    notification.style.display = "none";

    // Flag to prevent multiple clicks
    let isProcessing = false;

    // When button is clicked
    btn.addEventListener("click", async function () {
        // Prevent multiple clicks while processing
        if (isProcessing) {
            return;
        }
        
        isProcessing = true;
        
        // Change appearance to show processing
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="0">
                <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
            </circle>
        </svg>`;
        
        let activeElement = document.activeElement;
    
        // Try to find contenteditable elements
        let contentEditableElement = document.querySelector('[contenteditable="true"]');
    
        if (contentEditableElement) {
            activeElement = contentEditableElement;
            // Focus it to ensure we're working with it
            activeElement.focus();
        }
    
        let userText = "";
    
        if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
            userText = activeElement.value;
        } else if (activeElement.isContentEditable) {
            userText = activeElement.innerText || activeElement.textContent;
        } else {
            showNotification("Click inside a text field before using this feature.");
            resetButton();
            return;
        }
    
        console.log("User Text:", userText);
        if (userText.trim() === "") {
            showNotification("Please enter some text first.");
            resetButton();
            return;
        }

        // Check if user has set API key
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            if (!result.geminiApiKey) {
                showNotification("Please set your Gemini API key in the extension options.", true);
                resetButton();
                return;
            }
            
            // Send message to background script
            chrome.runtime.sendMessage({ type: "convertText", text: userText }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError.message);
                    showNotification("An error occurred. Please try refreshing the page.", true);
                    resetButton();
                    return;
                }
                
                console.log("Response received:", response);
                
                if (response && response.convertedText) {
                    // Success case - handle the text
                    const isLinkedIn = window.location.hostname.includes('linkedin.com');
                    
                    if (isLinkedIn && activeElement.isContentEditable) {
                        handleLinkedInInput(activeElement, response.convertedText);
                    } else if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
                        handleStandardInput(activeElement, response.convertedText);
                    } else if (activeElement.isContentEditable) {
                        handleContentEditableInput(activeElement, response.convertedText);
                    }
                    
                    // Show success feedback
                    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"></path>
                    </svg>`;
                    btn.style.background = "#2e7d32";  // Success color
                    
                    setTimeout(() => {
                        resetButton();
                    }, 1500);
                } else if (response && response.error === "API_KEY_MISSING") {
                    showNotification("Please set your Gemini API key in the extension options.", true);
                    chrome.runtime.openOptionsPage(); // Open options page to set API key
                    resetButton();
                } else if (response && response.error === "API_ERROR") {
                    const errorDetails = response.details ? `: ${response.details}` : "";
                    showNotification(`API error${errorDetails}. Check your API key or try again later.`, true);
                    resetButton();
                } else {
                    console.error("No valid response received:", response);
                    showNotification("Could not convert your text. Please try again later.", true);
                    resetButton();
                }
            });
        });

        function resetButton() {
            btn.innerHTML = originalHTML;
            btn.style.background = "#282828";
            isProcessing = false;
        }
    });

    // Helper function to show notifications
    function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.style.background = isError ? "rgba(211, 47, 47, 0.9)" : "rgba(40, 40, 40, 0.9)";
        notification.style.display = "block";
        notification.style.opacity = "0";
        notification.style.transition = "opacity 0.3s ease";
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = "1";
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = "0";
            setTimeout(() => {
                notification.style.display = "none";
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Helper function specifically for LinkedIn message editor
    function handleLinkedInInput(element, text) {
        // Focus on the element
        element.focus();
        
        // Clear existing content - IMPORTANT: only do this once
        element.innerHTML = '';
        
        // Create a specific LinkedIn message structure
        const p = document.createElement('p');
        p.textContent = text;
        element.appendChild(p);
        
        // Dispatch standard events - no need for multiple methods
        const events = ['input', 'change', 'keyup', 'keydown', 'compositionend'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            element.dispatchEvent(event);
        });
        
        // Also try document.execCommand as a fallback, but don't do both
        // document.execCommand('insertText', false, text);
        
        // Look for the send button and check if it's enabled
        setTimeout(() => {
            const sendButton = document.querySelector('button[aria-label="Send"][disabled]');
            if (sendButton) {
                // If still disabled, try one more approach - manually trigger message events
                const keyEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: ' ', // Space key often triggers validation
                    keyCode: 32
                });
                element.dispatchEvent(keyEvent);
            }
        }, 500);
    }
    
    // Helper function for standard input elements
    function handleStandardInput(element, text) {
        element.focus();
        
        // Set value only once
        element.value = text;
        
        // Trigger multiple events that may be listened for
        const events = ['input', 'change', 'keyup', 'keydown', 'keypress'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            element.dispatchEvent(event);
        });
        
        // React frameworks - only use this once, not in combination with setting .value
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            element instanceof HTMLInputElement ? 
            window.HTMLInputElement.prototype : 
            window.HTMLTextAreaElement.prototype, 
            "value"
        ).set;
        
        nativeInputValueSetter.call(element, text);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Helper function for contenteditable elements
    function handleContentEditableInput(element, text) {
        element.focus();
        
        // Clear existing content - only do this once
        element.innerHTML = '';
        
        // Set new content - use ONE approach only
        const textNode = document.createTextNode(text);
        element.appendChild(textNode);
        
        // Trigger a wide range of possible events
        const events = ['input', 'change', 'keyup', 'keydown'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            element.dispatchEvent(event);
        });
        
        // Add specific events for contenteditable
        ['compositionstart', 'compositionend', 'compositionupdate'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            element.dispatchEvent(event);
        });
        
        // Focus at the end of text
        placeCaretAtEnd(element);
    }
    
    // Helper function to place caret at the end of contenteditable
    function placeCaretAtEnd(el) {
        el.focus();
        if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
})();