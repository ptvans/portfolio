// The live mic level shown while dictating into a Stella composer. Bars follow
// the measured loudness; when the meter stream isn't available (see
// useSpeechRecognition's `meterLive`) they pulse in place instead.
export function VoiceLevelMeter({ level, live, barClassName }: { level: number; live: boolean; barClassName: string }) {
  const shape = [0.45, 0.7, 1, 0.8, 0.55, 0.9, 0.65, 1, 0.75, 0.5, 0.85, 0.6];
  return (
    <div className="flex h-9 min-w-0 flex-1 items-center justify-center gap-[3px]" aria-hidden>
      {shape.map((w, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${barClassName} ${live ? "" : "animate-pulse"}`}
          style={{
            height: `${Math.round(4 + (live ? level : 0.25) * w * 24)}px`,
            animationDelay: live ? undefined : `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}
