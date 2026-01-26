'use client';

interface LogoProps {
  variant?: 'dark' | 'white';
  className?: string;
}

export default function Logo({ variant = 'dark', className = '' }: LogoProps) {
  const primaryColor = variant === 'dark' ? '#1a1a2e' : '#ffffff';
  const secondaryColor = variant === 'dark' ? '#ffffff' : '#1a1a2e';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cloud base */}
        <path
          d="M8 32C4 32 1 29 1 25C1 21.5 3.5 18.5 7 18C7 17.7 7 17.3 7 17C7 11 12 6 18 6C22.5 6 26.5 8.8 28 13C29 12.5 30 12 31.5 12C36 12 39.5 15.5 39.5 20C39.5 20.3 39.5 20.7 39.4 21"
          stroke={primaryColor}
          strokeWidth="2"
          fill={primaryColor}
        />

        {/* Pixel squares */}
        <rect x="36" y="5" width="4" height="4" fill={primaryColor} />
        <rect x="42" y="8" width="3" height="3" fill={primaryColor} />
        <rect x="39" y="2" width="3" height="3" fill={primaryColor} />
        <rect x="45" y="4" width="2" height="2" fill={primaryColor} />
        <rect x="38" y="12" width="2" height="2" fill={primaryColor} />

        {/* Large Gear */}
        <circle cx="20" cy="28" r="11" fill={primaryColor} />
        <circle cx="20" cy="28" r="4" fill={secondaryColor} />
        {/* Gear teeth - large */}
        <rect x="18" y="14" width="4" height="5" fill={primaryColor} />
        <rect x="18" y="37" width="4" height="5" fill={primaryColor} />
        <rect x="6" y="26" width="5" height="4" fill={primaryColor} />
        <rect x="29" y="26" width="5" height="4" fill={primaryColor} />
        <rect x="9" y="18" width="4" height="4" fill={primaryColor} />
        <rect x="27" y="34" width="4" height="4" fill={primaryColor} />
        <rect x="27" y="18" width="4" height="4" fill={primaryColor} />
        <rect x="9" y="34" width="4" height="4" fill={primaryColor} />

        {/* Small Gear */}
        <circle cx="34" cy="38" r="8" fill={primaryColor} />
        <circle cx="34" cy="38" r="3" fill={secondaryColor} />
        {/* Gear teeth - small */}
        <rect x="32" y="28" width="3" height="4" fill={primaryColor} />
        <rect x="32" y="44" width="3" height="4" fill={primaryColor} />
        <rect x="24" y="36" width="4" height="3" fill={primaryColor} />
        <rect x="40" y="36" width="4" height="3" fill={primaryColor} />
      </svg>

      {/* Text */}
      <span
        className="font-bold text-xl tracking-tight whitespace-nowrap"
        style={{ color: primaryColor }}
      >
        ToolTime <span className="font-normal">Pro</span>
      </span>
    </div>
  );
}
