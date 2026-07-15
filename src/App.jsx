import { useState } from 'react';
import MapView from './components/MapView';
import ListView from './components/ListView';
import DUMMY_BEACONS from './data/beacons';

export default function App() {
  const [activeView, setActiveView] = useState('map');

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
          <MapView beacons={DUMMY_BEACONS} />
        ) : (
          <ListView beacons={DUMMY_BEACONS} />
        )}
      </main>
    </div>
  );
}
