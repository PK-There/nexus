/**
 * App.jsx — Signal root component
 *
 * Phase 2 wiring:
 *   - Uses `useLiveQuery` from dexie-react-hooks to subscribe to db.beacons
 *   - Passes live data to MapView and ListView (replacing hardcoded dummy data)
 *   - Manages CreateBeaconForm open/close and pin-drop mode for GPS fallback
 *   - Seeds the database on first load so the app isn't blank
 *
 * Phase 3 wiring:
 *   - SyncModal for mesh sync (WebRTC P2P + Socket.io relay)
 *   - syncService auto-connects to relay on mount
 *   - Sync FAB button with connection status indicator
 */

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedIfEmpty } from './db';
import { syncService } from './syncService';
import MapView from './components/MapView';
import ListView from './components/ListView';
import CreateBeaconForm from './components/CreateBeaconForm';
import SyncModal from './components/SyncModal';
import TrustGraph from './components/TrustGraph';

export default function App() {
  const [activeView, setActiveView] = useState('map');
  const [showForm, setShowForm] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [relayStatus, setRelayStatus] = useState('disconnected');
  const [peerConnected, setPeerConnected] = useState(false);

  // ── Seed DB on first load ──────────────────────────────────
  useEffect(() => {
    seedIfEmpty();
  }, []);

  // ── Auto-connect relay + track status ──────────────────────
  useEffect(() => {
    syncService.onRelayStatus = (status) => setRelayStatus(status);
    syncService.onPeerConnected = () => setPeerConnected(true);
    syncService.onPeerDisconnected = () => setPeerConnected(false);

    // Auto-connect to relay on app load
    syncService.connectRelay();

    return () => {
      syncService.onRelayStatus = null;
      syncService.onPeerConnected = null;
      syncService.onPeerDisconnected = null;
    };
  }, []);

  // ── Live query: subscribe to ALL beacons, sorted newest first ──
  const beacons = useLiveQuery(
    () => db.beacons.orderBy('timestamp').reverse().toArray(),
    [],    // deps — empty = re-run only when table changes
    []     // default value while loading
  );

  // ── Pin-drop from main map (GPS fallback) ──────────────────
  function handleMapClick(coords) {
    if (pinDropMode) {
      setPinLocation(coords);
      setPinDropMode(false);
      // Auto-open form if not already open
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

  // ── Status indicator logic ─────────────────────────────────
  const statusDot = peerConnected
    ? 'connected'
    : relayStatus === 'connected'
      ? 'relay'
      : 'offline';

  const statusText = peerConnected
    ? 'P2P Connected'
    : relayStatus === 'connected'
      ? 'Relay Online'
      : 'Offline Mode';

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────────── */}
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

      {/* ── View toggle ─────────────────────────────────────── */}
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

      {/* ── Main content ────────────────────────────────────── */}
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

      {/* ── FAB: Sync ───────────────────────────────────────── */}
      <button
        className={`fab-sync ${peerConnected ? 'connected' : ''}`}
        onClick={() => setShowSync(true)}
        aria-label="Open mesh sync"
        title="Mesh Sync"
      >
        🔗
      </button>

      {/* ── FAB: Create Beacon ──────────────────────────────── */}
      <button
        className="fab"
        onClick={handleOpenForm}
        aria-label="Create new beacon"
        title="Create Beacon"
      >
        <span className="fab-icon">+</span>
      </button>

      {/* ── Beacon count indicator ──────────────────────────── */}
      {beacons.length > 0 && (
        <div className="beacon-count">
          {beacons.length} beacon{beacons.length !== 1 ? 's' : ''} active
        </div>
      )}

      {/* ── Create Form Overlay ─────────────────────────────── */}
      {showForm && (
        <CreateBeaconForm
          onClose={handleCloseForm}
          pinLocation={pinLocation}
          onRequestPin={() => {
            setPinDropMode(true);
            setActiveView('map'); // Switch to map for pin-drop
          }}
        />
      )}

      {/* ── Sync Modal Overlay ──────────────────────────────── */}
      {showSync && (
        <SyncModal onClose={() => setShowSync(false)} />
      )}
    </div>
  );
}
