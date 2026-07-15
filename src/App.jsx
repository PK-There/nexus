import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { saveNewBeacon } from './crypto';
import MapView from './components/MapView';
import ListView from './components/ListView';
import CreateBeaconForm from './components/CreateBeaconForm';

export default function App() {
  const [activeView, setActiveView] = useState('map');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Dev 2: Use Dexie Live Query to fetch real beacons from the database!
  const beacons = useLiveQuery(() => db.beacons.orderBy('timestamp').reverse().toArray(), []) || [];

  const handleCreateBeacon = async (beaconData) => {
    try {
      // Dev 2: Fetch GPS Location
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser'));
        } else {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        }
      }).catch(err => {
        console.warn("Could not get GPS location, defaulting to Mumbai center.", err);
        return { coords: { latitude: 18.932, longitude: 72.832 } };
      });

      const finalData = {
        ...beaconData,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Dev 4: Cryptographically sign and save to local Dexie store
      await saveNewBeacon(finalData);
      
      setShowCreateForm(false);
    } catch (err) {
      console.error("Failed to broadcast beacon:", err);
      alert("Failed to create beacon: " + err.message);
    }
  };

  return (
    <div className="app" id="app-root">
      <header className="app-header" id="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">◉</span>
          <h1 className="app-header__title">Signal</h1>
          <span className="app-header__badge">MESH</span>
        </div>
        <div className="app-header__status">
          <span className="status-dot status-dot--offline" aria-hidden="true"></span>
          <span className="status-label">Offline Mode</span>
        </div>
      </header>

      <nav className="view-toggle" id="view-toggle" aria-label="View switcher">
        <button
          className={`view-toggle__btn ${activeView === 'map' ? 'view-toggle__btn--active' : ''}`}
          onClick={() => setActiveView('map')}
          id="toggle-map"
          aria-pressed={activeView === 'map'}
        >
          🗺️ Map
        </button>
        <button
          className={`view-toggle__btn ${activeView === 'list' ? 'view-toggle__btn--active' : ''}`}
          onClick={() => setActiveView('list')}
          id="toggle-list"
          aria-pressed={activeView === 'list'}
        >
          📋 Feed
        </button>
      </nav>

      <main className="app-main" id="app-main">
        {activeView === 'map' ? (
          <MapView beacons={beacons} />
        ) : (
          <ListView beacons={beacons} />
        )}

        {/* Floating Action Button for easy access under stress */}
        <button
          className="create-beacon-fab"
          onClick={() => setShowCreateForm(true)}
          id="open-create-beacon-form"
          aria-label="Create new beacon broadcast"
        >
          <span>📡</span> Broadcast
        </button>
      </main>

      {/* Conditionally render the modal overlay */}
      {showCreateForm && (
        <CreateBeaconForm
          onSubmit={handleCreateBeacon}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
