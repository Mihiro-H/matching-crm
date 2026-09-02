/**
 * Orbit ロゴ (DESIGN_TOKENS.md「ロゴ」セクション参照)
 * マーク: 円形・primary-500背景、白いリング + リング上のaccent-400のドット
 * ワードマーク: "Orbit" Inter Medium, primary-600
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Orbit"
    >
      <circle cx="16" cy="16" r="16" className="fill-primary-500" />
      <circle
        cx="16"
        cy="16"
        r="9"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="25" cy="16" r="2.5" className="fill-accent-400" />
    </svg>
  );
}

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark />
      {withWordmark && (
        <span className="text-lg font-medium text-primary-600">Orbit</span>
      )}
    </div>
  );
}
