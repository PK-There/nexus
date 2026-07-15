import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { db } from '../db';
import { createTrustEdge } from '../crypto';
import { useLiveQuery } from 'dexie-react-hooks';

export default function TrustGraph() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [myKey, setMyKey] = useState(null);

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
  
  // Transform edges into node and link format for force graph
  const nodesMap = new Map();
  const links = [];

  // Always add ourselves
  if (myKey && !nodesMap.has(myKey)) {
    nodesMap.set(myKey, { id: myKey, label: 'Me', val: 2 });
  }

  edges.forEach(edge => {
    if (!nodesMap.has(edge.fromKey)) nodesMap.set(edge.fromKey, { id: edge.fromKey, label: edge.fromKey.slice(0, 8), val: 1 });
    if (!nodesMap.has(edge.toKey)) nodesMap.set(edge.toKey, { id: edge.toKey, label: edge.toKey.slice(0, 8), val: 1 });
    links.push({ source: edge.fromKey, target: edge.toKey });
  });

  const graphData = {
    nodes: Array.from(nodesMap.values()),
    links
  };

  const handleVouchPrompt = async () => {
    const keyToVouch = prompt('Enter the Public Key of the device you want to vouch for:');
    if (!keyToVouch) return;
    if (keyToVouch === myKey) {
      alert("You cannot vouch for yourself.");
      return;
    }
    
    try {
      await createTrustEdge(keyToVouch);
      alert('Vouch successful!');
    } catch (err) {
      console.error(err);
      alert('Failed to create trust edge: ' + err.message);
    }
  };

  return (
    <div className="trust-graph-view">
      <div className="trust-graph-controls">
        <button onClick={handleVouchPrompt} className="vouch-btn">🤝 Vouch for Peer</button>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 120px)' }}>
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
