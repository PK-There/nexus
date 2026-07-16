

import { useState, useEffect, useRef, useCallback } from 'react';
import { syncService } from '../syncService';

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function SyncModal({ onClose }) {

  const [tab, setTab] = useState('online');         // 'online' | 'offline'
  const [relayStatus, setRelayStatus] = useState('disconnected'); // connected | disconnected | error
  const [peerStatus, setPeerStatus] = useState('idle');  // idle | connecting | connected
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [logs, setLogs] = useState([]);

  const [offlineStep, setOfflineStep] = useState('choose'); // choose | offer-created | answer-created | connected
  const [localSignal, setLocalSignal] = useState('');
  const [remoteSignal, setRemoteSignal] = useState('');

  const logEndRef = useRef(null);

  const addLog = useCallback((msg, type = 'info') => {
    setLogs((prev) => [...prev.slice(-50), { msg, type, ts: Date.now() }]);
  }, []);

  useEffect(() => {

    setRelayStatus(syncService.isRelayConnected ? 'connected' : 'disconnected');
    setPeerStatus(syncService.isPeerConnected ? 'connected' : 'idle');

    syncService.onRelayStatus = (status) => {
      setRelayStatus(status);
    };

    syncService.onSyncLog = (msg, type) => {
      addLog(msg, type);
    };

    syncService.onPeerConnected = (peerId) => {
      setPeerStatus('connected');
      setOfflineStep('connected');
      addLog(`🟢 Connected to peer: ${peerId}`, 'success');

      setTimeout(() => {
        syncService.requestBeaconSync();
      }, 500);
    };

    syncService.onPeerDisconnected = () => {
      setPeerStatus('idle');
      addLog('Peer disconnected');
    };

    syncService.onRoomJoined = (code) => {
      setGeneratedCode(code);
      addLog(`Room ${code} ready — waiting for peer…`);
    };

    syncService.onRoomError = (error) => {
      addLog(`Room error: ${error}`, 'error');
    };

    syncService.onSignalGenerated = (signalJSON) => {
      setLocalSignal((prev) => {

        if (!prev) return signalJSON;
        return signalJSON; // Latest signal replaces (SDP offer/answer is the important one)
      });
    };

    syncService.connectRelay();

    return () => {

      syncService.onRelayStatus = null;
      syncService.onSyncLog = null;
      syncService.onPeerConnected = null;
      syncService.onPeerDisconnected = null;
      syncService.onRoomJoined = null;
      syncService.onRoomError = null;
      syncService.onSignalGenerated = null;
    };
  }, [addLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  function handleCreateRoom() {
    const code = randomCode();
    setRoomCode(code);
    setPeerStatus('connecting');
    syncService.createRoom(code);
  }

  function handleJoinRoom() {
    if (roomCode.length !== 4) return;
    setPeerStatus('connecting');
    syncService.joinRoom(roomCode);
  }

  function handleCreateOffer() {
    setOfflineStep('offer-created');
    setLocalSignal('');
    syncService.createOfflineOffer();
  }

  function handleAcceptOffer() {
    if (!remoteSignal.trim()) return;
    setOfflineStep('answer-created');
    setLocalSignal('');
    syncService.acceptOfflineOffer(remoteSignal.trim());
  }

  function handleAcceptAnswer() {
    if (!remoteSignal.trim()) return;
    syncService.acceptOfflineAnswer(remoteSignal.trim());
  }

  function handleManualSync() {
    syncService.requestBeaconSync();
    addLog('Manual P2P sync triggered');
  }

  function handleRelaySync() {
    syncService.pushAndPullRelay();
    addLog('🌐 Syncing via relay server…', 'info');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      addLog('Copied to clipboard', 'success');
    } catch {
      addLog('Clipboard copy failed — select & copy manually', 'error');
    }
  }

  const relayDot = relayStatus === 'connected' ? '🟢'
    : relayStatus === 'error' ? '🔴' : '🟡';
  const relayText = relayStatus === 'connected' ? 'Relay Online'
    : relayStatus === 'error' ? 'Relay Error' : 'Relay Offline';

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sync-modal">
        {}
        <div className="form-header">
          <h2>Mesh Sync</h2>
          <div className="sync-header-right">
            <span className="sync-relay-badge">
              {relayDot} {relayText}
            </span>
            <button type="button" className="form-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {}
        <div className="sync-tabs">
          <button
            className={`sync-tab ${tab === 'online' ? 'active' : ''}`}
            onClick={() => setTab('online')}
          >
            🌐 Room Code
          </button>
          <button
            className={`sync-tab ${tab === 'offline' ? 'active' : ''}`}
            onClick={() => setTab('offline')}
          >
            📴 Offline
          </button>
        </div>

        {}
        {tab === 'online' && (
          <div className="sync-tab-content">
            {}
            <div className="relay-sync-section">
              <p className="sync-desc">
                Both devices must be on the same network. Click <strong>Sync via Relay</strong> on each device to exchange all beacons instantly.
              </p>
              <button
                className={`sync-action-btn primary ${relayStatus !== 'connected' ? 'disabled' : ''}`}
                onClick={handleRelaySync}
                disabled={relayStatus !== 'connected'}
              >
                🌐 Sync via Relay {relayStatus !== 'connected' ? '(Offline)' : ''}
              </button>
            </div>

            <div className="sync-divider"><span>or use P2P room code</span></div>

            {peerStatus === 'connected' ? (
              <div className="sync-connected-card">
                <div className="sync-connected-icon">🔗</div>
                <p className="sync-connected-text">P2P Channel Active</p>
                <button className="sync-action-btn" onClick={handleManualSync}>
                  🔄 Sync Beacons Now
                </button>
              </div>
            ) : (
              <div className="sync-room-section">
                <button className="sync-action-btn primary" onClick={handleCreateRoom}>
                  ✨ Create Room
                </button>

                {generatedCode && (
                  <div className="sync-code-display">
                    <span className="sync-code-label">Your Room Code</span>
                    <span className="sync-code-value">{generatedCode}</span>
                    <span className="sync-code-hint">Share this with the other device</span>
                  </div>
                )}

                <div className="sync-divider">
                  <span>or join existing</span>
                </div>

                <div className="sync-join-row">
                  <input
                    type="text"
                    className="sync-code-input"
                    placeholder="Enter 4-digit code"
                    maxLength={4}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                  <button
                    className="sync-action-btn"
                    onClick={handleJoinRoom}
                    disabled={roomCode.length !== 4}
                  >
                    Join
                  </button>
                </div>

                {peerStatus === 'connecting' && (
                  <p className="sync-waiting">⏳ Waiting for peer to join…</p>
                )}
              </div>
            )}
          </div>
        )}

        {}
        {tab === 'offline' && (
          <div className="sync-tab-content">
            <p className="sync-desc">
              No internet? Exchange connection data manually (copy → paste on other device).
            </p>

            {peerStatus === 'connected' ? (
              <div className="sync-connected-card">
                <div className="sync-connected-icon">🔗</div>
                <p className="sync-connected-text">P2P Channel Active</p>
                <button className="sync-action-btn" onClick={handleManualSync}>
                  🔄 Sync Beacons Now
                </button>
              </div>
            ) : offlineStep === 'choose' ? (
              <div className="sync-offline-choose">
                <button className="sync-action-btn primary" onClick={handleCreateOffer}>
                  📤 I'll start (Create Offer)
                </button>
                <button className="sync-action-btn" onClick={() => setOfflineStep('answer-created')}>
                  📥 I have an offer to accept
                </button>
              </div>
            ) : offlineStep === 'offer-created' ? (
              <div className="sync-offline-step">
                <div className="sync-step-label">Step 1: Copy this offer → send to other device</div>
                <div className="sync-signal-box">
                  <textarea
                    className="sync-signal-textarea"
                    readOnly
                    value={localSignal}
                    placeholder="Generating offer…"
                  />
                  <button
                    className="sync-copy-btn"
                    onClick={() => copyToClipboard(localSignal)}
                    disabled={!localSignal}
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="sync-step-label">Step 2: Paste the answer from other device</div>
                <div className="sync-signal-box">
                  <textarea
                    className="sync-signal-textarea"
                    placeholder="Paste answer JSON here…"
                    value={remoteSignal}
                    onChange={(e) => setRemoteSignal(e.target.value)}
                  />
                  <button
                    className="sync-action-btn"
                    onClick={handleAcceptAnswer}
                    disabled={!remoteSignal.trim()}
                  >
                    ✅ Connect
                  </button>
                </div>
              </div>
            ) : offlineStep === 'answer-created' ? (
              <div className="sync-offline-step">
                <div className="sync-step-label">Step 1: Paste the offer from other device</div>
                <div className="sync-signal-box">
                  <textarea
                    className="sync-signal-textarea"
                    placeholder="Paste offer JSON here…"
                    value={remoteSignal}
                    onChange={(e) => setRemoteSignal(e.target.value)}
                  />
                  <button
                    className="sync-action-btn"
                    onClick={handleAcceptOffer}
                    disabled={!remoteSignal.trim()}
                  >
                    Accept Offer
                  </button>
                </div>

                {localSignal && (
                  <>
                    <div className="sync-step-label">Step 2: Copy this answer → send back</div>
                    <div className="sync-signal-box">
                      <textarea
                        className="sync-signal-textarea"
                        readOnly
                        value={localSignal}
                      />
                      <button
                        className="sync-copy-btn"
                        onClick={() => copyToClipboard(localSignal)}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}

        {}
        <div className="sync-log">
          <div className="sync-log-header">Event Log</div>
          <div className="sync-log-body">
            {logs.length === 0 && (
              <div className="sync-log-empty">No events yet</div>
            )}
            {logs.map((l, i) => (
              <div key={i} className={`sync-log-line log-${l.type}`}>
                <span className="sync-log-ts">
                  {new Date(l.ts).toLocaleTimeString()}
                </span>
                {l.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
