'use client';

interface LogoProps {
  variant?: 'dark' | 'white';
  className?: string;
}

export default function Logo({ variant = 'dark', className = '' }: LogoProps) {
  const primaryColor = variant === 'dark' ? '#1a1a2e' : '#ffffff';
  const holeColor = variant === 'dark' ? '#ffffff' : '#1a1a2e';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Cloud with Gears Inside */}
      <svg
        width="44"
        height="44"
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cloud shape containing gears */}
        <path
          d="M12 45C6 45 2 40 2 35C2 30 5 26 10 25C10 24 10 23 10 22C10 14 16 8 24 8C30 8 35 12 37 18C38.5 17 40.5 16 43 16C50 16 55 21 55 28C55 35 50 40 43 40H12Z"
          fill={primaryColor}
        />

        {/* Pixel squares (digital effect) - top right */}
        <rect x="46" y="6" width="5" height="5" fill={primaryColor} />
        <rect x="53" y="10" width="4" height="4" fill={primaryColor} />
        <rect x="50" y="2" width="3" height="3" fill={primaryColor} />
        <rect x="56" y="5" width="2" height="2" fill={primaryColor} />
        <rect x="48" y="13" width="3" height="3" fill={primaryColor} />

        {/* Large Gear - inside cloud */}
        <circle cx="24" cy="30" r="12" fill={primaryColor} />
        <circle cx="24" cy="30" r="5" fill={holeColor} />
        {/* Large gear teeth */}
        <rect x="22" y="15" width="4" height="5" fill={primaryColor} />
        <rect x="22" y="40" width="4" height="5" fill={primaryColor} />
        <rect x="9" y="28" width="5" height="4" fill={primaryColor} />
        <rect x="34" y="28" width="5" height="4" fill={primaryColor} />
        <rect x="12" y="19" width="4" height="4" fill={primaryColor} />
        <rect x="32" y="37" width="4" height="4" fill={primaryColor} />
        <rect x="32" y="19" width="4" height="4" fill={primaryColor} />
        <rect x="12" y="37" width="4" height="4" fill={primaryColor} />

        {/* Small Gear - inside cloud, interlocking */}
        <circle cx="40" cy="36" r="8" fill={primaryColor} />
        <circle cx="40" cy="36" r="3.5" fill={holeColor} />
        {/* Small gear teeth */}
        <rect x="38" y="26" width="3" height="4" fill={primaryColor} />
        <rect x="38" y="44" width="3" height="4" fill={primaryColor} />
        <rect x="30" y="34" width="4" height="3" fill={primaryColor} />
        <rect x="46" y="34" width="4" height="3" fill={primaryColor} />
      </svg>

      {/* Text */}
      <span
        className="text-xl tracking-tight whitespace-nowrap"
        style={{ color: primaryColor }}
      >
        <span className="font-bold">ToolTime</span> <span className="font-normal">Pro</span>
      </span>
    </div>
  );
}
