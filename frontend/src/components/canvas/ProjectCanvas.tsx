import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./reactflow.css";

import { ArtifactNode } from "./nodes/ArtifactNode";
import { GroupNode } from "./nodes/GroupNode";
import { ConnectionEdge } from "./edges/ConnectionEdge";
import { useProjectStore } from "../../stores/projectStore";
import { buildNodes, buildEdges } from "./utils/flowTransforms";

const nodeTypes: NodeTypes = {
  artifact: ArtifactNode,
  group: GroupNode,
};

const edgeTypes: EdgeTypes = {
  connection: ConnectionEdge,
};

function ProjectCanvasInner() {
  const { project, artifacts, groups, connections } = useProjectStore();
  const setSelectedArtifact = useProjectStore((s) => s.setSelectedArtifact);
  const updateArtifactPosition = useProjectStore(
    (s) => s.updateArtifactPosition
  );

  const phaseArtifacts = useMemo(
    () => artifacts.filter((a) => a.phase === project?.phase),
    [artifacts, project?.phase]
  );
  const phaseGroups = useMemo(
    () => groups.filter((g) => g.phase === project?.phase),
    [groups, project?.phase]
  );
  const phaseConnections = useMemo(
    () =>
      connections.filter((c) => {
        const ids = new Set(phaseArtifacts.map((a) => a.id));
        return ids.has(c.from_artifact_id) && ids.has(c.to_artifact_id);
      }),
    [connections, phaseArtifacts]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  // Track previous artifact count to detect new arrivals for fitView
  const prevCountRef = useRef(0);

  // Sync store → React Flow nodes
  useEffect(() => {
    setNodes(buildNodes(phaseArtifacts, phaseGroups, phaseConnections));
  }, [phaseArtifacts, phaseGroups, phaseConnections, setNodes]);

  // Sync store → React Flow edges
  useEffect(() => {
    setEdges(buildEdges(phaseConnections, phaseArtifacts));
  }, [phaseConnections, phaseArtifacts, setEdges]);

  // fitView when new artifacts arrive
  useEffect(() => {
    const count = phaseArtifacts.length;
    if (count > 0 && count !== prevCountRef.current) {
      prevCountRef.current = count;
      // Small delay to let nodes render before fitting
      const t = setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50);
      return () => clearTimeout(t);
    }
  }, [phaseArtifacts.length, fitView]);

  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "artifact") {
        const artifactId = node.id.replace("artifact_", "");
        updateArtifactPosition(artifactId, node.position.x, node.position.y);
      }
    },
    [updateArtifactPosition]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "artifact") {
        const artifactId = node.id.replace("artifact_", "");
        setSelectedArtifact(artifactId);
      }
    },
    [setSelectedArtifact]
  );

  const onPaneClick = useCallback(() => {
    setSelectedArtifact(null);
  }, [setSelectedArtifact]);

  return (
    <div className="w-full h-full" style={{ background: "#0f0f1a" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function ProjectCanvas() {
  return (
    <ReactFlowProvider>
      <ProjectCanvasInner />
    </ReactFlowProvider>
  );
}
