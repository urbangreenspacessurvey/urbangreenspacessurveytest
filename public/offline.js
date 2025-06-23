// Offline functionality for Green Spaces Survey
class OfflineManager {
    constructor() {
        this.dbName = 'SurveyOfflineDB';
        this.dbVersion = 1;
        this.storeName = 'surveys';
        this.isOnline = navigator.onLine;
        this.pendingSurveys = 0;
        
        this.initDB();
        this.setupEventListeners();
        this.updateOnlineStatus();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOnlineStatus();
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOnlineStatus();
        });
    }

    updateOnlineStatus() {
        const statusElement = document.getElementById('connection-status');
        
        if (statusElement) {
            if (this.isOnline) {
                statusElement.innerHTML = '🟢 Online';
                statusElement.className = 'status-online';
            } else {
                statusElement.innerHTML = '🔴 Offline - Surveys will be saved locally';
                statusElement.className = 'status-offline';
            }
        }

        this.updatePendingCount();
    }

    async updatePendingCount() {
        const count = await this.getPendingSurveyCount();
        this.pendingSurveys = count;
        
        const pendingElement = document.getElementById('pending-surveys');
        if (pendingElement) {
            if (count > 0) {
                pendingElement.innerHTML = `📁 ${count} survey${count > 1 ? 's' : ''} pending sync`;
                pendingElement.style.display = 'block';
            } else {
                pendingElement.style.display = 'none';
            }
        }
    }

    async saveOfflineSurvey(surveyData) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const offlineSurvey = {
                data: surveyData,
                timestamp: new Date().toISOString(),
                synced: false
            };

            await new Promise((resolve, reject) => {
                const request = store.add(offlineSurvey);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            console.log('Survey saved offline');
            this.updatePendingCount();
            return true;
        } catch (error) {
            console.error('Failed to save survey offline:', error);
            return false;
        }
    }

    async getPendingSurveyCount() {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get pending survey count:', error);
            return 0;
        }
    }

    async getAllOfflineSurveys() {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get offline surveys:', error);
            return [];
        }
    }

    async deleteOfflineSurvey(id) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            await new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            this.updatePendingCount();
        } catch (error) {
            console.error('Failed to delete offline survey:', error);
        }
    }

    async syncOfflineData() {
        if (!this.isOnline) return;

        try {
            const surveys = await this.getAllOfflineSurveys();
            let successCount = 0;

            for (const survey of surveys) {
                try {
                    const response = await fetch('/submit-survey', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(survey.data)
                    });

                    if (response.ok) {
                        await this.deleteOfflineSurvey(survey.id);
                        successCount++;
                        console.log('Survey synced successfully:', survey.id);
                    }
                } catch (error) {
                    console.log('Network error syncing survey:', survey.id, error);
                }
            }

            if (successCount > 0) {
                this.showNotification(`✅ ${successCount} survey${successCount > 1 ? 's' : ''} synced!`);
            }

        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    showNotification(message) {
        let notification = document.getElementById('sync-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'sync-notification';
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; background: #2d8a47; color: white;
                padding: 15px 20px; border-radius: 5px; z-index: 10000; font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2); max-width: 300px;
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.display = 'block';

        setTimeout(() => {
            if (notification) notification.style.display = 'none';
        }, 5000);
    }

    async submitSurvey(surveyData) {
        if (this.isOnline) {
            try {
                const response = await fetch('/submit-survey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(surveyData)
                });

                if (response.ok) {
                    return { success: true, online: true };
                } else {
                    throw new Error('Server error');
                }
            } catch (error) {
                console.log('Online submission failed, saving offline:', error);
                const saved = await this.saveOfflineSurvey(surveyData);
                return { success: saved, online: false };
            }
        } else {
            const saved = await this.saveOfflineSurvey(surveyData);
            return { success: saved, online: false };
        }
    }
}

let offlineManager;
document.addEventListener('DOMContentLoaded', () => {
    offlineManager = new OfflineManager();
    // Make it globally available
    window.offlineManager = offlineManager;
});

window.OfflineManager = OfflineManager; 