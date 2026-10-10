const stroke = "stroke-foreground/90 stroke-[1.5]";

export function RynekIllustration() {
  return (
    <svg
      viewBox="0 0 296 140"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Ilustracja: kamienice przy Rynku"
    >
      <g className={stroke} strokeLinejoin="round">
        <rect x="14" y="70" width="46" height="70" className="fill-accent" />
        <path d="M14 70 37 40 60 70z" className="fill-accent" />
        <rect x="64" y="56" width="46" height="84" className="fill-white" />
        <path d="M64 56h46l-6-12h-8l-6-10-6 10h-8z" className="fill-white" />
        <rect
          x="114"
          y="22"
          width="40"
          height="118"
          className="fill-brand-tint"
        />
        <path d="M114 22h40l-20-20z" className="fill-brand" />
        <rect
          x="158"
          y="62"
          width="46"
          height="78"
          className="fill-accent-tint"
        />
        <path
          d="M158 62h46l-8-16h-8v-8h-14v8h-8z"
          className="fill-accent-tint"
        />
        <rect
          x="208"
          y="74"
          width="46"
          height="66"
          className="fill-brand-tint"
        />
        <path d="M208 74 231 46 254 74z" className="fill-brand-tint" />
        <rect x="258" y="86" width="30" height="54" className="fill-white" />
      </g>
      <g className="fill-foreground">
        <rect x="26" y="90" width="8" height="12" />
        <rect x="42" y="90" width="8" height="12" />
        <rect x="76" y="76" width="8" height="12" />
        <rect x="92" y="76" width="8" height="12" />
        <rect x="128" y="50" width="10" height="14" />
        <rect x="128" y="80" width="10" height="14" />
        <rect x="170" y="82" width="8" height="12" />
        <rect x="186" y="82" width="8" height="12" />
        <rect x="220" y="94" width="8" height="12" />
        <rect x="236" y="94" width="8" height="12" />
      </g>
    </svg>
  );
}

export function HalaIllustration() {
  return (
    <svg
      viewBox="0 0 296 140"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Ilustracja: Hala Stulecia"
    >
      <g className={stroke} strokeLinejoin="round">
        <rect
          x="20"
          y="104"
          width="256"
          height="36"
          className="fill-secondary"
        />
        <path
          d="M58 104C58 50 98 26 148 26s90 24 90 78z"
          className="fill-white"
        />
        <path
          d="M98 104C98 62 118 40 148 40s50 22 50 64z"
          className="fill-secondary"
        />
        <path d="M148 26V12M140 12h16" fill="none" />
        <path
          d="M48 104C48 80 60 70 74 66M248 104C248 80 236 70 222 66"
          fill="none"
        />
      </g>
      <g className={stroke} fill="none">
        <path d="M130 104V84a18 18 0 0 1 36 0v20" />
        <path d="M40 104V92a8 8 0 0 1 16 0v12M72 104V92a8 8 0 0 1 16 0v12M208 104V92a8 8 0 0 1 16 0v12M240 104V92a8 8 0 0 1 16 0v12" />
      </g>
    </svg>
  );
}

export function TumskiIllustration() {
  return (
    <svg
      viewBox="0 0 296 140"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Ilustracja: katedra na Ostrowie Tumskim"
    >
      <g className={stroke} strokeLinejoin="round">
        <rect x="0" y="112" width="296" height="28" className="fill-brand" />
        <rect x="70" y="70" width="156" height="44" className="fill-white" />
        <path d="M70 70 148 46 226 70z" className="fill-primary" />
        <rect x="84" y="36" width="34" height="78" className="fill-white" />
        <path d="M84 36h34l-17-30z" className="fill-primary" />
        <rect x="178" y="36" width="34" height="78" className="fill-white" />
        <path d="M178 36h34l-17-30z" className="fill-primary" />
      </g>
      <g className="fill-foreground">
        <rect x="94" y="52" width="14" height="22" rx="7" />
        <rect x="188" y="52" width="14" height="22" rx="7" />
        <rect x="138" y="92" width="20" height="22" rx="10" />
      </g>
      <path
        d="M10 124q14-8 28 0t28 0 28 0 28 0 28 0 28 0 28 0 28 0 28 0 28 0"
        fill="none"
        className="stroke-white stroke-2"
      />
    </svg>
  );
}
