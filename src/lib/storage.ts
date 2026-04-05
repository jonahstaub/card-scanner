import { openDB, type IDBPDatabase } from "idb";
import type { Card } from "./types";

const DB_NAME = "crystal-ball-cards";
const DB_VERSION = 1;
const STORE_NAME = "cards";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("scannedAt", "scannedAt");
        store.createIndex("playerName", "playerName");
      }
    },
  });
}

export async function saveCard(card: Card): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, card);
}

export async function getCard(id: string): Promise<Card | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getAllCards(): Promise<Card[]> {
  const db = await getDB();
  const cards = await db.getAll(STORE_NAME);
  return cards.sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function updateCardNotes(
  id: string,
  notes: string
): Promise<void> {
  const db = await getDB();
  const card = await db.get(STORE_NAME, id);
  if (card) {
    card.notes = notes;
    await db.put(STORE_NAME, card);
  }
}

export async function updateCardPredictions(
  id: string,
  predictions: Card["predictions"],
  currentPrice: number,
  priceRange: Card["priceRange"],
  priceSources: Card["priceSources"]
): Promise<void> {
  const db = await getDB();
  const card = await db.get(STORE_NAME, id);
  if (card) {
    card.predictions = predictions;
    card.currentPrice = currentPrice;
    card.priceRange = priceRange;
    card.priceSources = priceSources;
    card.lastUpdated = new Date().toISOString();
    await db.put(STORE_NAME, card);
  }
}
