import { Composition } from "remotion";
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
}

export interface VideoProps {
  artifacts: ArtifactData[];
  projectTitle: string;
  narrative: string;
}

const SLIDE_DURATION = 150; // 5 seconds at 30fps
const TRANSITION_DURATION = 15; // 0.5 seconds

function ResearchVideoComposition({ artifacts, projectTitle, narrative }: VideoProps) {
  const totalFrames = artifacts.length * SLIDE_DURATION + SLIDE_DURATION; // Extra for title

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

      {/* Artifact slides */}
      {artifacts.map((artifact, index) => {
        const startFrame = (index + 1) * SLIDE_DURATION;
        return (
          <div key={artifact.id}>
            <TransitionEffects
              startFrame={startFrame - TRANSITION_DURATION}
              duration={TRANSITION_DURATION}
            />
            <ArtifactSlide
              title={artifact.title}
              content={artifact.summary || artifact.content}
              type={artifact.type}
              sourceUrl={artifact.source_url}
              groupTitle={artifact.group_title}
              importance={artifact.importance}
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
        }}
      />
    </>
  );
}
