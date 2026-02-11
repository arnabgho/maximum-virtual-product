import { useCurrentFrame, interpolate } from "remotion";

interface TransitionEffectsProps {
  startFrame: number;
  duration: number;
}

export function TransitionEffects({ startFrame, duration }: TransitionEffectsProps) {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0 || relativeFrame >= duration) return null;

  const progress = interpolate(relativeFrame, [0, duration], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 100,
        background: `rgba(15, 15, 26, ${interpolate(progress, [0, 0.5, 1], [0, 0.8, 0])})`,
      }}
    />
  );
}
