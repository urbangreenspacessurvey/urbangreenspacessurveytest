// Global variables
let currentLanguage = 'en';
let map1, map2;
let markers1 = [], markers2 = [];
let tempMarkers1 = []; // Store temporary markers before saving
let drawnItems;
let drawControl;
let isDrawing = false;
let speechRecognition = null;
let currentRecordingField = null;
let isProcessingMarkers = false; // Add flag to prevent multiple processing

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
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.maxAlternatives = 1;
    
    // Set language based on current language preference
    speechRecognition.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
    
    // Event handlers
    speechRecognition.onstart = function() {
        console.log('Speech recognition started');
        if (currentRecordingField) {
            const btn = currentRecordingField.nextElementSibling;
            btn.classList.add('recording');
            btn.innerHTML = '⏹️';
        }
    };
    
    speechRecognition.onresult = function(event) {
        if (!currentRecordingField) return;
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update textarea with final transcript
        if (finalTranscript) {
            const currentText = currentRecordingField.value;
            const separator = currentText && !currentText.endsWith(' ') && !currentText.endsWith('\n') ? ' ' : '';
            currentRecordingField.value = currentText + separator + finalTranscript;
        }
    };
    
    speechRecognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        stopRecording();
        
        const texts = translations[currentLanguage];
        let errorMessage = 'Speech recognition error: ' + event.error;
        
        if (event.error === 'not-allowed') {
            errorMessage = texts['speech-permission-error'] || 'Please allow microphone access to use speech recognition.';
        } else if (event.error === 'no-speech') {
            errorMessage = texts['speech-no-speech-error'] || 'No speech detected. Please try again.';
        }
        
        showMessage(errorMessage, 'error');
    };
    
    speechRecognition.onend = function() {
        console.log('Speech recognition ended');
        stopRecording();
    };
    
    // Setup speech button event listeners
    setupSpeechButtons();
}

function setupSpeechButtons() {
    const speechButtons = document.querySelectorAll('.speech-btn');
    
    speechButtons.forEach(btn => {
        btn.innerHTML = '🎤';
        btn.addEventListener('click', function() {
            const textarea = this.previousElementSibling;
            
            if (currentRecordingField && currentRecordingField === textarea) {
                // Stop recording
                stopRecording();
            } else {
                // Start recording
                startRecording(textarea);
            }
        });
    });
}

function startRecording(textarea) {
    if (!speechRecognition) return;
    
    // Stop any ongoing recording
    if (currentRecordingField) {
        stopRecording();
    }
    
    currentRecordingField = textarea;
    
    // Update language if it has changed
    speechRecognition.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
    
    try {
        speechRecognition.start();
    } catch (error) {
        console.error('Error starting speech recognition:', error);
        showMessage('Could not start speech recognition. Please try again.', 'error');
        currentRecordingField = null;
    }
}

function stopRecording() {
    if (speechRecognition && currentRecordingField) {
        speechRecognition.stop();
        
        const btn = currentRecordingField.nextElementSibling;
        btn.classList.remove('recording');
        btn.innerHTML = '🎤';
        
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
                    showArea: true
                },
                polyline: true,
                rectangle: true,
                circle: true,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });
        
        // Don't add the control to map yet - we'll control it manually
        
        // Setup drawing event handlers
        map1.on(L.Draw.Event.CREATED, function(e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
            updateDrawingButtons();
        });
        
        map1.on(L.Draw.Event.DELETED, function(e) {
            updateDrawingButtons();
        });
        
        // Setup custom drawing control buttons
        setupDrawingControls();
        
        // Add click event for important places - now just adds marker without text prompt
        map1.on('click', function(e) {
            addTempMarker(e.latlng);
        });
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
    const clearBtn = document.getElementById('clear-drawings');
    const saveBtn = document.getElementById('save-drawing');
    
    // Remove existing event listeners to prevent duplicates
    startBtn.removeEventListener('click', startDrawing);
    cancelBtn.removeEventListener('click', cancelDrawing);
    clearBtn.removeEventListener('click', clearAllDrawings);
    saveBtn.removeEventListener('click', saveDrawing);
    
    // Add event listeners
    startBtn.addEventListener('click', startDrawing);
    cancelBtn.addEventListener('click', cancelDrawing);
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
    drawnItems.clearLayers();
    // Also clear temporary markers
    tempMarkers1.forEach(tempMarker => {
        map1.removeLayer(tempMarker.marker);
    });
    tempMarkers1 = [];
    // Also clear permanent markers
    if (map1 && markers1.length > 0) {
        markers1.forEach(marker => {
            if (marker.layer) {
                map1.removeLayer(marker.layer);
            } else {
                // Try to find and remove marker from map by lat/lng
                map1.eachLayer(layer => {
                    if (layer.getLatLng && layer.getLatLng().lat === marker.lat && layer.getLatLng().lng === marker.lng) {
                        map1.removeLayer(layer);
                    }
                });
            }
        });
    }
    markers1 = [];
    updateDrawingButtons();
}

function saveDrawing() {
    // Prevent multiple simultaneous processing
    if (isProcessingMarkers) {
        return;
    }
    
    // Handle both drawings and temporary markers
    if (tempMarkers1.length > 0) {
        // Show one text form for all locations
        isProcessingMarkers = true;
        showSingleTextForm();
    } else {
        // Original drawing save functionality
        const texts = translations[currentLanguage];
        showDrawingNotification(texts['drawing-saved'] || 'Drawing saved! Continue with the survey.');
    }
}

function showSingleTextForm() {
    // Check if a modal already exists to prevent duplicates
    const existingModal = document.querySelector('.place-experience-modal');
    if (existingModal) {
        return;
    }
    
    const texts = translations[currentLanguage];
    
    // Create modal for better UX
    const modal = document.createElement('div');
    modal.className = 'place-experience-modal'; // Add class for identification
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
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
        <h3 style="margin-top: 0; color: #2d8a47;">${texts['place-experience-title'] || 'Tell us about these places'}</h3>
        <p style="margin-bottom: 20px; color: #666;">You've marked ${tempMarkers1.length} location${tempMarkers1.length > 1 ? 's' : ''}. ${texts['place-experience-subtitle'] || 'What makes these locations special to you? Share your experience, memories, or why you like to visit these places.'}</p>
        <textarea id="experienceText" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit; resize: vertical;" placeholder="${texts['place-experience-placeholder'] || 'Describe your experience at these locations...'}"></textarea>
        <div style="margin-top: 20px; text-align: right;">
            <button id="cancelBtn" style="background: #ccc; color: #333; border: none; padding: 10px 20px; margin-right: 10px; border-radius: 5px; cursor: pointer;">${texts['cancel'] || 'Cancel'}</button>
            <button id="saveBtn" style="background: #2d8a47; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">${texts['save'] || 'Save'}</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Focus on textarea
    setTimeout(() => {
        const textarea = document.getElementById('experienceText');
        if (textarea) textarea.focus();
    }, 100);
    
    // Handle save button
    const saveBtn = modalContent.querySelector('#saveBtn');
    const cancelBtn = modalContent.querySelector('#cancelBtn');
    
    const handleSave = function() {
        const experienceText = document.getElementById('experienceText').value.trim();
        if (experienceText) {
            // Apply the same description to all temporary markers
            tempMarkers1.forEach(tempMarker => {
                const latlng = { lat: tempMarker.lat, lng: tempMarker.lng };
                
                // Remove temporary marker
                map1.removeLayer(tempMarker.marker);
                
                // Add permanent marker with experience
                const permanentMarker = L.marker(latlng).addTo(map1);
                permanentMarker.bindPopup(`<b>Important Place</b><br/><em>${experienceText.substring(0, 100)}${experienceText.length > 100 ? '...' : ''}</em>`);
                
                markers1.push({
                    lat: latlng.lat,
                    lng: latlng.lng,
                    type: 'Important Place',
                    experience: experienceText
                });
                
                // Add double-click to remove
                permanentMarker.on('dblclick', function() {
                    map1.removeLayer(permanentMarker);
                    const index = markers1.findIndex(m => m.lat === latlng.lat && m.lng === latlng.lng);
                    if (index > -1) {
                        markers1.splice(index, 1);
                    }
                });
            });
            
            // Clear temporary markers array and show success message
            tempMarkers1 = [];
            const texts = translations[currentLanguage];
            showDrawingNotification(texts['drawing-saved'] || 'All locations have been saved! Continue with the survey.');
        }
        
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
    const clearBtn = document.getElementById('clear-drawings');
    const saveBtn = document.getElementById('save-drawing');
    
    const hasDrawings = drawnItems.getLayers().length > 0;
    const hasTempMarkers = tempMarkers1.length > 0;
    
    startBtn.disabled = isDrawing;
    cancelBtn.disabled = !isDrawing;
    clearBtn.disabled = !hasDrawings && !hasTempMarkers;
    saveBtn.disabled = !hasDrawings && !hasTempMarkers;
    
    // Update button states
    if (isDrawing) {
        startBtn.classList.add('active');
        cancelBtn.classList.remove('active');
    } else {
        startBtn.classList.remove('active');
        cancelBtn.classList.remove('active');
    }
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

function addTempMarker(latlng) {
    const marker = L.marker(latlng, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map1);
    
    marker.bindPopup('<b>Important Place</b><br/><em>Click "Save Drawing" to add description</em>');
    
    tempMarkers1.push({
        lat: latlng.lat,
        lng: latlng.lng,
        marker: marker
    });
    
    // Add double-click to remove
    marker.on('dblclick', function() {
        map1.removeLayer(marker);
        const index = tempMarkers1.findIndex(m => m.lat === latlng.lat && m.lng === latlng.lng);
        if (index > -1) {
            tempMarkers1.splice(index, 1);
        }
        updateDrawingButtons();
    });
    
    updateDrawingButtons();
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
        marker.bindPopup(`<b>Wildlife:</b> ${wildlifeType}<br/><b>Emotion:</b> ${selectedEmotion}`);
        
        markers2.push({
            lat: latlng.lat,
            lng: latlng.lng,
            type: 'Wildlife Encounter',
            wildlife: wildlifeType,
            emotion: selectedEmotion
        });
        
        // Add double-click to remove
        marker.on('dblclick', function() {
            map2.removeLayer(marker);
            const index = markers2.findIndex(m => m.lat === latlng.lat && m.lng === latlng.lng);
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
            showMessage(texts['validation-error'], 'error');
            return false;
        }
    }
    
    // Place attachment questions are not required - remove this validation
    // Check if at least some place attachment questions are answered
    // let attachmentAnswered = 0;
    // for (let i = 1; i <= 14; i++) {
    //     const selected = document.querySelector(`input[name="pa${i}"]:checked`);
    //     if (selected) attachmentAnswered++;
    // }
    
    // if (attachmentAnswered < 5) {
    //     showMessage('Please answer at least 5 place attachment questions.', 'error');
    //     return false;
    // }
    
    return true;
}

function collectFormData() {
    const formData = new FormData(document.getElementById('survey-form'));
    const data = {};
    
    // Convert FormData to regular object
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Add drawing data from map1
    const drawingData = [];
    drawnItems.eachLayer(function(layer) {
        const geoJSON = layer.toGeoJSON();
        geoJSON.properties = geoJSON.properties || {};
        geoJSON.properties.type = 'important_place_drawing';
        drawingData.push(geoJSON);
    });
    
    // Add map data
    data.important_places = JSON.stringify(markers1); // Keep old markers if any
    data.important_drawings = JSON.stringify(drawingData); // New drawing data
    data.wildlife_encounters = JSON.stringify(markers2);
    
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
            if (map1) {
                markers1.forEach(marker => {
                    if (marker.layer) map1.removeLayer(marker.layer);
                });
            }
            if (map2) {
                markers2.forEach(marker => {
                    if (marker.layer) map2.removeLayer(marker.layer);
                });
            }
            markers1 = [];
            markers2 = [];
            
            // Clear drawings
            if (drawnItems) {
                drawnItems.clearLayers();
            }
            if (isDrawing) {
                cancelDrawing();
            }
            updateDrawingButtons();
        } else {
            throw new Error('Failed to save survey');
        }
        
    } catch (error) {
        console.error('Error submitting survey:', error);
        showMessage(texts['error'] || 'Error submitting survey. Please try again.', 'error');
        // Scroll to top to show the error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    // Ensure the message is visible by scrolling to it
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
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

// Make functions globally available
window.switchLanguage = switchLanguage;
window.submitForm = submitForm; 
