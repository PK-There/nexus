

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { calculateTrustScore } from '../trustLogic';

const BEACON_CONFIG = {
  NEED: {
    icon: '🆘',
    label: 'NEED',
    color: '#ff4d6a',
    gradient: 'linear-gradient(135deg, rgba(255,77,106,0.12), rgba(255,77,106,0.04))',
    border: 'rgba(255,77,106,0.25)',
  },
  OFFER: {
    icon: '🤝',
    label: 'OFFER',
    color: '#00d68f',
    gradient: 'linear-gradient(135deg, rgba(0,214,143,0.12), rgba(0,214,143,0.04))',
    border: 'rgba(0,214,143,0.25)',
  },
  ALERT: {
    icon: '⚠️',
    label: 'ALERT',
    color: '#ffaa00',
    gradient: 'linear-gradient(135deg, rgba(255,170,0,0.12), rgba(255,170,0,0.04))',
    border: 'rgba(255,170,0,0.25)',
  },
  STATUS: {
    icon: 'ℹ️',
    label: 'STATUS',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
    border: 'rgba(59,130,246,0.25)',
  },
};

const URGENCY_STYLES = {
  critical: { bg: '#ff4d6a', label: 'CRITICAL', pulse: true },
  high:     { bg: '#ff8800', label: 'HIGH',     pulse: false },
  medium:   { bg: '#ffaa00', label: 'MEDIUM',   pulse: false },
  low:      { bg: '#3b82f6', label: 'LOW',      pulse: false },
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function BeaconCard({ beacon, myKey, edges }) {
  const cfg = BEACON_CONFIG[beacon.type] || BEACON_CONFIG.STATUS;
  const urg = URGENCY_STYLES[beacon.urgency] || URGENCY_STYLES.low;
  const trustScore = calculateTrustScore(beacon.authorPublicKey, myKey, edges);

  return (
    <article
      className={`beacon-card ${urg.pulse ? 'beacon-card--pulse' : ''}`}
      id={`beacon-card-${beacon.id}`}
      style={{
        background: cfg.gradient,
        borderLeft: `4px solid ${cfg.color}`,
        borderColor: cfg.border,
      }}
      aria-label={`${cfg.label} beacon: ${beacon.message}`}
    >
      {}
      <div className="beacon-card__header">
        <div className="beacon-card__type-group">
          <span className="beacon-card__icon" aria-hidden="true">{cfg.icon}</span>
          <span className="beacon-card__type" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          {trustScore > 0 && (
            <span className="trust-badge" title={`Trust Score: ${trustScore}`} style={{
              marginLeft: '8px',
              fontSize: '12px',
              background: 'rgba(0, 214, 143, 0.2)',
              color: '#00d68f',
              padding: '2px 6px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✅ Trusted {trustScore === 100 ? '(You)' : trustScore === 80 ? '(Direct)' : '(2-hop)'}
            </span>
          )}
        </div>
        <span
          className="beacon-card__urgency"
          style={{ background: urg.bg }}
        >
          {urg.label}
        </span>
      </div>

      {}
      <p className="beacon-card__message">{beacon.message}</p>

      {}
      <div className="beacon-card__footer">
        <span className="beacon-card__coords">
          📍 {beacon.lat != null && beacon.lng != null ? `${beacon.lat.toFixed(4)}, ${beacon.lng.toFixed(4)}` : 'Location Not Provided'}
        </span>
        <span className="beacon-card__time">
          {timeAgo(beacon.timestamp)}
        </span>
      </div>
    </article>
  );
}

export default function ListView({ beacons }) {
  const device = useLiveQuery(() => db.device.get('me'));
  const edges = useLiveQuery(() => db.trustEdges.toArray()) || [];
  const myKey = device?.publicKey;

  return (
    <section className="list-view" id="list-view" aria-label="Beacon feed">
      <h2 className="list-view__title">
        <span className="list-view__title-icon" aria-hidden="true">📡</span>
        Live Beacon Feed
        <span className="list-view__count">{beacons.length}</span>
      </h2>
      <div className="list-view__cards">
        {beacons.map((beacon) => (
          <BeaconCard key={beacon.id} beacon={beacon} myKey={myKey} edges={edges} />
        ))}
      </div>
    </section>
  );
}
