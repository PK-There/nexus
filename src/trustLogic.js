

export function calculateTrustScore(targetKey, myKey, allEdges) {
  if (!targetKey || !myKey) return 0;
  if (targetKey === myKey) return 100; // Self

  const graph = {};
  for (const edge of allEdges) {
    if (!graph[edge.fromKey]) graph[edge.fromKey] = new Set();
    graph[edge.fromKey].add(edge.toKey);
  }

  if (graph[myKey] && graph[myKey].has(targetKey)) {
    return 80;
  }

  if (graph[myKey]) {
    for (const friendKey of graph[myKey]) {
      if (graph[friendKey] && graph[friendKey].has(targetKey)) {
        return 40;
      }
    }
  }

  return 0;
}
