const CACHE_NAME = 'green-spaces-survey-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/translations.js',
  '/picture.jpg',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Background sync for offline surveys
self.addEventListener('sync', (event) => {
  if (event.tag === 'survey-sync') {
    event.waitUntil(syncOfflineSurveys());
  }
});

async function syncOfflineSurveys() {
  try {
    const offlineSurveys = await getOfflineSurveys();
    
    for (const survey of offlineSurveys) {
      try {
        const response = await fetch('/submit-survey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(survey.data)
        });
        
        if (response.ok) {
          await removeOfflineSurvey(survey.id);
          console.log('Survey synced successfully:', survey.id);
        }
      } catch (error) {
        console.log('Failed to sync survey:', survey.id, error);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

function getOfflineSurveys() {
  return new Promise((resolve) => {
    const request = indexedDB.open('SurveyOfflineDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };
    };
  });
}

function removeOfflineSurvey(id) {
  return new Promise((resolve) => {
    const request = indexedDB.open('SurveyOfflineDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
    };
  });
} 