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
