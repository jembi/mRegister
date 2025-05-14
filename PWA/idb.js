// modules/idb.js

// Open the IndexedDB database
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FHIRQueueDB", 1);

    request.onerror = () => reject("DB open error");

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create 'queue' store with keyPath for consistent ID access
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
      }

      // Create 'settings' store for storing FHIR server URL
      if (!db.objectStoreNames.contains("settings")) {
        const settingsStore = db.createObjectStore("settings", { keyPath: "key" });
        settingsStore.createIndex("key", "key", { unique: true });
      }
    };
  });
}

// Save a QuestionnaireResponse to the queue
export async function saveToQueue(data) {
  const db = await openDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  const request = store.add(data);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result); // returns auto-generated ID
    request.onerror = (e) => reject(e);
  });
}

// Get all queued QuestionnaireResponses
export async function getAllQueued() {
  const db = await openDB();
  const tx = db.transaction("queue", "readonly");
  const store = tx.objectStore("queue");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);  // returns array of { id, ...data }
    request.onerror = (e) => reject(e);
  });
}

// Delete a specific QuestionnaireResponse by ID
export async function deleteFromQueue(id) {
  const db = await openDB();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").delete(id);
  return tx.complete;
}

// Clear the entire queue
export async function clearQueue() {
  const db = await openDB();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").clear();
  return tx.complete;
}

// Save the FHIR server URL to settings
export async function saveFHIRServerUrl(url) {
  const db = await openDB();
  const tx = db.transaction("settings", "readwrite");
  const store = tx.objectStore("settings");
  store.put({ key: "fhirServerUrl", value: url });
  return tx.complete;
}

// Get the FHIR server URL from settings
export async function getFHIRServerUrl() {
  const db = await openDB();
  const tx = db.transaction("settings", "readonly");
  const store = tx.objectStore("settings");

  return new Promise((resolve, reject) => {
    const request = store.get("fhirServerUrl");
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.value);
      } else {
        reject("FHIR server URL not found in IndexedDB");
      }
    };
    request.onerror = (e) => reject(e);
  });
}

// Delete the stored FHIR server URL
export async function deleteFHIRServerUrl() {
  const db = await openDB();
  const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").delete("fhirServerUrl");
  return tx.complete;
}
