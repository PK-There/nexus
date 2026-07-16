import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { calculateTrustScore } from '../trustLogic';

const BEACON_COLORS = {
  NEED:   '#ff4d6a',  // urgent red-pink
  OFFER:  '#00d68f',  // helpful green
  ALERT:  '#ffaa00',  // warning amber
  STATUS: '#3b82f6',  // calm blue
};

const BEACON_LABELS = {
  NEED:   '🆘 NEED',
  OFFER:  '🤝 OFFER',
  ALERT:  '⚠️ ALERT',
  STATUS: 'ℹ️ STATUS',
};

function createBeaconIcon(type) {
  const color = BEACON_COLORS[type] || '#888';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <path d="M16 0 C7.2 0 0 7.2 0 16 C0 28 16 44 16 44 S32 28 32 16 C32 7.2 24.8 0 16 0Z"
            fill="${color}" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    </svg>
  `;
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -46],
  });
}

function urgencyBadge(urgency) {
  const map = {
    critical: { bg: '#ff4d6a', label: 'CRITICAL' },
    high:     { bg: '#ff8800', label: 'HIGH' },
    medium:   { bg: '#ffaa00', label: 'MEDIUM' },
    low:      { bg: '#3b82f6', label: 'LOW' },
  };
  const u = map[urgency] || map.low;
  return `<span style="
    display:inline-block;
    padding:2px 8px;
    border-radius:4px;
    font-size:11px;
    font-weight:700;
    color:#fff;
    background:${u.bg};
    letter-spacing:0.05em;
  ">${u.label}</span>`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
    },
  });
  return null;
}

export default function MapView({ beacons, pinDropMode, onMapClick }) {
  const defaultCenter = [18.932, 72.832];
  const defaultZoom = 14;

  const device = useLiveQuery(() => db.device.get('me'));
  const edges = useLiveQuery(() => db.trustEdges.toArray()) || [];
  const myKey = device?.publicKey;

  return (
    <div className="map-wrapper" id="map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
        className={`leaflet-map ${pinDropMode ? 'pin-drop-mode' : ''}`}
        id="signal-map"
      >
        {}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={onMapClick} />

        {beacons.map((beacon) => {
          if (beacon.lat == null || beacon.lng == null) return null; // Don't render marker if no location
          const trustScore = calculateTrustScore(beacon.authorPublicKey, myKey, edges);

          return (
            <Marker
              key={beacon.id}
              position={[beacon.lat, beacon.lng]}
              icon={createBeaconIcon(beacon.type)}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: BEACON_COLORS[beacon.type],
                    }}>
                      {BEACON_LABELS[beacon.type]}
                    </span>
                    <span
                      dangerouslySetInnerHTML={{ __html: urgencyBadge(beacon.urgency) }}
                    />
                  </div>

                  {trustScore > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{
                        fontSize: '11px',
                        background: 'rgba(0, 214, 143, 0.2)',
                        color: '#00d68f',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        ✅ Trusted {trustScore === 100 ? '(You)' : trustScore === 80 ? '(Direct)' : '(2-hop)'}
                      </span>
                    </div>
                  )}

                  <p style={{ margin: '6px 0', fontSize: 13, lineHeight: 1.45 }}>
                    {beacon.message}
                  </p>
                  <span style={{
                    fontSize: 11,
                    color: '#888',
                    fontStyle: 'italic',
                  }}>
                    {timeAgo(beacon.timestamp)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
