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
    { value: 'NEED', label: 'NEED', icon: '🆘', color: '#ff4d6a', description: 'Request Help' },
    { value: 'OFFER', label: 'OFFER', icon: '🤝', color: '#00d68f', description: 'Offer Support' },
    { value: 'ALERT', label: 'ALERT', icon: '⚠️', color: '#ffaa00', description: 'Area Hazard' },
    { value: 'STATUS', label: 'STATUS', icon: 'ℹ️', color: '#3b82f6', description: 'Safety Check' }
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
      setError('Please select a beacon type (Need, Offer, Alert, or Status).');
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
      recognition.interimResults = false; // Only trigger on final sentences
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

  return (
    <div className="beacon-overlay" id="create-beacon-overlay" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className="beacon-form-container" id="create-beacon-form">
        <header className="beacon-form__header">
          <h2 className="beacon-form__title" id="form-title">📡 Broadcast Signal</h2>
          <button 
            type="button" 
            className="beacon-form__close-btn" 
            onClick={onClose}
            aria-label="Close form"
            id="close-beacon-form"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="beacon-form">
          {error && (
            <div className="beacon-form__error" id="form-error-msg" role="alert">
              ⚠️ {error}
            </div>
          )}

          {}
          <div className="beacon-form__section">
            <span className="beacon-form__label">1. CHOOSE TYPE <span className="required-star">*</span></span>
            <div className="beacon-type-grid" role="radiogroup" aria-label="Beacon Type Selector">
              {types.map((t) => {
                const isActive = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    className={`beacon-type-btn beacon-type-btn--${t.value.toLowerCase()} ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setType(t.value);
                      setError('');
                    }}
                    aria-checked={isActive}
                    role="radio"
                    id={`type-btn-${t.value.toLowerCase()}`}
                  >
                    <span className="beacon-type-btn__icon" aria-hidden="true">{t.icon}</span>
                    <div className="beacon-type-btn__text-container">
                      <span className="beacon-type-btn__label">{t.label}</span>
                      <span className="beacon-type-btn__desc">{t.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {}
          <div className="beacon-form__section">
            <span className="beacon-form__label">2. URGENCY LEVEL <span className="required-star">*</span></span>
            <div className="beacon-urgency-grid" role="radiogroup" aria-label="Urgency Level Selector">
              {urgencies.map((u) => {
                const isActive = urgency === u.value;
                return (
                  <button
                    key={u.value}
                    type="button"
                    className={`beacon-urgency-btn beacon-urgency-btn--${u.value} ${isActive ? 'active' : ''}`}
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
          </div>

          {}
          <div className="beacon-form__section">
            <label htmlFor="beacon-message" className="beacon-form__label">3. MESSAGE DETAILS (OPTIONAL)</label>
            <div className="beacon-textarea-wrapper" style={{ position: 'relative' }}>
              <textarea
                id="beacon-message"
                className="beacon-textarea"
                placeholder="Provide critical details (e.g. 'Water supply contaminated', 'Insulin needed for elderly patient', etc.)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="3"
                style={{ width: '100%', paddingRight: '45px', boxSizing: 'border-box' }}
              />

              {supportsSpeech && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  className="beacon-mic-btn"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    background: isListening ? '#ff4d6a' : 'transparent',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: isListening ? '#fff' : '#888',
                    transition: 'all 0.2s ease',
                    animation: isListening ? 'pulse 1.5s infinite' : 'none',
                  }}
                  title="Voice Input"
                  aria-label="Start Voice Input"
                >
                  🎤
                </button>
              )}
            </div>

            {}
            {isListening && (
              <div style={{ color: '#ff4d6a', fontSize: '0.85rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulsing-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d6a', animation: 'pulse 1.5s infinite' }}></span>
                Listening... Speak now.
              </div>
            )}

            {}
            {speechError && (
              <div style={{ color: '#ffaa00', fontSize: '0.85rem', marginTop: '6px' }}>
                {speechError}
              </div>
            )}

            {}
            <style>
              {`
                @keyframes pulse {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 77, 106, 0.7); }
                  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 77, 106, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 77, 106, 0); }
                }
              `}
            </style>
          </div>

          {}
          <div className="beacon-form__section">
            <span className="beacon-form__label">4. LOCATION <span className="required-star">*</span></span>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className="beacon-type-btn"
                style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={onGetGPS}
              >
                <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📍</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Use GPS</span>
              </button>

              <button
                type="button"
                className="beacon-type-btn"
                style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={onDropPin}
              >
                <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🗺️</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Drop Pin</span>
              </button>
            </div>
            {pinLocation && (
              <div style={{ fontSize: '0.8rem', color: '#00d68f', textAlign: 'center', padding: '6px', background: 'rgba(0, 214, 143, 0.1)', borderRadius: '4px' }}>
                ✅ Location set: {pinLocation.lat.toFixed(4)}, {pinLocation.lng.toFixed(4)}
              </div>
            )}
            {!pinLocation && (
              <div style={{ fontSize: '0.8rem', color: '#ffaa00', textAlign: 'center', padding: '6px' }}>
                ⚠️ Location not set
              </div>
            )}
          </div>

          {}
          <div className="beacon-form-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="submit"
              className="beacon-submit-btn"
              id="broadcast-submit-btn"
              style={{
                '--active-color': type ? types.find(t => t.value === type).color : 'var(--accent-status)'
              }}
            >
              📢 BROADCAST SIGNAL
            </button>
            <button
              type="button"
              className="beacon-submit-btn qr-fallback-btn"
              onClick={handleGenerateQR}
              style={{
                backgroundColor: 'transparent',
                border: '2px dashed var(--accent-status, #888)',
                color: 'var(--text-main, #fff)',
                fontSize: '1rem',
                padding: '12px',
                '--active-color': type ? types.find(t => t.value === type).color : 'var(--accent-status)'
              }}
              onMouseOver={(e) => {
                const activeColor = type ? types.find(t => t.value === type).color : '#888';
                e.currentTarget.style.borderColor = activeColor;
                e.currentTarget.style.color = activeColor;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-status, #888)';
                e.currentTarget.style.color = 'var(--text-main, #fff)';
              }}
            >
              🖨️ GENERATE OFFLINE QR CARD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
