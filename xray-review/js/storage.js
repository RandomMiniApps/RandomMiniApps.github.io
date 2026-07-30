(function (global) {
  "use strict";

  const C = () => global.XrayReviewConstants;

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(C().DB_NAME, C().DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("sessions")) {
          db.createObjectStore("sessions", { keyPath: "sessionKey" });
        }
        if (!db.objectStoreNames.contains("annotations")) {
          const store = db.createObjectStore("annotations", {
            keyPath: ["sessionKey", "anonymous_review_unit_id"],
          });
          store.createIndex("bySession", "sessionKey", { unique: false });
        }
        if (!db.objectStoreNames.contains("previews")) {
          const store = db.createObjectStore("previews", {
            keyPath: ["sessionKey", "previewPath"],
          });
          store.createIndex("bySession", "sessionKey", { unique: false });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  function sessionKey(manifest) {
    return [
      manifest.package_id,
      manifest.reviewer_id,
      manifest.cohort_freeze_sha256 || "nofreeze",
      C().APP_VERSION,
    ].join("::");
  }

  async function putSession(session) {
    const db = await openDb();
    const tx = db.transaction("sessions", "readwrite");
    tx.objectStore("sessions").put(session);
    await txDone(tx);
    db.close();
  }

  async function getSession(key) {
    const db = await openDb();
    const tx = db.transaction("sessions", "readonly");
    const req = tx.objectStore("sessions").get(key);
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    return result;
  }

  async function listSessions() {
    const db = await openDb();
    const tx = db.transaction("sessions", "readonly");
    const req = tx.objectStore("sessions").getAll();
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    return result;
  }

  async function putAnnotation(sessionKeyValue, annotation) {
    const db = await openDb();
    const tx = db.transaction("annotations", "readwrite");
    const row = { ...annotation, sessionKey: sessionKeyValue };
    tx.objectStore("annotations").put(row);
    await txDone(tx);
    db.close();
  }

  async function putAnnotationsBulk(sessionKeyValue, annotations) {
    const db = await openDb();
    const tx = db.transaction("annotations", "readwrite");
    const store = tx.objectStore("annotations");
    for (const annotation of annotations) {
      store.put({ ...annotation, sessionKey: sessionKeyValue });
    }
    await txDone(tx);
    db.close();
  }

  async function getAllAnnotations(sessionKeyValue) {
    const db = await openDb();
    const tx = db.transaction("annotations", "readonly");
    const idx = tx.objectStore("annotations").index("bySession");
    const req = idx.getAll(sessionKeyValue);
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    return result.map(({ sessionKey: _sk, ...rest }) => rest);
  }

  async function putPreview(sessionKeyValue, previewPath, blob) {
    const db = await openDb();
    const tx = db.transaction("previews", "readwrite");
    tx.objectStore("previews").put({
      sessionKey: sessionKeyValue,
      previewPath,
      blob,
    });
    await txDone(tx);
    db.close();
  }

  async function putPreviewsBulk(sessionKeyValue, entries, onProgress) {
    const db = await openDb();
    const chunk = 20;
    for (let i = 0; i < entries.length; i += chunk) {
      const slice = entries.slice(i, i + chunk);
      const tx = db.transaction("previews", "readwrite");
      const store = tx.objectStore("previews");
      for (const { previewPath, blob } of slice) {
        store.put({ sessionKey: sessionKeyValue, previewPath, blob });
      }
      await txDone(tx);
      if (onProgress) onProgress(Math.min(entries.length, i + slice.length), entries.length);
      await new Promise((r) => setTimeout(r, 0));
    }
    db.close();
  }

  async function getPreview(sessionKeyValue, previewPath) {
    const db = await openDb();
    const tx = db.transaction("previews", "readonly");
    const req = tx.objectStore("previews").get([sessionKeyValue, previewPath]);
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    return result ? result.blob : null;
  }

  async function clearSession(sessionKeyValue) {
    const db = await openDb();
    const tx = db.transaction(["sessions", "annotations", "previews"], "readwrite");
    tx.objectStore("sessions").delete(sessionKeyValue);
    const annIdx = tx.objectStore("annotations").index("bySession");
    const annReq = annIdx.getAllKeys(sessionKeyValue);
    const annKeys = await new Promise((resolve, reject) => {
      annReq.onsuccess = () => resolve(annReq.result || []);
      annReq.onerror = () => reject(annReq.error);
    });
    for (const k of annKeys) tx.objectStore("annotations").delete(k);
    const prevIdx = tx.objectStore("previews").index("bySession");
    const prevReq = prevIdx.getAllKeys(sessionKeyValue);
    const prevKeys = await new Promise((resolve, reject) => {
      prevReq.onsuccess = () => resolve(prevReq.result || []);
      prevReq.onerror = () => reject(prevReq.error);
    });
    for (const k of prevKeys) tx.objectStore("previews").delete(k);
    await txDone(tx);
    db.close();
  }

  async function setMeta(key, value) {
    const db = await openDb();
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key, value });
    await txDone(tx);
    db.close();
  }

  async function getMeta(key) {
    const db = await openDb();
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").get(key);
    const result = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
    db.close();
    return result;
  }

  global.XrayReviewStorage = {
    sessionKey,
    putSession,
    getSession,
    listSessions,
    putAnnotation,
    putAnnotationsBulk,
    getAllAnnotations,
    putPreview,
    putPreviewsBulk,
    getPreview,
    clearSession,
    setMeta,
    getMeta,
  };
})(typeof window !== "undefined" ? window : globalThis);
