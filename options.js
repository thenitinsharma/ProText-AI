document.addEventListener("DOMContentLoaded", function () {
    const apiKeyInput = document.getElementById("api-key");
    const saveButton = document.getElementById("save-key");
    const statusDiv = document.getElementById("status");

    // Load API key from storage
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Save API key when button is clicked
    saveButton.addEventListener("click", function() {
        const key = apiKeyInput.value.trim();
        
        if (!key) {
            showStatus("Please enter a valid API key", true);
            return;
        }
        
        chrome.storage.sync.set({ geminiApiKey: key }, function() {
            showStatus("API key saved successfully!", false);
            
            // Verify the key was saved
            chrome.storage.sync.get(['geminiApiKey'], function(result) {
                console.log("API key saved:", result.geminiApiKey ? "Yes" : "No");
            });
        });
    });
    
    // Helper function to show status messages
    function showStatus(message, isError) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? "status error" : "status saved";
        
        // Clear the message after 3 seconds
        setTimeout(() => {
            statusDiv.textContent = "";
            statusDiv.className = "status";
        }, 3000);
    }
});