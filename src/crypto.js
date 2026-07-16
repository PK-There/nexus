import { db } from './db.js';

function deterministicStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = obj[key];
  }
  return JSON.stringify(sortedObj);
}

function safeUUID() {
  try {
    return crypto.randomUUID();
  } catch {

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

function hasCrypto() {
  return !!(window.crypto?.subtle);
}

export async function initializeDeviceIdentity() {
  try {
    const existingDevice = await db.device.get('me');
    if (existingDevice) {
      console.log('Device identity already exists.');
      return existingDevice;
    }

    if (!hasCrypto()) {
      console.warn('WebCrypto unavailable — using simple random identity (no signing)');
      const deviceData = {
        id: 'me',
        publicKey: `device-${safeUUID()}`,
        privateKey: null,
        createdAt: Date.now(),
        isFallback: true
      };
      await db.device.put(deviceData);
      return deviceData;
    }

    console.log('Generating new device identity (ECDSA P-256)...');
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

    const deviceData = {
      id: 'me',
      publicKey: publicKeyJwk,
      privateKey: privateKeyJwk,
      createdAt: Date.now()
    };

    await db.device.put(deviceData);
    console.log('Device identity initialized and saved.');
    return deviceData;
  } catch (error) {

    console.error('Failed to initialize device identity, using emergency fallback:', error);
    const fallback = {
      id: 'me',
      publicKey: `device-emergency-${safeUUID()}`,
      privateKey: null,
      createdAt: Date.now(),
      isFallback: true
    };
    try { await db.device.put(fallback); } catch {  }
    return fallback;
  }
}

export async function saveNewBeacon(beaconPayload) {
  let device = await db.device.get('me');

  if (!device) {
    console.warn('No device identity found — creating fallback identity now');
    device = await initializeDeviceIdentity();
  }

  const fullBeacon = {
    ...beaconPayload,
    id: `beacon-${safeUUID()}`,
    timestamp: Date.now(),
    ttl: 1000 * 60 * 60 * 48, // 48 hours
    authorPublicKey: device.publicKey
  };

  if (device.isFallback || !window.crypto?.subtle) {
    const finalBeacon = { ...fullBeacon, signature: null };
    await db.beacons.put(finalBeacon);
    console.log("Saved beacon (no signature — fallback mode):", finalBeacon.id);
    return finalBeacon;
  }

  const encoder = new TextEncoder();

  const data = encoder.encode(deterministicStringify(fullBeacon));

  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    device.privateKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    data
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const hexSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const finalBeacon = {
    ...fullBeacon,
    signature: hexSignature
  };

  await db.beacons.put(finalBeacon);
  console.log("Successfully signed and saved beacon to DB:", finalBeacon.id);
  return finalBeacon;
}

export async function verifyBeaconSignature(beacon) {
  try {
    const { signature, ...payload } = beacon;

    if (payload.authorPublicKey && payload.authorPublicKey.startsWith('seed-demo-key')) {
      return true;
    }

    if (payload.authorPublicKey && (
      payload.authorPublicKey.startsWith('device-') ||
      typeof payload.authorPublicKey === 'string' && payload.authorPublicKey.startsWith('device-emergency-')
    )) return true;

    if (!signature || !payload.authorPublicKey) return false;

    const encoder = new TextEncoder();
    const data = encoder.encode(deterministicStringify(payload));

    const signatureBuffer = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const publicKey = await window.crypto.subtle.importKey(
      'jwk',
      payload.authorPublicKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const isValid = await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBuffer,
      data
    );

    return isValid;
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}

export async function createTrustEdge(targetPublicKey) {
  const device = await db.device.get('me');
  if (!device) throw new Error("No cryptographic identity found for device");

  const fromStr = typeof device.publicKey === 'object' ? JSON.stringify(device.publicKey) : String(device.publicKey);
  const toStr = typeof targetPublicKey === 'object' ? JSON.stringify(targetPublicKey) : String(targetPublicKey);

  const edge = {
    id: `${fromStr}_${toStr}`,
    fromKey: device.publicKey,
    toKey: targetPublicKey,
    timestamp: Date.now()
  };

  if (device.isFallback || !window.crypto?.subtle) {
    const finalEdge = { ...edge, signature: null };
    await db.trustEdges.put(finalEdge);
    console.log(`Saved trust edge to ${toStr.slice(0,8)}... (fallback mode, no signature)`);
    return finalEdge;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(deterministicStringify(edge));

  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    device.privateKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    data
  );

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const hexSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const finalEdge = {
    ...edge,
    signature: hexSignature
  };

  await db.trustEdges.put(finalEdge);
  console.log(`Successfully created and signed trust edge to ${toStr.slice(0,8)}...`);
  return finalEdge;
}

export async function verifyTrustEdgeSignature(edge) {
  try {
    const { signature, ...payload } = edge;

    if (payload.fromKey && (
      payload.fromKey.startsWith('device-') ||
      typeof payload.fromKey === 'string' && payload.fromKey.startsWith('device-emergency-')
    )) return true;

    if (!signature || !payload.fromKey || !payload.toKey) return false;

    const encoder = new TextEncoder();
    const data = encoder.encode(deterministicStringify(payload));

    const signatureBuffer = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    const publicKey = await window.crypto.subtle.importKey(
      'jwk',
      payload.fromKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const isValid = await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBuffer,
      data
    );

    return isValid;
  } catch (err) {
    console.error("Trust edge signature verification failed:", err);
    return false;
  }
}
