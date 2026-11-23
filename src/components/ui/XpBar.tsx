export function XpBar({
  level,
  xp,
  xpToNextLevel,
}: {
  level: number;
  xp: number;
  xpToNextLevel: number;
}) {
  const percent = xpToNextLevel > 0 ? Math.min(100, (xp / xpToNextLevel) * 100) : 100;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-display text-gold-300">Level {level}</span>
        <span className="text-muted tabular-nums">
          {xp} / {xpToNextLevel} XP
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Level ${level} progress`}
        aria-valuemin={0}
        aria-valuemax={xpToNextLevel}
        aria-valuenow={xp}
        className="h-2 overflow-hidden rounded-full bg-ink-700"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300 transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
