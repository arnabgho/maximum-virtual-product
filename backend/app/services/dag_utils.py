"""DAG utilities: cycle detection and topological sort."""

from collections import defaultdict, deque


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
