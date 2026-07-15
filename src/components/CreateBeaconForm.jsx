import { useState } from 'react';

/**
 * CreateBeaconForm — A stress-proof, high-contrast form designed for disaster areas.
 * Large, easy-to-hit "icon-first" buttons to quickly toggle type and urgency.
 *
 * Props:
 *   onSubmit(beaconData) — callback with { type, urgency, message }
 *   onClose() — callback to close/dismiss the form view
 */
export default function CreateBeaconForm({ onSubmit, onClose }) {
  const [type, setType] = useState('');
  const [urgency, setUrgency] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

          {/* 1. Beacon Type Grid (Icon-First) */}
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

          {/* 2. Urgency Selection */}
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

          {/* 3. Optional Message details */}
          <div className="beacon-form__section">
            <label htmlFor="beacon-message" className="beacon-form__label">3. MESSAGE DETAILS (OPTIONAL)</label>
            <textarea
              id="beacon-message"
              className="beacon-textarea"
              placeholder="Provide critical details (e.g. 'Water supply contaminated', 'Insulin needed for elderly patient', etc.)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
            />
          </div>

          {/* 4. Giant Broadcast Button */}
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
        </form>
      </div>
    </div>
  );
}
