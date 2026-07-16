

import Dexie from 'dexie';
export const db = new Dexie('SignalDB_v5');
db.version(1).stores({
  beacons: 'id, type, urgency, timestamp, lat, lng, authorPublicKey',
  trustEdges: 'id, fromKey, toKey, timestamp',
  device: 'id',
});

export async function seedIfEmpty() {
  const count = await db.beacons.count();
  if (count > 0) return;
  console.log('Database empty, ready for real beacons.');
}
