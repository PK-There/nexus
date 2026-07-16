import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PrintableQRBeacon({ beaconData, onClose }) {
  // Serialize the data for the QR code
  const qrPayload = JSON.stringify(beaconData);
  
  // Format the date for display
  const timestamp = beaconData.timestamp ? new Date(beaconData.timestamp).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="qr-beacon-overlay">
      <div className="qr-beacon-container" id="printable-qr-card">
        {/* Screen-only header */}
        <header className="qr-beacon-header no-print">
          <h2>🖨️ Offline QR Beacon Card</h2>
          <button 
            type="button" 
            className="qr-beacon-close-btn" 
            onClick={onClose}
            aria-label="Close form"
          >
            ✕
          </button>
        </header>

        {/* Printable Card Area */}
        <div className="qr-card">
          <div className="qr-card-header">
            <h3>SIGNAL BEACON</h3>
            <span className={`qr-urgency badge-${beaconData.urgency?.toLowerCase()}`}>
              {beaconData.urgency?.toUpperCase()}
            </span>
          </div>

          <div className="qr-card-body">
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={qrPayload} 
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
            
            <div className="qr-details">
              <div className="qr-detail-row">
                <span className="qr-label">TYPE:</span>
                <span className="qr-value">{beaconData.type}</span>
              </div>
              <div className="qr-detail-row">
                <span className="qr-label">GENERATED:</span>
                <span className="qr-value">{timestamp}</span>
              </div>
              {beaconData.message && (
                <div className="qr-message-box">
                  <span className="qr-label">MESSAGE:</span>
                  <p>{beaconData.message}</p>
                </div>
              )}
            </div>
          </div>

          <div className="qr-card-footer">
            <p>Scan this QR code with the Signal app to inject beacon data into the mesh network.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="qr-actions no-print">
          <button 
            className="qr-print-btn"
            onClick={() => window.print()}
          >
            🖨️ Print Card
          </button>
          <button 
            className="qr-back-btn"
            onClick={onClose}
          >
            Back to Form
          </button>
        </div>
      </div>

      <style>{`
        .qr-beacon-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }
        
        .qr-beacon-container {
          background: var(--bg-surface, #1e1e1e);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .qr-beacon-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .qr-beacon-header h2 {
          margin: 0;
          font-size: 1.2rem;
          color: var(--text-main, #ffffff);
        }

        .qr-beacon-close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
        }

        .qr-card {
          padding: 30px;
          background: #ffffff;
          color: #000000;
          margin: 20px;
          border-radius: 8px;
          border: 2px dashed #ccc;
        }

        .qr-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }

        .qr-card-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .qr-urgency {
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 0.9rem;
          color: #fff;
        }

        .badge-critical { background: #ff4d6a; }
        .badge-high { background: #ff8800; }
        .badge-medium { background: #ffaa00; }
        .badge-low { background: #3b82f6; }

        .qr-card-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .qr-code-wrapper {
          padding: 10px;
          background: #fff;
          border: 1px solid #eee;
        }

        .qr-details {
          width: 100%;
        }

        .qr-detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 1rem;
        }

        .qr-label {
          font-weight: bold;
          color: #555;
        }

        .qr-value {
          font-weight: 600;
        }

        .qr-message-box {
          margin-top: 15px;
          padding: 10px;
          background: #f9f9f9;
          border-left: 4px solid #333;
        }

        .qr-message-box p {
          margin: 5px 0 0 0;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .qr-card-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 0.85rem;
          color: #666;
          border-top: 1px solid #eee;
          padding-top: 15px;
        }

        .qr-actions {
          padding: 15px 20px;
          display: flex;
          gap: 15px;
          background: rgba(0,0,0,0.2);
        }

        .qr-print-btn, .qr-back-btn {
          flex: 1;
          padding: 12px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          border: none;
        }

        .qr-print-btn {
          background: #3b82f6;
          color: white;
        }

        .qr-back-btn {
          background: transparent;
          border: 2px solid #555;
          color: white;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          
          #printable-qr-card, #printable-qr-card * {
            visibility: visible;
          }
          
          #printable-qr-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            box-shadow: none;
            background: white;
            border-radius: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .qr-beacon-overlay {
            position: static;
            background: none;
            padding: 0;
          }

          .qr-card {
            margin: 0;
            border: none;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
