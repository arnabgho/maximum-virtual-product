import { Composition, CalculateMetadataFunction } from "remotion";
import { ArtifactSlide } from "./ArtifactSlide";
import { TransitionEffects } from "./TransitionEffects";

interface ArtifactData {
  id: string;
  title: string;
  content: string;
  summary: string;
  type: string;
  source_url?: string;
  importance: number;
  group_title?: string;
  image_url?: string | null;
  breadcrumbs?: string[];
}

interface ConnectionData {
  from_id: string;
  to_id: string;
}

export interface VideoProps {
  artifacts: ArtifactData[];
  projectTitle: string;
  narrative: string;
  connections?: ConnectionData[];
}

const SLIDE_DURATION = 150; // 5 seconds at 30fps
const TRANSITION_DURATION = 15; // 0.5 seconds

const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => {
  const totalFrames = (props.artifacts.length + 1) * SLIDE_DURATION;
  return {
    durationInFrames: totalFrames,
    fps: 30,
    width: 1920,
    height: 1080,
  };
};

function ResearchVideoComposition({ artifacts, projectTitle, narrative, connections = [] }: VideoProps) {
  // Build parent title map from connections for breadcrumbs
  const titleMap = new Map(artifacts.map((a) => [a.id, a.title]));
  const parentMap = new Map<string, string[]>();
  for (const c of connections) {
    const parents = parentMap.get(c.to_id) || [];
    const parentTitle = titleMap.get(c.from_id);
    if (parentTitle) parents.push(parentTitle);
    parentMap.set(c.to_id, parents);
  }

  return (
    <>
      {/* Title slide */}
      <ArtifactSlide
        title={projectTitle}
        content={narrative}
        type="title"
        startFrame={0}
        duration={SLIDE_DURATION}
      />

      {/* Artifact slides in topological (DAG) order */}
      {artifacts.map((artifact, index) => {
        const startFrame = (index + 1) * SLIDE_DURATION;
        const breadcrumbs = artifact.breadcrumbs ?? parentMap.get(artifact.id) ?? [];
        return (
          <div key={artifact.id}>
            <TransitionEffects
              startFrame={startFrame - TRANSITION_DURATION}
              duration={TRANSITION_DURATION}
            />
            <ArtifactSlide
              title={artifact.title}
              content={artifact.content}
              summary={artifact.summary}
              type={artifact.type}
              sourceUrl={artifact.source_url}
              groupTitle={artifact.group_title}
              importance={artifact.importance}
              imageUrl={artifact.image_url}
              breadcrumbs={breadcrumbs}
              startFrame={startFrame}
              duration={SLIDE_DURATION}
            />
          </div>
        );
      })}
    </>
  );
}

export function ResearchVideo() {
  return (
    <>
      <Composition
        id="ResearchVideo"
        component={ResearchVideoComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          artifacts: [
            {
              id: "art_demo",
              title: "Sample Finding",
              content: "This is a sample research finding for preview.",
              summary: "A sample finding",
              type: "research_finding",
              importance: 80,
            },
          ],
          projectTitle: "Research Overview",
          narrative: "This video summarizes the key research findings.",
          connections: [],
        }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
}
