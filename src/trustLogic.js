/**
 * trustLogic.js
 * Calculates simple Web of Trust scores based on trust edges.
 */

export function calculateTrustScore(targetKey, myKey, allEdges) {
  if (!targetKey || !myKey) return 0;
  if (targetKey === myKey) return 100; // Self

  // Build a directed graph from all edges
  const graph = {};
  for (const edge of allEdges) {
    if (!graph[edge.fromKey]) graph[edge.fromKey] = new Set();
    graph[edge.fromKey].add(edge.toKey);
  }

  // 1-hop: I vouched for them directly
  if (graph[myKey] && graph[myKey].has(targetKey)) {
    return 80;
  }

  // 2-hop: Someone I trust vouched for them
  if (graph[myKey]) {
    for (const friendKey of graph[myKey]) {
      if (graph[friendKey] && graph[friendKey].has(targetKey)) {
        return 40;
      }
    }
  }

  // No trust path found
  return 0;
}
