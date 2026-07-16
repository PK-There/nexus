import { useState } from 'react';
import PrintableQRBeacon from './PrintableQRBeacon';

export default function CreateBeaconForm({ onSubmit, onClose, pinLocation, onDropPin, onGetGPS }) {
  const [type, setType] = useState('');
  const [urgency, setUrgency] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supportsSpeech = !!SpeechRecognition;

  const types = [
    { value: 'NEED', label: '🆘 NEED', icon: '🆘', color: '#ff4d6a', description: 'Request urgent help' },
    { value: 'OFFER', label: '🤝 OFFER', icon: '🤝', color: '#00d68f', description: 'Offer assistance' },
    { value: 'ALERT', label: '⚠️ ALERT', icon: '⚠️', color: '#ffaa00', description: 'Report a hazard' },
    { value: 'STATUS', label: 'ℹ️ STATUS', icon: 'ℹ️', color: '#3b82f6', description: 'Share safety update' }
  ];

  const urgencies = [
    { value: 'critical', label: 'CRITICAL', color: '#ff4d6a' },
    { value: 'high', label: 'HIGH', color: '#ff8800' },
    { value: 'medium', label: 'MEDIUM', color: '#ffaa00' },
    { value: 'low', label: 'LOW', color: '#3b82f6' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!type) {
      setError('Please select a beacon type (Need, Offer, Alert, or Status).');
      return;
    }
    if (!urgency) {
      setError('Please select an urgency level.');
      return;
    }
    onSubmit({
      type,
      urgency,
      message: message.trim()
    });
  };

  const handleGenerateQR = () => {
    if (!type) {
      setError('Please select a beacon type.');
      return;
    }
    if (!urgency) {
      setError('Please select an urgency level.');
      return;
    }
    setShowQR(true);
  };

  if (showQR) {
    const beaconData = {
      id: window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(),
      type,
      urgency,
      message: message.trim(),
      timestamp: Date.now()
    };
    return <PrintableQRBeacon beaconData={beaconData} onClose={() => setShowQR(false)} />;
  }

  const handleMicClick = () => {
    if (!supportsSpeech) {
      setSpeechError('Browser does not support voice input.');
      return;
    }

    if (isListening) return;

    setSpeechError('');
    setIsListening(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage((prev) => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access denied. Please check permissions.');
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setSpeechError('Failed to start voice input.');
      setIsListening(false);
    }
  };

  const selectedTypeObj = types.find(t => t.value === type);
  const submitButtonBg = selectedTypeObj
    ? `linear-gradient(135deg, ${selectedTypeObj.color}, ${selectedTypeObj.color}cc)`
    : 'linear-gradient(135deg, var(--accent-cyan), #7c5cff)';
  const submitButtonShadow = selectedTypeObj
    ? `0 4px 20px rgba(${selectedTypeObj.value === 'NEED' ? '255, 77, 106' : selectedTypeObj.value === 'OFFER' ? '0, 214, 143' : selectedTypeObj.value === 'ALERT' ? '255, 170, 0' : '59, 130, 246'}, 0.3)`
    : 'var(--shadow-glow)';

  return (
    <div className="form-overlay" id="create-beacon-overlay" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <form onSubmit={handleSubmit} className="beacon-form" id="create-beacon-form">
        <header className="form-header">
          <h2 id="form-title">📡 Broadcast Signal</h2>
          <button 
            type="button" 
            className="form-close-btn" 
            onClick={onClose}
            aria-label="Close form"
            id="close-beacon-form"
          >
            ✕
          </button>
        </header>

        {error && (
          <div className="gps-error-msg" id="form-error-msg" role="alert" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* 1. Choose Type */}
        <fieldset className="form-group">
          <legend className="form-label">1. Choose Type *</legend>
          <div className="type-grid" role="radiogroup" aria-label="Beacon Type Selector">
            {types.map((t) => {
              const isActive = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`type-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setType(t.value);
                    setError('');
                  }}
                  data-type={t.value}
                  aria-checked={isActive}
                  role="radio"
                  id={`type-btn-${t.value.toLowerCase()}`}
                  style={{
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isActive ? t.color : 'var(--border-glass)'
                  }}
                >
                  <span className="type-btn-icon" aria-hidden="true">{t.icon}</span>
                  <span className="type-btn-label">{t.value}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 2. Urgency Level */}
        <fieldset className="form-group" style={{ marginTop: '16px' }}>
          <legend className="form-label">2. Urgency Level *</legend>
          <div className="urgency-row" role="radiogroup" aria-label="Urgency Level Selector">
            {urgencies.map((u) => {
              const isActive = urgency === u.value;
              return (
                <button
                  key={u.value}
                  type="button"
                  className={`urgency-btn ${isActive ? 'active' : ''}`}
                  style={{ '--urgency-color': u.color }}
                  onClick={() => {
                    setUrgency(u.value);
                    setError('');
                  }}
                  aria-checked={isActive}
                  role="radio"
                  id={`urgency-btn-${u.value}`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 3. Message Details */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label htmlFor="beacon-message" className="form-label">3. Message Details (Optional)</label>
          <div style={{ position: 'relative' }}>
            <textarea
              id="beacon-message"
              className="form-textarea"
              placeholder="Provide critical details (e.g. 'Water supply contaminated', 'Insulin needed', etc.)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
              style={{ paddingRight: '45px' }}
            />

            {supportsSpeech && (
              <button
                type="button"
                onClick={handleMicClick}
                className="form-close-btn"
                style={{
                  position: 'absolute',
                  right: '8px',
                  bottom: '8px',
                  background: isListening ? '#ff4d6a' : 'var(--bg-glass)',
                  borderColor: isListening ? '#ff4d6a' : 'var(--border-glass)',
                  width: '32px',
                  height: '32px',
                  fontSize: '1rem',
                  color: isListening ? '#fff' : 'var(--text-primary)',
                  boxShadow: isListening ? '0 0 10px rgba(255, 77, 106, 0.5)' : 'none',
                }}
                title="Voice Input"
                aria-label="Start Voice Input"
              >
                🎤
              </button>
            )}
          </div>

          {isListening && (
            <div style={{ color: '#ff4d6a', fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ff4d6a',
                animation: 'pulse-dot 1.5s infinite'
              }}></span>
              Listening... Speak now.
            </div>
          )}

          {speechError && (
            <div className="gps-badge failed" style={{ marginTop: '6px', display: 'inline-block' }}>
              {speechError}
            </div>
          )}
        </div>

        {/* 4. Location Selector */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <span className="form-label">4. Location *</span>
          <div className="urgency-row">
            <button
              type="button"
              className={`urgency-btn ${pinLocation ? 'active' : ''}`}
              style={{ 
                '--urgency-color': '#00d68f', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                padding: '12px' 
              }}
              onClick={onGetGPS}
            >
              📍 Use GPS
            </button>
            <button
              type="button"
              className="urgency-btn"
              style={{ 
                '--urgency-color': '#00d2ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                padding: '12px' 
              }}
              onClick={onDropPin}
            >
              🗺️ Drop Pin
            </button>
          </div>
          {pinLocation ? (
            <div className="gps-badge success" style={{ marginTop: '12px', display: 'block', textAlign: 'center', padding: '6px' }}>
              ✅ Location set: {pinLocation.lat.toFixed(4)}, {pinLocation.lng.toFixed(4)}
            </div>
          ) : (
            <div className="gps-badge failed" style={{ marginTop: '12px', display: 'block', textAlign: 'center', padding: '6px' }}>
              ⚠️ Location not set (Get GPS or drop map pin)
            </div>
          )}
        </div>

        {/* Action Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
          <button
            type="submit"
            className="form-submit-btn"
            id="broadcast-submit-btn"
            style={{
              background: submitButtonBg,
              boxShadow: submitButtonShadow,
              marginTop: '0'
            }}
          >
            📢 BROADCAST SIGNAL
          </button>
          <button
            type="button"
            className="vouch-btn"
            onClick={handleGenerateQR}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--bg-glass)',
              borderColor: 'var(--border-glass)',
            }}
          >
            🖨️ Generate Offline QR Card
          </button>
        </div>
      </form>
    </div>
  );
}
