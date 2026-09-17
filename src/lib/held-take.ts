/* A recording made before signing in, kept in the browser until the person
   comes back signed in and it can be saved.

   The point: someone arrives on a word from a search or the poster, presses
   record, says the word — and only then is asked to sign in. Signing in
   leaves the page for Google and comes back, and anything in memory is gone
   by then. So the take goes into IndexedDB first, which survives the round
   trip on the same origin, and the entry page picks it up on return.

   Nothing here leaves the browser. If the person never signs in, the take
   sits in their own IndexedDB until it expires, and no one else can see it.

   IndexedDB can be unavailable — Safari private windows, a locked-down
   profile — and every call here swallows that into a null or a false, so
   the recorder can fall back to "sign in first" rather than break. */

export type HeldKind = "headword" | "example";

export interface HeldTake {
  entryId: string;
  kind: HeldKind;
  senseId: string | null;
  blob: Blob;
  seconds: number;
  note: string;
  heldAt: number;
}

const DB = "fuzhounese";
const STORE = "held-takes";
/* A take older than this is not saved on return: someone who signs in a week
   later probably does not expect a recording they forgot about to appear. */
export const HELD_TAKE_TTL_MS = 24 * 60 * 60 * 1000;

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/* One held take per entry. Holding a second replaces the first: it is the
   same word, and the newer take is the one the person just chose. */
export async function holdTake(take: HeldTake): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(take, take.entryId);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

/* The take held for this entry, if there is one and it is still fresh. A
   stale one is removed on the way past. */
export async function heldTake(entryId: string): Promise<HeldTake | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.get(entryId);
      req.onsuccess = () => {
        const t = req.result as HeldTake | undefined;
        if (!t || !(t.blob instanceof Blob)) return resolve(null);
        if (Date.now() - t.heldAt > HELD_TAKE_TTL_MS) {
          store.delete(entryId);
          return resolve(null);
        }
        resolve(t);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function releaseTake(entryId: string): Promise<void> {
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(entryId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}
