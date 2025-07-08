// Global variables
let currentLanguage = 'en';
let map1, map2;
let markers2 = [];
let drawnItems;
let drawControl;
let isDrawing = false;
let speechRecognition = null;
let currentRecordingField = null;
let isProcessingMarkers = false; // Add flag to prevent multiple processing
let actionHistory = []; // Track drawing actions for undo functionality

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    currentLanguage = localStorage.getItem('language') || 'en';
    updateLanguageButtons();
    updateTexts();
    updateSection1Image(currentLanguage);
    updateLikertLabels(currentLanguage); // <-- Add this line
    initializeSpeechRecognition();
    setTimeout(initializeMaps, 100);
});

function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateLanguageButtons();
    updateTexts();
    updateSection1Image(lang);
    updateLikertLabels(lang); // <-- Add this line
    if (speechRecognition) {
        speechRecognition.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
    }
    setupSpeechButtons();
}

function updateSection1Image(lang) {
    const img = document.getElementById('section1-image');
    if (!img) return;
    if (lang === 'pl') {
        img.src = 'picturePOL.png';
    } else {
        img.src = 'picture.jpg';
    }
}

function updateLikertLabels(lang) {
    let first = '1: Strongly disagree';
    let last = '7: Strongly agree';
    if (lang === 'pl') {
        first = '1: Zdecydowanie nie zgadzam się';
        last = '7: Zdecydowanie zgadzam się';
    }
    document.querySelectorAll('.likert-7').forEach(likert => {
        // Skip the picture response likert
        if (likert.querySelector('input[name="picture_response"]')) return;
        const labels = likert.querySelectorAll('label');
        if (labels.length === 7) {
            labels[0].querySelector('span').textContent = first;
            labels[6].querySelector('span').textContent = last;
        }
    });
}

function updateSection1Image(lang) {
    const img = document.getElementById('section1-image');
    if (!img) return;
    if (lang === 'pl') {
        img.src = 'picturePOL.png';
    } else {
        img.src = 'picture.jpg';
    }
}

function updateLanguageButtons() {
    document.querySelectorAll('.language-switcher button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`lang-${currentLanguage}`).classList.add('active');
}

function updateTexts() {
    const texts = translations[currentLanguage];
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (texts[key]) {
            if (element.innerHTML.includes('<')) {
                // If it contains HTML, use innerHTML
                element.innerHTML = texts[key];
            } else {
                element.textContent = texts[key];
            }
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (texts[key]) {
            element.placeholder = texts[key];
        }
    });
    
    // Update document title
    document.title = texts['title'];
}

function initializeSpeechRecognition() {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.log('Speech recognition not supported in this browser');
        // Disable speech buttons
        document.querySelectorAll('.speech-btn').forEach(btn => {
            btn.disabled = true;
            btn.title = 'Speech recognition not supported in this browser';
            btn.innerHTML = '🚫';
        });
        return;
    }
    
    speechRecognition = new SpeechRecognition();
    
    // Improved settings for better recognition
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.maxAlternatives = 3; // Get more alternatives for better accuracy
    
    // Set language based on current language preference
    speechRecognition.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
    
    // Event handlers
    speechRecognition.onstart = function() {
        console.log('Speech recognition started');
        if (currentRecordingField) {
            const btn = currentRecordingField.nextElementSibling;
            btn.classList.add('recording');
            btn.innerHTML = '🎙️ Recording...';
            btn.title = 'Click to stop recording';
            
            // Add visual feedback
            showRecordingFeedback(true);
        }
    };
    
    speechRecognition.onresult = function(event) {
        if (!currentRecordingField) return;
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            // Use the best alternative (highest confidence)
            let bestTranscript = event.results[i][0].transcript;
            let bestConfidence = event.results[i][0].confidence;
            
            // Check for better alternatives
            for (let j = 1; j < event.results[i].length; j++) {
                if (event.results[i][j].confidence > bestConfidence) {
                    bestTranscript = event.results[i][j].transcript;
                    bestConfidence = event.results[i][j].confidence;
                }
            }
            
            if (event.results[i].isFinal) {
                finalTranscript += bestTranscript;
            } else {
                interimTranscript += bestTranscript;
            }
        }
        
        // Update textarea with final transcript
        if (finalTranscript) {
            const currentText = currentRecordingField.value;
            const separator = currentText && !currentText.endsWith(' ') && !currentText.endsWith('\n') ? ' ' : '';
            currentRecordingField.value = currentText + separator + finalTranscript.trim();
            
            // Trigger input event for any listeners
            currentRecordingField.dispatchEvent(new Event('input'));
        }
        
        // Show interim results as placeholder or in a helper div
        if (interimTranscript && currentRecordingField) {
            showInterimFeedback(interimTranscript);
        }
    };
    
    speechRecognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        
        const texts = translations[currentLanguage];
        let errorMessage = 'Speech recognition error: ' + event.error;
        
        switch(event.error) {
            case 'not-allowed':
                errorMessage = texts['speech-permission-error'] || 'Please allow microphone access to use speech recognition.';
                break;
            case 'no-speech':
                errorMessage = texts['speech-no-speech-error'] || 'No speech detected. Please try speaking louder or closer to the microphone.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone was found. Please check your microphone connection.';
                break;
            case 'network':
                errorMessage = 'Network error occurred during speech recognition.';
                break;
            case 'aborted':
                // Don't show error for user-initiated stops
                break;
            default:
                errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
        }
        
        if (event.error !== 'aborted') {
            showMessage(errorMessage, 'error');
        }
        
        stopRecording();
    };
    
    speechRecognition.onend = function() {
        console.log('Speech recognition ended');
        stopRecording();
    };
    
    // Setup speech button event listeners
    setupSpeechButtons();
}

function showRecordingFeedback(isRecording) {
    const recordingIndicator = document.getElementById('recording-indicator');
    if (!recordingIndicator) {
        // Create recording indicator if it doesn't exist
        const indicator = document.createElement('div');
        indicator.id = 'recording-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #dc3545;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 1000;
            display: none;
            animation: pulse 1.5s infinite;
        `;
        indicator.innerHTML = '🎙️ Recording...';
        document.body.appendChild(indicator);
    }
    
    document.getElementById('recording-indicator').style.display = isRecording ? 'block' : 'none';
}

function showInterimFeedback(interimText) {
    if (!currentRecordingField) return;
    
    let feedbackDiv = document.getElementById('interim-feedback');
    if (!feedbackDiv) {
        feedbackDiv = document.createElement('div');
        feedbackDiv.id = 'interim-feedback';
        feedbackDiv.style.cssText = `
            position: absolute;
            background: rgba(45, 138, 71, 0.9);
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            max-width: 300px;
            word-wrap: break-word;
            z-index: 100;
            pointer-events: none;
        `;
        currentRecordingField.parentNode.style.position = 'relative';
        currentRecordingField.parentNode.appendChild(feedbackDiv);
    }
    
    feedbackDiv.textContent = `Listening: "${interimText.trim()}"`;
    feedbackDiv.style.display = 'block';
    
    // Position it near the textarea
    const rect = currentRecordingField.getBoundingClientRect();
    feedbackDiv.style.top = (currentRecordingField.offsetTop - 30) + 'px';
    feedbackDiv.style.left = currentRecordingField.offsetLeft + 'px';
}

function hideInterimFeedback() {
    const feedbackDiv = document.getElementById('interim-feedback');
    if (feedbackDiv) {
        feedbackDiv.style.display = 'none';
    }
}

function setupSpeechButtons() {
    const speechButtons = document.querySelectorAll('.speech-btn');
    
    speechButtons.forEach(btn => {
        btn.innerHTML = '🎤';
        btn.title = 'Click to start voice recording';
        
        // Remove existing listeners to prevent duplicates
        btn.removeEventListener('click', handleSpeechButtonClick);
        btn.addEventListener('click', handleSpeechButtonClick);
    });
}

function handleSpeechButtonClick(event) {
    const btn = event.target;
    const textarea = btn.previousElementSibling;
    
    if (currentRecordingField && currentRecordingField === textarea) {
        // Stop recording
        stopRecording();
    } else {
        // Start recording
        startRecording(textarea);
    }
}

function startRecording(textarea) {
    if (!speechRecognition) {
        showMessage('Speech recognition not available in this browser.', 'error');
        return;
    }
    
    // Stop any ongoing recording
    if (currentRecordingField) {
        stopRecording();
    }
    
    currentRecordingField = textarea;
    
    // Update language if it has changed
    speechRecognition.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
    
    // Check for microphone permission first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                // Permission granted, stop the stream and start speech recognition
                stream.getTracks().forEach(track => track.stop());
                
                try {
                    speechRecognition.start();
                } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    showMessage('Could not start speech recognition. Please try again.', 'error');
                    currentRecordingField = null;
                }
            })
            .catch(function(error) {
                console.error('Microphone permission denied:', error);
                showMessage('Microphone access denied. Please allow microphone access to use voice recording.', 'error');
                currentRecordingField = null;
            });
    } else {
        // Fallback for older browsers
        try {
            speechRecognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            showMessage('Could not start speech recognition. Please try again.', 'error');
            currentRecordingField = null;
        }
    }
}

function stopRecording() {
    if (speechRecognition && currentRecordingField) {
        try {
            speechRecognition.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
        
        const btn = currentRecordingField.nextElementSibling;
        btn.classList.remove('recording');
        btn.innerHTML = '🎤';
        btn.title = 'Click to start voice recording';
        
        showRecordingFeedback(false);
        hideInterimFeedback();
        
        currentRecordingField = null;
    }
}

function initializeMaps() {
    // Initialize map 1 for important places
    if (document.getElementById('map1')) {
        map1 = L.map('map1').setView([50.0647, 19.9450], 12); // Krakow center
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map1);
        
        // Initialize drawing layer
        drawnItems = new L.FeatureGroup();
        map1.addLayer(drawnItems);
        
        // Setup drawing controls (initially disabled)
        drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: {
                        color: '#2d8a47',
                        weight: 2,
                        opacity: 0.8,
                        fillOpacity: 0.3
                    }
                },
                polyline: {
                    shapeOptions: {
                        color: '#2d8a47',
                        weight: 3,
                        opacity: 0.8
                    }
                },
                rectangle: {
                    showArea: true,
                    shapeOptions: {
                        color: '#2d8a47',
                        weight: 2,
                        opacity: 0.8,
                        fillOpacity: 0.3
                    }
                },
                marker: {
                    icon: new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                },
                circle: false, // Remove circle as requested
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });
        
        // Don't add the control to map yet - we'll control it manually
        
        // Track current drawing state for vertex-level undo (make global)
        window.currentDrawing = null;
        window.drawingVertices = [];
        
        // Setup drawing event handlers
        map1.on(L.Draw.Event.DRAWSTART, function(e) {
            window.currentDrawing = e.layerType;
            window.drawingVertices = [];
            console.log('Drawing started:', window.currentDrawing);
        });
        
        map1.on(L.Draw.Event.DRAWVERTEX, function(e) {
            if (e.layers) {
                window.drawingVertices = [];
                e.layers.eachLayer(function(layer) {
                    if (layer.getLatLngs) {
                        const latlngs = layer.getLatLngs();
                        if (Array.isArray(latlngs[0])) {
                            // Polygon - flatten the array
                            window.drawingVertices = latlngs[0];
                        } else {
                            // Polyline
                            window.drawingVertices = latlngs;
                        }
                    }
                });
                console.log('Vertex added, total vertices:', window.drawingVertices.length);
            }
        });
        
        map1.on(L.Draw.Event.DRAWSTOP, function(e) {
            window.currentDrawing = null;
            window.drawingVertices = [];
            console.log('Drawing stopped');
        });
        
        map1.on(L.Draw.Event.CREATED, function(e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
            // Add to action history for undo functionality
            addToHistory({
                type: 'drawing',
                layer: layer,
                shapeType: e.layerType
            });
            updateDrawingButtons();
            // Don't save immediately - wait for user to click "Save Drawing"
        });
        
        map1.on(L.Draw.Event.DELETED, function(e) {
            updateDrawingButtons();
        });
        
        // Setup custom drawing control buttons
        setupDrawingControls();
        
        // Remove click event for important places - we only use drawing tools now
        // map1.on('click', function(e) {
        //     // Don't add temp marker if we're currently drawing
        //     if (!isDrawing) {
        //         addTempMarker(e.latlng);
        //     }
        // });
    }
    
    // Initialize map 2 for wildlife encounters
    if (document.getElementById('map2')) {
        map2 = L.map('map2').setView([50.0647, 19.9450], 12); // Krakow center
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map2);
        
        // Add click event for map2
        map2.on('click', function(e) {
            promptWildlifeInfo(e.latlng);
        });
    }
}

function setupDrawingControls() {
    const startBtn = document.getElementById('start-drawing');
    const cancelBtn = document.getElementById('cancel-drawing');
    const undoBtn = document.getElementById('undo-drawing');
    const clearBtn = document.getElementById('clear-drawings');
    const saveBtn = document.getElementById('save-drawing');
    
    // Remove existing event listeners to prevent duplicates
    startBtn.removeEventListener('click', startDrawing);
    cancelBtn.removeEventListener('click', cancelDrawing);
    undoBtn.removeEventListener('click', undoLastAction);
    clearBtn.removeEventListener('click', clearAllDrawings);
    saveBtn.removeEventListener('click', saveDrawing);
    
    // Add event listeners
    startBtn.addEventListener('click', startDrawing);
    cancelBtn.addEventListener('click', cancelDrawing);
    undoBtn.addEventListener('click', undoLastAction);
    clearBtn.addEventListener('click', clearAllDrawings);
    saveBtn.addEventListener('click', saveDrawing);
}

function startDrawing() {
    if (!isDrawing) {
        isDrawing = true;
        map1.addControl(drawControl);
        updateDrawingButtons();
    }
}

function cancelDrawing() {
    if (isDrawing) {
        isDrawing = false;
        map1.removeControl(drawControl);
        updateDrawingButtons();
    }
}

function clearAllDrawings() {
    console.log('Clearing all drawings');
    console.log('Before clear - drawnItems layers:', drawnItems.getLayers().length);
    console.log('Before clear - actionHistory length:', actionHistory.length);
    
    drawnItems.clearLayers();
    // Clear action history when clearing all drawings
    actionHistory = [];
    
    console.log('After clear - drawnItems layers:', drawnItems.getLayers().length);
    console.log('After clear - actionHistory length:', actionHistory.length);
    
    updateDrawingButtons();
}

function saveDrawing() {
    // Prevent multiple simultaneous processing
    if (isProcessingMarkers) {
        return;
    }
    
    // Handle drawings only
    if (drawnItems.getLayers().length > 0) {
        // Show form for individual drawings
        isProcessingMarkers = true;
        showIndividualDrawingForm();
    } else {
        // Nothing to save
        const texts = translations[currentLanguage];
        showDrawingNotification(texts['no-drawings'] || 'No drawings to save.');
    }
}

function showIndividualDrawingForm() {
    // Check if a modal already exists to prevent duplicates
    const existingModal = document.querySelector('.place-experience-modal');
    if (existingModal) {
        return;
    }
    
    const texts = translations[currentLanguage];
    
    // Count total items to describe - only items that don't have descriptions yet
    const unsavedDrawings = [];
    drawnItems.eachLayer(function(layer) {
        if (!layer.description) {
            unsavedDrawings.push(layer);
        }
    });
    const totalDrawings = unsavedDrawings.length;
    const totalItems = totalDrawings;
    
    if (totalItems === 0) {
        showDrawingNotification(texts['no-drawings'] || 'No drawings to save.');
        isProcessingMarkers = false;
        return;
    }
    
    // Create modal for better UX
    const modal = document.createElement('div');
    modal.className = 'place-experience-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    let formHTML = `
        <h3 style="margin-top: 0; color: #2d8a47;">${texts['place-experience-title'] || 'Tell us about these places'}</h3>
        <p style="margin-bottom: 20px; color: #666;">Please describe each drawing/location (one text per item):</p>
    `;
    
    let itemIndex = 0;
    
    // Add textarea for each drawing that doesn't have a description yet
    let drawingIndex = 0;
    unsavedDrawings.forEach(function(layer) {
        itemIndex++;
        let shapeType = 'Drawing';
        if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
            shapeType = 'Polygon';
        } else if (layer instanceof L.Rectangle) {
            shapeType = 'Rectangle';
        } else if (layer instanceof L.Polyline) {
            shapeType = 'Polyline';
        } else if (layer instanceof L.Marker) {
            shapeType = 'Marker';
        }
        
        formHTML += `
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: bold; margin-bottom: 5px;">${shapeType} ${itemIndex}:</label>
                <textarea id="drawing_${drawingIndex}" style="width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit; resize: vertical;" placeholder="Describe this ${shapeType.toLowerCase()}..."></textarea>
            </div>
        `;
        drawingIndex++;
    });
    
    formHTML += `
        <div style="margin-top: 20px; text-align: right;">
            <button id="cancelBtn" style="background: #ccc; color: #333; border: none; padding: 10px 20px; margin-right: 10px; border-radius: 5px; cursor: pointer;">${texts['cancel'] || 'Cancel'}</button>
            <button id="saveBtn" style="background: #2d8a47; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">${texts['save'] || 'Save All'}</button>
        </div>
    `;
    
    modalContent.innerHTML = formHTML;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Focus on first textarea
    setTimeout(() => {
        const firstTextarea = modalContent.querySelector('textarea');
        if (firstTextarea) firstTextarea.focus();
    }, 100);
    
    // Handle save button
    const saveBtn = modalContent.querySelector('#saveBtn');
    const cancelBtn = modalContent.querySelector('#cancelBtn');
    
    const handleSave = function() {
        // Save drawing descriptions to layers that don't have descriptions yet
        let drawingIndex = 0;
        unsavedDrawings.forEach(function(layer) {
            const description = document.getElementById(`drawing_${drawingIndex}`)?.value.trim() || '';
            layer.description = description;
            drawingIndex++;
        });
        
        const texts = translations[currentLanguage];
        showDrawingNotification(texts['drawing-saved'] || 'All shapes have been saved! Continue with the survey.');
        
        document.body.removeChild(modal);
        isProcessingMarkers = false;
        updateDrawingButtons();
    };
    
    const handleCancel = function() {
        document.body.removeChild(modal);
        isProcessingMarkers = false;
        updateDrawingButtons();
    };
    
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);
    
    // Handle clicking outside modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            handleCancel();
        }
    });
    
    // Handle Escape key
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            handleCancel();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function showSingleTextForm() {
    // This function is no longer needed - we use showIndividualDrawingForm instead
    // when the user clicks "Save Drawing"
}

function showDrawingNotification(message) {
    // Create or get existing notification element
    let notification = document.getElementById('drawing-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'drawing-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-weight: bold;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
}

function updateDrawingButtons() {
    const startBtn = document.getElementById('start-drawing');
    const cancelBtn = document.getElementById('cancel-drawing');
    const undoBtn = document.getElementById('undo-drawing');
    const clearBtn = document.getElementById('clear-drawings');
    const saveBtn = document.getElementById('save-drawing');
    
    const hasDrawings = drawnItems.getLayers().length > 0;
    const hasHistory = actionHistory.length > 0;
    
    startBtn.disabled = isDrawing;
    cancelBtn.disabled = !isDrawing;
    undoBtn.disabled = !hasHistory;
    clearBtn.disabled = !hasDrawings;
    saveBtn.disabled = !hasDrawings;
    
    // Update button states
    if (isDrawing) {
        startBtn.classList.add('active');
        cancelBtn.classList.remove('active');
    } else {
        startBtn.classList.remove('active');
        cancelBtn.classList.remove('active');
    }
}

// Action history functions for undo functionality
function addToHistory(action) {
    actionHistory.push(action);
    // Keep only last 10 actions to prevent memory issues
    if (actionHistory.length > 10) {
        actionHistory.shift();
    }
    updateDrawingButtons();
}

function undoLastAction() {
    // Check if we're currently drawing and have vertices to undo
    if (window.currentDrawing && window.drawingVertices && window.drawingVertices.length > 0) {
        console.log('Currently drawing, showing hint for vertex undo');
        const texts = translations[currentLanguage];
        showDrawingNotification(texts['undo-drawing-hint'] || 'Press Backspace while drawing to undo the last vertex, or press Escape to cancel the drawing.');
        return;
    }
    
    // Normal undo functionality for completed drawings and markers
    if (actionHistory.length === 0) {
        console.log('No actions to undo');
        return;
    }
    
    const lastAction = actionHistory.pop();
    console.log('Undoing action:', lastAction);
    
    switch (lastAction.type) {
        case 'drawing':
            // Remove the drawing from the map and drawnItems
            if (lastAction.layer) {
                console.log('Removing drawing layer from drawnItems');
                console.log('Before removal - drawnItems layers:', drawnItems.getLayers().length);
                console.log('Layer to remove:', lastAction.layer);
                
                if (drawnItems.hasLayer(lastAction.layer)) {
                    drawnItems.removeLayer(lastAction.layer);
                    console.log('Drawing layer removed from drawnItems');
                } else {
                    console.log('Layer not found in drawnItems');
                }
                
                // Also remove from map if it's still there
                if (map1.hasLayer(lastAction.layer)) {
                    map1.removeLayer(lastAction.layer);
                    console.log('Drawing layer removed from map1');
                }
                
                console.log('After removal - drawnItems layers:', drawnItems.getLayers().length);
            }
            break;

        case 'wildlife':
            // Remove the wildlife marker from the map and markers array
            if (lastAction.marker && map2.hasLayer(lastAction.marker)) {
                map2.removeLayer(lastAction.marker);
                console.log('Wildlife marker removed from map2');
                
                // Remove from markers2 array using the stored data
                const index = markers2.findIndex(m => 
                    m.lat === lastAction.lat && 
                    m.lng === lastAction.lng && 
                    m.wildlife === lastAction.wildlife && 
                    m.emotion === lastAction.emotion
                );
                if (index > -1) {
                    markers2.splice(index, 1);
                    console.log('Wildlife marker removed from markers2 array at index:', index);
                } else {
                    console.log('Wildlife marker not found in markers2 array');
                }
            }
            break;
    }
    
    console.log('After undo - drawnItems layers:', drawnItems.getLayers().length);
    console.log('After undo - markers2 length:', markers2.length);
    
    updateDrawingButtons();
    showDrawingNotification('Last action undone');
}

function addMarker(map, markersArray, latlng, color, type) {
    const marker = L.marker(latlng).addTo(map);
    markersArray.push({
        lat: latlng.lat,
        lng: latlng.lng,
        type: type
    });
    
    // Add double-click to remove
    marker.on('dblclick', function() {
        map.removeLayer(marker);
        const index = markersArray.findIndex(m => m.lat === latlng.lat && m.lng === latlng.lng);
        if (index > -1) {
            markersArray.splice(index, 1);
        }
    });
}



function promptWildlifeInfo(latlng) {
    const texts = translations[currentLanguage];
    
    const wildlifeType = prompt(texts['wildlife-type-prompt']);
    if (!wildlifeType) return;
    
    const emotions = [
        'emotion-anger', 'emotion-disgust', 'emotion-sadness', 'emotion-joy',
        'emotion-curiosity', 'emotion-sympathy', 'emotion-happiness',
        'emotion-neutral', 'emotion-anxiety', 'emotion-other'
    ];
    
    let emotionOptions = texts['wildlife-emotion-prompt'] + '\n\n';
    emotions.forEach((emotion, index) => {
        emotionOptions += `${index + 1}. ${texts[emotion]}\n`;
    });
    
    const emotionChoice = prompt(emotionOptions + '\n' + 'Please enter number (1-10):');
    const emotionIndex = parseInt(emotionChoice) - 1;
    
    if (emotionIndex >= 0 && emotionIndex < emotions.length) {
        let selectedEmotion = texts[emotions[emotionIndex]];
        
        // If "Other emotions" was selected (index 9), ask for custom emotion
        if (emotionIndex === 9) {
            const customEmotion = prompt(texts['custom-emotion-prompt'] || 'Please describe your emotion:');
            if (customEmotion && customEmotion.trim()) {
                selectedEmotion = customEmotion.trim();
            } else {
                return; // Cancel if no custom emotion provided
            }
        }
        
        const marker = L.marker(latlng).addTo(map2);
        const markerId = 'wildlife_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
        
        console.log('Creating wildlife marker with ID:', markerId);
        console.log('Marker data:', {
            id: markerId,
            lat: latlng.lat,
            lng: latlng.lng,
            wildlife: wildlifeType,
            emotion: selectedEmotion
        });
        
        marker.bindPopup(`
            <div>
                <b>Wildlife:</b> ${wildlifeType}<br/>
                <b>Emotion:</b> ${selectedEmotion}<br/>
                <button onclick="deleteWildlifeMarker('${markerId}')" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; margin-top: 5px;">🗑️ Delete</button>
            </div>
        `);
        
        markers2.push({
            id: markerId,
            lat: latlng.lat,
            lng: latlng.lng,
            type: 'Wildlife Encounter',
            wildlife: wildlifeType,
            emotion: selectedEmotion,
            marker: marker
        });
        
        console.log('Marker added to markers2 array. Current length:', markers2.length);
        
        // Add to action history for undo functionality
        addToHistory({
            type: 'wildlife',
            marker: marker,
            lat: latlng.lat,
            lng: latlng.lng,
            wildlife: wildlifeType,
            emotion: selectedEmotion
        });
        
        // Add double-click to remove (keep this for backwards compatibility)
        marker.on('dblclick', function() {
            map2.removeLayer(marker);
            const index = markers2.findIndex(m => 
                m.lat === latlng.lat && 
                m.lng === latlng.lng && 
                m.wildlife === wildlifeType && 
                m.emotion === selectedEmotion
            );
            if (index > -1) {
                markers2.splice(index, 1);
            }
        });
    }
}

function validateForm() {
    const texts = translations[currentLanguage];
    
    // Check required consent fields
    const consentFields = ['consent1', 'consent2', 'consent3', 'consent4'];
    for (let field of consentFields) {
        const selected = document.querySelector(`input[name="${field}"]:checked`);
        if (!selected) {
            // Find the field element to scroll to
            const fieldElement = document.querySelector(`input[name="${field}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'], 'error');
            return false;
        }
    }
    
    // Add test mode for development - only validate consent fields
    const isTestMode = window.location.search.includes('test=true');
    
    if (isTestMode) {
        return true; // Skip all other validations
    }
    
    // Check picture response
    const pictureResponse = document.querySelector('input[name="picture_response"]:checked');
    if (!pictureResponse) {
        const fieldElement = document.querySelector('input[name="picture_response"]');
        if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showMessage(texts['validation-error'] + ' (Picture response is required)', 'error');
        return false;
    }
    
    // Check place attachment questions (pa1-pa14)
    for (let i = 1; i <= 14; i++) {
        const selected = document.querySelector(`input[name="pa${i}"]:checked`);
        if (!selected) {
            const fieldElement = document.querySelector(`input[name="pa${i}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (Place attachment question ${i} is required)`, 'error');
            return false;
        }
    }
    
    // Check nostalgia questions (nostalgia1-nostalgia4)
    for (let i = 1; i <= 4; i++) {
        const selected = document.querySelector(`input[name="nostalgia${i}"]:checked`);
        if (!selected) {
            const fieldElement = document.querySelector(`input[name="nostalgia${i}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (Nostalgia question ${i} is required)`, 'error');
            return false;
        }
    }
    
    // Check psychological well-being questions (pwb1-pwb18)
    for (let i = 1; i <= 18; i++) {
        const selected = document.querySelector(`input[name="pwb${i}"]:checked`);
        if (!selected) {
            const fieldElement = document.querySelector(`input[name="pwb${i}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (Well-being question ${i} is required)`, 'error');
            return false;
        }
    }
    
    // Check social and environmental justice questions (soj1-soj11)
    for (let i = 1; i <= 11; i++) {
        const selected = document.querySelector(`input[name="soj${i}"]:checked`);
        if (!selected) {
            const fieldElement = document.querySelector(`input[name="soj${i}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (Justice question ${i} is required)`, 'error');
            return false;
        }
    }
    
    // Check wildlife questions (wildlife1-wildlife9)
    for (let i = 1; i <= 9; i++) {
        const selected = document.querySelector(`input[name="wildlife${i}"]:checked`);
        if (!selected) {
            const fieldElement = document.querySelector(`input[name="wildlife${i}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (Wildlife question ${i} is required)`, 'error');
            return false;
        }
    }
    
    // Check open-ended questions (required text fields)
    const textFields = ['first_visit', 'site_background', 'wildlife_sharing', 'future_vision'];
    for (let field of textFields) {
        const element = document.querySelector(`textarea[name="${field}"]`);
        if (!element || !element.value.trim()) {
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (${field.replace('_', ' ')} is required)`, 'error');
            return false;
        }
    }
    
    // Check demographics
    const demographicFields = ['distance', 'gender', 'education', 'visit_frequency'];
    for (let field of demographicFields) {
        const selected = document.querySelector(`input[name="${field}"]:checked`);
        if (!selected) {
            const fieldElement = document.querySelector(`input[name="${field}"]`);
            if (fieldElement) {
                fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            showMessage(texts['validation-error'] + ` (${field.replace('_', ' ')} is required)`, 'error');
            return false;
        }
    }
    
    // Check age
    const ageInput = document.querySelector('input[name="age"]');
    if (!ageInput || !ageInput.value.trim()) {
        if (ageInput) {
            ageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showMessage(texts['validation-error'] + ' (Age is required)', 'error');
        return false;
    }
    
    // Validate age is a number
    if (!validateAge(ageInput.value)) {
        ageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showMessage('Please enter a valid age between 18 and 120.', 'error');
        return false;
    }
    
    return true;
}

function collectFormData() {
    const formData = new FormData(document.getElementById('survey-form'));
    const data = {};
    
    // Convert FormData to regular object
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Add drawing data from map1 - clean circular references
    const drawingData = [];
    console.log('=== COLLECTING DRAWING DATA ===');
    console.log('drawnItems layers count:', drawnItems.getLayers().length);
    console.log('Action history length:', actionHistory.length);
    console.log('Action history:', actionHistory);
    
    drawnItems.eachLayer(function(layer) {
        try {
            console.log('Processing layer:', layer);
            console.log('Layer description:', layer.description);
            const geoJSON = layer.toGeoJSON();
            geoJSON.properties = geoJSON.properties || {};
            geoJSON.properties.type = 'important_place_drawing';
            if (layer.description) {
                geoJSON.properties.description = layer.description;
            }
            drawingData.push(geoJSON);
            console.log('Added drawing to data:', geoJSON.properties.description || 'No description');
        } catch (error) {
            console.log('Error processing drawing layer:', error);
        }
    });
    
    // Clean markers2 data - remove circular references  
    const cleanMarkers2 = markers2.map(marker => ({
        id: marker.id,
        lat: marker.lat,
        lng: marker.lng,
        type: marker.type,
        wildlife: marker.wildlife || '',
        emotion: marker.emotion || ''
    }));
    
    // Debug logging
    console.log('=== COLLECTING FORM DATA ===');
    console.log('Markers2 (wildlife):', markers2);
    console.log('Clean markers2:', cleanMarkers2);
    console.log('Drawing data:', drawingData);
    console.log('drawnItems layers count:', drawnItems.getLayers().length);
    console.log('markers2 array length:', markers2.length);
    
    // Add map data with cleaned objects
    data.important_drawings = JSON.stringify(drawingData);
    data.wildlife_encounters = JSON.stringify(cleanMarkers2);
    
    // Add language preference
    data.language = currentLanguage;
    
    return data;
}

async function submitForm() {
    if (!validateForm()) {
        return;
    }
    
    const texts = translations[currentLanguage];
    const loading = document.getElementById('loading');
    const submitBtn = document.querySelector('.submit-btn');
    
    // Show loading state
    loading.style.display = 'block';
    submitBtn.disabled = true;
    
    try {
        const formData = collectFormData();
        
        if (!window.offlineManager) {
            throw new Error('Offline manager not initialized');
        }
        
        // Use offline manager for submission
        const result = await window.offlineManager.submitSurvey(formData);
        
        if (result.success) {
            if (result.online) {
                showMessage(texts['success'] || 'Survey submitted successfully!', 'success');
            } else {
                showMessage(texts['success-offline'] || 'Survey saved offline! It will be submitted when connection is restored.', 'success');
            }
            
            // Scroll to top to show the success message
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.getElementById('survey-form').reset();
            
            // Clear map markers
            if (map2) {
                markers2.forEach(marker => {
                    if (marker.layer) map2.removeLayer(marker.layer);
                    if (marker.marker) map2.removeLayer(marker.marker);
                });
            }
            markers2 = [];
            
            // Clear drawings
            if (drawnItems) {
                drawnItems.clearLayers();
            }
            if (isDrawing) {
                cancelDrawing();
            }
            // Clear action history
            actionHistory = [];
            updateDrawingButtons();
        } else {
            throw new Error('Failed to save survey');
        }
        
    } catch (error) {
        console.error('Error submitting survey:', error);
        showMessage(texts['error'] || 'Error submitting survey. Please try again.', 'error');
        // Remove automatic scroll - let showMessage handle positioning
    } finally {
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    // Don't scroll to message - let validation handle positioning
    // The message will be visible where the user is
    
    // Auto-hide after 8 seconds (increased from 5)
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 8000);
}

// Form validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateAge(age) {
    const ageNum = parseInt(age);
    return !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
}

// Global function to delete wildlife markers from popup buttons
function deleteWildlifeMarker(markerId) {
    console.log('Attempting to delete wildlife marker with ID:', markerId);
    console.log('Current markers2 array:', markers2);
    
    // First try to find by ID
    let index = markers2.findIndex(m => m.id === markerId);
    console.log('Found marker at index by ID:', index);
    
    // If not found by ID, try to find by other properties
    if (index === -1) {
        console.log('Marker not found by ID, trying alternative search...');
        // This is a fallback in case the ID doesn't match
        index = markers2.findIndex(m => 
            m.type === 'Wildlife Encounter' && 
            m.marker && 
            m.marker._leaflet_id // Check if it's a valid Leaflet marker
        );
        console.log('Found marker at index by alternative search:', index);
    }
    
    if (index > -1) {
        const markerData = markers2[index];
        console.log('Marker data to delete:', markerData);
        
        if (markerData.marker) {
            map2.removeLayer(markerData.marker);
            console.log('Marker removed from map2');
        }
        
        markers2.splice(index, 1);
        console.log('Marker removed from markers2 array');
        console.log('Updated markers2 array:', markers2);
        
        // Also remove from action history if it was the last action
        if (actionHistory.length > 0) {
            const lastAction = actionHistory[actionHistory.length - 1];
            console.log('Last action in history:', lastAction);
            
            if (lastAction.type === 'wildlife' && 
                lastAction.lat === markerData.lat && 
                lastAction.lng === markerData.lng &&
                lastAction.wildlife === markerData.wildlife &&
                lastAction.emotion === markerData.emotion) {
                actionHistory.pop();
                console.log('Action removed from history');
            }
        }
        
        console.log('Final markers2 length:', markers2.length);
        console.log('Final actionHistory length:', actionHistory.length);
    } else {
        console.log('Marker not found in markers2 array');
        console.log('Available markers:', markers2.map(m => ({ id: m.id, type: m.type, wildlife: m.wildlife })));
    }
}

// Make functions globally available
window.switchLanguage = switchLanguage;
window.submitForm = submitForm; 
window.deleteWildlifeMarker = deleteWildlifeMarker;

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Form is ready
});
