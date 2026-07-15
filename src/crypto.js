import { db } from './db.js';

export async function initializeDeviceIdentity() {
  try {
    const existingDevice = await db.device.get('me');
    if (existingDevice) {
      console.log('Device identity already exists.');
      return existingDevice;
    }

    console.log('Generating new device identity (ECDSA P-256)...');
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true, // extractable
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
    console.error('Failed to initialize device identity:', error);
    throw error;
  }
}

export async function saveNewBeacon(beaconPayload) {
  const device = await db.device.get('me');
  if (!device) throw new Error("No cryptographic identity found for device");
  
  // Create full beacon object
  const fullBeacon = {
    ...beaconPayload,
    id: `beacon-${crypto.randomUUID()}`,
    timestamp: Date.now(),
    ttl: 1000 * 60 * 60 * 48, // 48 hours
    authorPublicKey: device.publicKey
  };
  
  // Convert payload to string for signing
  const encoder = new TextEncoder();
  // We sign everything except the signature field itself
  const data = encoder.encode(JSON.stringify(fullBeacon));
  
  // Re-import private key from JWK
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
