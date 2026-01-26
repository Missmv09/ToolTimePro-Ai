'use client';

interface LogoProps {
  variant?: 'dark' | 'white';
  className?: string;
}

export default function Logo({ variant = 'dark', className = '' }: LogoProps) {
  const primaryColor = variant === 'dark' ? '#1a1a2e' : '#ffffff';
  const gearColor = variant === 'dark' ? '#ffffff' : '#1a1a2e';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Cloud with Gears Inside */}
      <svg
        width="44"
        height="40"
        viewBox="0 0 88 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cloud shape */}
        <path
          d="M20 68C10 68 2 60 2 50C2 41 8 33 17 31C17 30 17 29 17 28C17 15 28 4 42 4C53 4 62 11 66 22C68 21 71 20 74 20C84 20 92 28 92 38C92 48 84 56 74 56H20Z"
          fill={primaryColor}
        />

        {/* Pixel squares */}
        <rect x="70" y="2" width="6" height="6" rx="1" fill={primaryColor} />
        <rect x="79" y="7" width="5" height="5" rx="1" fill={primaryColor} />
        <rect x="75" y="0" width="4" height="4" rx="1" fill={primaryColor} />
        <rect x="83" y="3" width="3" height="3" rx="1" fill={primaryColor} />
        <rect x="72" y="11" width="4" height="4" rx="1" fill={primaryColor} />

        {/* Large Gear */}
        <path
          d="M36 26h6v4h-6zM36 46h6v4h-6zM22 36v6h-4v-6zM54 36v6h4v-6zM27 28l4 4-3 3-4-4zM47 45l4 4-3 3-4-4zM47 28l-4 4 3 3 4-4zM27 45l-4 4 3 3 4-4z"
          fill={gearColor}
        />
        <circle cx="39" cy="39" r="12" fill={gearColor} />
        <circle cx="39" cy="39" r="5" fill={primaryColor} />

        {/* Small Gear */}
        <path
          d="M58 38h4v3h-4zM58 51h4v3h-4zM51 44v4h-3v-4zM68 44v4h3v-4zM53 40l3 2-2 2-3-2zM63 50l3 2-2 2-3-2zM63 40l-3 2 2 2 3-2zM53 50l-3 2 2 2 3-2z"
          fill={gearColor}
        />
        <circle cx="60" cy="47" r="8" fill={gearColor} />
        <circle cx="60" cy="47" r="3.5" fill={primaryColor} />
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
