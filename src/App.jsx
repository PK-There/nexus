

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedIfEmpty } from './db';
import { syncService } from './syncService';
import MapView from './components/MapView';
import ListView from './components/ListView';
import CreateBeaconForm from './components/CreateBeaconForm';
import SyncModal from './components/SyncModal';
import TrustGraph from './components/TrustGraph';
import { saveNewBeacon } from './crypto';

export default function App() {
  const [activeView, setActiveView] = useState('map');
  const [showForm, setShowForm] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [relayStatus, setRelayStatus] = useState('disconnected');
  const [peerConnected, setPeerConnected] = useState(false);

  useEffect(() => {
    seedIfEmpty();
  }, []);

  useEffect(() => {
    syncService.onRelayStatus = (status) => setRelayStatus(status);
    syncService.onPeerConnected = () => setPeerConnected(true);
    syncService.onPeerDisconnected = () => setPeerConnected(false);

    syncService.connectRelay();

    return () => {
      syncService.onRelayStatus = null;
      syncService.onPeerConnected = null;
      syncService.onPeerDisconnected = null;
    };
  }, []);

  const beacons = useLiveQuery(
    () => db.beacons.orderBy('timestamp').reverse().toArray(),
    [],    // deps — empty = re-run only when table changes
    []     // default value while loading
  ) || [];

  function handleMapClick(coords) {
    if (pinDropMode) {
      setPinLocation(coords);
      setPinDropMode(false);

      if (!showForm) setShowForm(true);
    }
  }

  function handleOpenForm() {
    setShowForm(true);
    setPinLocation(null);  // Reset pin for fresh GPS attempt
  }

  function handleCloseForm() {
    setShowForm(false);
    setPinDropMode(false);
    setPinLocation(null);
  }

  function handleGetGPS() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPinLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        alert("Unable to retrieve your location. " + error.message);
      }
    );
  }

  function handleTriggerPinDrop() {
    setShowForm(false);
    setPinDropMode(true);
    setActiveView('map');
  }

  async function handleCreateBeacon(beaconData) {
    try {
      const payload = {
        ...beaconData,
        lat: pinLocation ? pinLocation.lat : null,
        lng: pinLocation ? pinLocation.lng : null
      };

      await saveNewBeacon(payload);
      handleCloseForm();
    } catch (err) {
      console.error("Failed to create beacon:", err);
      alert(`Failed to create beacon: ${err.message}`);
    }
  }

  const statusText = peerConnected
    ? 'P2P Connected'
    : relayStatus === 'connected'
      ? 'Relay Online'
      : 'Offline Mode';

  return (
    <div className="app">
      {}
      <header className="header">
        <div className="header-brand">
          <h1 className="header-title">Signal</h1>
          <span className="header-badge">MESH</span>
        </div>
        <div className="header-status">
          <span
            className="status-dot"
            style={{
              background: peerConnected
                ? 'var(--accent-green)'
                : relayStatus === 'connected'
                  ? 'var(--accent-cyan)'
                  : 'var(--accent-amber)',
            }}
          />
          <span className="status-text">{statusText}</span>
        </div>
      </header>

      {}
      <nav className="view-toggle" aria-label="View selector">
        <button
          className={`toggle-btn ${activeView === 'map' ? 'active' : ''}`}
          onClick={() => setActiveView('map')}
          aria-pressed={activeView === 'map'}
        >
          🗺️ Map
        </button>
        <button
          className={`toggle-btn ${activeView === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveView('feed')}
          aria-pressed={activeView === 'feed'}
        >
          📋 Feed
        </button>
        <button
          className={`toggle-btn ${activeView === 'trust' ? 'active' : ''}`}
          onClick={() => setActiveView('trust')}
          aria-pressed={activeView === 'trust'}
        >
          🤝 Trust
        </button>
      </nav>

      {}
      <main className="main-content">
        {activeView === 'map' && (
          <MapView
            beacons={beacons}
            pinDropMode={pinDropMode}
            onMapClick={handleMapClick}
          />
        )}
        {activeView === 'feed' && (
          <ListView beacons={beacons} />
        )}
        {activeView === 'trust' && (
          <TrustGraph />
        )}
      </main>

      {}
      <button
        className={`fab-sync ${peerConnected ? 'connected' : ''}`}
        onClick={() => setShowSync(true)}
        aria-label="Open mesh sync"
        title="Mesh Sync"
      >
        🔗
      </button>

      {}
      <button
        className="fab"
        onClick={handleOpenForm}
        aria-label="Create new beacon"
        title="Create Beacon"
      >
        <span className="fab-icon">+</span>
      </button>

      {}
      {beacons.length > 0 && (
        <div className="beacon-count">
          {beacons.length} beacon{beacons.length !== 1 ? 's' : ''} active
        </div>
      )}

      {}
      {showForm && (
        <CreateBeaconForm
          onSubmit={handleCreateBeacon}
          onClose={handleCloseForm}
          pinLocation={pinLocation}
          onGetGPS={handleGetGPS}
          onDropPin={handleTriggerPinDrop}
        />
      )}

      {}
      {showSync && (
        <SyncModal onClose={() => setShowSync(false)} />
      )}
    </div>
  );
}
