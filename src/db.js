import Dexie from 'dexie';

export const db = new Dexie('SignalDB');

db.version(1).stores({
  beacons: 'id, type, timestamp, authorPublicKey',
  trustEdges: 'id, voucherPublicKey, voucheePublicKey',
  device: 'id'
});
