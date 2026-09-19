export async function saveReceiptEvidence(items: { id: string; pdf: Blob }[]): Promise<void> {
  if (!items.length) return;
  const database = await openEvidenceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("pdfs", "readwrite");
      const store = transaction.objectStore("pdfs");
      for (const item of items) store.put(item.pdf, item.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not store receipt PDFs"));
      transaction.onabort = () => reject(transaction.error || new Error("Receipt PDF storage was cancelled"));
    });
  } finally {
    database.close();
  }
}

export async function getReceiptEvidence(id: string): Promise<Blob | undefined> {
  const database = await openEvidenceDatabase();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const transaction = database.transaction("pdfs", "readonly");
      const request = transaction.objectStore("pdfs").get(id);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
      request.onerror = () => reject(request.error || new Error("Could not read receipt PDF"));
    });
  } finally {
    database.close();
  }
}

function openEvidenceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ams-receipt-evidence", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("pdfs");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Receipt PDF storage is unavailable"));
  });
}
