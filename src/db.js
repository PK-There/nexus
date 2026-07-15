/**
 * Signal — Dexie.js Database
 * 
 * IndexedDB wrapper for offline-first beacon storage.
 * Schema follows the data model from Signal_48hr_Build_Plan.md:
 *   Beacon { id, type, authorPublicKey, signature, location, urgency, message, timestamp, ttl }
 * 
 * The `beacons` table is the single source of truth.
 * Use `useLiveQuery` from dexie-react-hooks to subscribe to real-time changes.
 */

import Dexie from 'dexie';

export const db = new Dexie('SignalDB');

db.version(2).stores({
  // Indexed fields: id (auto-increment primary key), type, urgency, timestamp, lat, lng
  // Non-indexed fields are still stored, just not queryable via index.
  beacons: '++id, type, urgency, timestamp, lat, lng, authorPublicKey',
  
  // Phase 4: Trust edges for the web of trust
  // 'id' is a string combining both keys: fromKey_toKey
  trustEdges: 'id, fromKey, toKey, timestamp',
});

/**
 * Seed the database with sample beacons if it's empty.
 * Called once on first load so the app isn't blank.
 */
export async function seedIfEmpty() {
  const count = await db.beacons.count();
  if (count > 0) return;

  const now = Date.now();
  await db.beacons.bulkAdd([
    {
      type: 'NEED',
      message: 'Family of 5 needs clean drinking water — ground floor flooded',
      lat: 19.076,
      lng: 72.8777,
      urgency: 'critical',
      timestamp: now - 1000 * 60 * 15,  // 15 min ago
      ttl: 1000 * 60 * 60 * 24,          // 24 hours
      authorPublicKey: 'seed-demo-key-1',
      signature: null,
    },
    {
      type: 'OFFER',
      message: 'Pharmacy open — distributing ORS packets and basic first-aid',
      lat: 19.082,
      lng: 72.881,
      urgency: 'normal',
      timestamp: now - 1000 * 60 * 45,  // 45 min ago
      ttl: 1000 * 60 * 60 * 12,
      authorPublicKey: 'seed-demo-key-2',
      signature: null,
    },
    {
      type: 'ALERT',
      message: '⚠️ Bridge on SV Road partially collapsed — avoid area',
      lat: 19.072,
      lng: 72.865,
      urgency: 'high',
      timestamp: now - 1000 * 60 * 5,   // 5 min ago
      ttl: 1000 * 60 * 60 * 6,
      authorPublicKey: 'seed-demo-key-3',
      signature: null,
    },
    {
      type: 'STATUS',
      message: 'Power restored in Sector 7 — cell tower still down',
      lat: 19.069,
      lng: 72.873,
      urgency: 'normal',
      timestamp: now - 1000 * 60 * 120,  // 2 hours ago
      ttl: 1000 * 60 * 60 * 8,
      authorPublicKey: 'seed-demo-key-4',
      signature: null,
    },
  ]);
}
