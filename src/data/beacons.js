/**
 * Hardcoded dummy beacon data for Phase 1 scaffolding.
 * Each beacon has: id, type, message, lat, lng, urgency, timestamp.
 * 
 * Types follow the data model from the build plan:
 *   NEED  — Someone needs help
 *   OFFER — Someone is offering help
 *   ALERT — Area-wide warning
 *   STATUS — "I'm safe" check-in
 *
 * Coordinates are set around central Mumbai (Colaba / Fort area)
 * for a realistic Indian disaster-response demo scenario.
 */
const DUMMY_BEACONS = [
  {
    id: 'beacon-001',
    type: 'NEED',
    message: 'Insulin needed urgently — diabetic patient, building 4, ground floor.',
    lat: 18.9220,
    lng: 72.8347,
    urgency: 'critical',
    timestamp: Date.now() - 1000 * 60 * 12, // 12 min ago
  },
  {
    id: 'beacon-002',
    type: 'OFFER',
    message: 'Clean drinking water available — 200 bottles. Come to Oval Maidan entrance.',
    lat: 18.9280,
    lng: 72.8310,
    urgency: 'medium',
    timestamp: Date.now() - 1000 * 60 * 5,  // 5 min ago
  },
  {
    id: 'beacon-003',
    type: 'ALERT',
    message: 'Road flooded on Marine Drive between Churchgate and NCPA. Avoid area.',
    lat: 18.9400,
    lng: 72.8235,
    urgency: 'high',
    timestamp: Date.now() - 1000 * 60 * 25, // 25 min ago
  },
  {
    id: 'beacon-004',
    type: 'STATUS',
    message: 'Family of 4 safe at home. No injuries. Can shelter 2 more people.',
    lat: 18.9320,
    lng: 72.8380,
    urgency: 'low',
    timestamp: Date.now() - 1000 * 60 * 2,  // 2 min ago
  },
];

export default DUMMY_BEACONS;
