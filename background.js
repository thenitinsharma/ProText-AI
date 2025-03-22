chrome.runtime.onInstalled.addListener(() => {
    console.log("ProMessage Extension Installed");
    
    // Set default settings if not already set
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
        if (!result.geminiApiKey) {
            chrome.runtime.openOptionsPage();
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message.type);
    
    if (message.type === "convertText") {
        // Get API key from storage
        chrome.storage.sync.get(['geminiApiKey'], function(result) {
            if (!result.geminiApiKey) {
                console.log("API key missing");
                sendResponse({ error: "API_KEY_MISSING" });
                return;
            }
            
            // Call the API with the text
            convertToProfessional(message.text, result.geminiApiKey)
                .then(convertedText => {
                    console.log("API request successful");
                    sendResponse({ convertedText: convertedText });
                })
                .catch(error => {
                    console.error("API request failed:", error);
                    sendResponse({ error: "API_ERROR", details: error.message });
                });
        });
        
        return true; // Keep the message channel open for the async response
    }
    
    if (message.type === "ping") {
        sendResponse({ status: "alive" });
        return true;
    }
});

/**
 * Converts casual text to professional language using the Gemini API
 * @param {string} text - Text to convert
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} - Converted text
 */
async function convertToProfessional(text, apiKey) {
    console.log("Converting text with Gemini API");
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Convert this to a professional message with a polite tone while maintaining the original intent: ${text}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024
                    }
                })
            }
        );
        
        // Check if response is OK
        if (!response.ok) {
            const errorData = await response.json();
            console.error("API response not OK:", response.status, errorData);
            throw new Error(errorData.error?.message || `API returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API Response received:", data);
        
        // Properly extract the response text from Gemini API
        if (data.candidates && data.candidates[0]?.content?.parts && data.candidates[0].content.parts[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.error("Unexpected API response structure:", data);
            throw new Error("Invalid API response format");
        }
    } catch (error) {
        console.error("Error in convertToProfessional:", error);
        throw error;
    }
}