"""DAG utilities: cycle detection and topological sort."""

import logging
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


def remove_cycles(connections_data: list[dict], artifact_ids: set[str]) -> list[dict]:
    """Remove back-edges to enforce DAG constraint using DFS."""
    adj: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for i, c in enumerate(connections_data):
        src, dst = c.get("from_id", ""), c.get("to_id", "")
        if src in artifact_ids and dst in artifact_ids:
            adj[src].append((dst, i))

    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {aid: WHITE for aid in artifact_ids}
    back_edges: set[int] = set()

    def dfs(node: str) -> None:
        color[node] = GRAY
        for neighbor, edge_idx in adj[node]:
            if color[neighbor] == GRAY:
                back_edges.add(edge_idx)
                logger.warning("Cycle detected: removing edge %s → %s", node, neighbor)
            elif color[neighbor] == WHITE:
                dfs(neighbor)
        color[node] = BLACK

    for aid in artifact_ids:
        if color[aid] == WHITE:
            dfs(aid)

    return [c for i, c in enumerate(connections_data) if i not in back_edges]


def topological_sort_layers(
    artifact_ids: list[str], connections: list[dict]
) -> list[list[str]]:
    """Kahn's algorithm — returns layers of artifact IDs in topological order.

    Each inner list is a set of artifacts that can appear at the same depth.
    connections: list of dicts with "from_id" and "to_id" keys.
    """
    id_set = set(artifact_ids)
    adj: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = {aid: 0 for aid in id_set}

    for c in connections:
        src, dst = c["from_id"], c["to_id"]
        if src in id_set and dst in id_set:
            adj[src].append(dst)
            in_degree[dst] = in_degree.get(dst, 0) + 1

    queue = deque(aid for aid in artifact_ids if in_degree[aid] == 0)
    layers: list[list[str]] = []

    while queue:
        layer = list(queue)
        layers.append(layer)
        next_queue: deque[str] = deque()
        for node in layer:
            for neighbor in adj[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    next_queue.append(neighbor)
        queue = next_queue

    # Any remaining nodes with in_degree > 0 are in cycles — append them as final layer
    remaining = [aid for aid in artifact_ids if in_degree[aid] > 0]
    if remaining:
        layers.append(remaining)

    return layers
