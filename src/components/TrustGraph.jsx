import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { db } from '../db';
import { createTrustEdge } from '../crypto';
import { useLiveQuery } from 'dexie-react-hooks';

export default function TrustGraph() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [myKey, setMyKey] = useState(null);
  const [vouchKey, setVouchKey] = useState('');
  const [vouchStatus, setVouchStatus] = useState('');
  const [showVouchForm, setShowVouchForm] = useState(false);

  useEffect(() => {
    db.device.get('me').then(device => {
      if (device) setMyKey(device.publicKey);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries.length > 0) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const edges = useLiveQuery(() => db.trustEdges.toArray(), []) || [];

  const nodesMap = new Map();
  const links = [];

  const formatKey = (k) => {
    if (!k) return 'Unknown';
    const str = typeof k === 'object' ? JSON.stringify(k) : String(k);
    return str.slice(0, 8);
  };

  if (myKey && !nodesMap.has(myKey)) {
    nodesMap.set(myKey, { id: myKey, label: 'Me', val: 2 });
  }

  edges.forEach(edge => {
    if (!nodesMap.has(edge.fromKey)) nodesMap.set(edge.fromKey, { id: edge.fromKey, label: formatKey(edge.fromKey), val: 1 });
    if (!nodesMap.has(edge.toKey)) nodesMap.set(edge.toKey, { id: edge.toKey, label: formatKey(edge.toKey), val: 1 });
    links.push({ source: edge.fromKey, target: edge.toKey });
  });

  const graphData = {
    nodes: Array.from(nodesMap.values()),
    links
  };

  const handleVouch = async () => {
    if (!vouchKey.trim()) return;
    if (vouchKey.trim() === JSON.stringify(myKey)) {
      setVouchStatus('❌ Cannot vouch for yourself.');
      return;
    }
    setVouchStatus('Signing trust edge…');
    try {
      let parsedKey = vouchKey.trim();
      try { parsedKey = JSON.parse(parsedKey); } catch {  }
      await createTrustEdge(parsedKey);
      setVouchStatus('✅ Vouched successfully!');
      setVouchKey('');
      setTimeout(() => { setVouchStatus(''); setShowVouchForm(false); }, 2000);
    } catch (err) {
      console.error(err);
      setVouchStatus(`❌ Failed: ${err.message}`);
    }
  };

  const myKeyStr = myKey ? (typeof myKey === 'object' ? JSON.stringify(myKey) : myKey) : '';

  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopy = async () => {
    if (!myKeyStr) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(myKeyStr);
      } else {

        const textArea = document.createElement('textarea');
        textArea.value = myKeyStr;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyFeedback('✅ Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      setCopyFeedback('❌ Copy failed (try manually)');
    }
  };

  return (
    <div className="trust-graph-view">
      <div className="trust-graph-controls">
        {}
        <div className="my-key-box">
          <span className="my-key-label">📋 Your Public Key (share with peers):</span>
          <div className="my-key-value" style={{ userSelect: 'all' }}>{myKeyStr ? myKeyStr.slice(0, 60) + '…' : 'Loading…'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="vouch-btn"
              onClick={handleCopy}
            >
              📋 Copy My Key
            </button>
            {copyFeedback && <span style={{ fontSize: '0.8rem', color: '#00d68f' }}>{copyFeedback}</span>}
          </div>
        </div>

        {}
        {showVouchForm ? (
          <div className="vouch-form">
            <textarea
              className="vouch-input"
              placeholder="Paste the other device's public key here…"
              value={vouchKey}
              onChange={e => setVouchKey(e.target.value)}
              rows={3}
            />
            {vouchStatus && <p className="vouch-status">{vouchStatus}</p>}
            <div className="vouch-form-actions">
              <button className="vouch-btn primary" onClick={handleVouch} disabled={!vouchKey.trim()}>
                🤝 Vouch
              </button>
              <button className="vouch-btn" onClick={() => { setShowVouchForm(false); setVouchStatus(''); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowVouchForm(true)} className="vouch-btn primary">
            🤝 Vouch for Peer
          </button>
        )}
      </div>

      <div ref={containerRef} style={{ width: '100%', flex: 1 }}>
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="label"
          nodeColor={node => node.id === myKey ? '#ff4d6a' : '#00d68f'}
          linkColor={() => '#3b82f6'}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          backgroundColor="#0a0e1a"
        />
      </div>
    </div>
  );
}
