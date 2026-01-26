'use client';

interface LogoProps {
  variant?: 'dark' | 'white';
  className?: string;
  showText?: boolean;
}

export default function Logo({ variant = 'dark', className = '', showText = true }: LogoProps) {
  const color = variant === 'dark' ? '#1a1a2e' : '#ffffff';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon - Cloud with Gears */}
      <svg
        width="42"
        height="42"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cloud shape */}
        <path
          d="M75 85H25C11.2 85 0 73.8 0 60C0 48.5 8 38.8 19 36C19 35.3 19 34.7 19 34C19 19.1 31.1 7 46 7C57.5 7 67.3 14.3 71 24.5C73.5 23.5 76.2 23 79 23C91.7 23 102 33.3 102 46C102 47.4 101.9 48.7 101.6 50"
          fill={color}
        />

        {/* Pixel squares (digital effect) */}
        <rect x="78" y="12" width="8" height="8" fill={color} />
        <rect x="89" y="18" width="6" height="6" fill={color} />
        <rect x="85" y="6" width="5" height="5" fill={color} />
        <rect x="95" y="10" width="4" height="4" fill={color} />
        <rect x="82" y="26" width="4" height="4" fill={color} />

        {/* Large Gear */}
        <circle cx="45" cy="52" r="18" fill={color} />
        <circle cx="45" cy="52" r="7" fill={variant === 'dark' ? '#ffffff' : '#1a1a2e'} />
        {/* Gear teeth */}
        <rect x="42" y="30" width="6" height="8" rx="1" fill={color} />
        <rect x="42" y="66" width="6" height="8" rx="1" fill={color} />
        <rect x="23" y="49" width="8" height="6" rx="1" fill={color} />
        <rect x="59" y="49" width="8" height="6" rx="1" fill={color} />
        <rect x="28" y="36" width="7" height="6" rx="1" fill={color} transform="rotate(-45 28 36)" />
        <rect x="57" y="63" width="7" height="6" rx="1" fill={color} transform="rotate(-45 57 63)" />
        <rect x="57" y="38" width="7" height="6" rx="1" fill={color} transform="rotate(45 57 38)" />
        <rect x="28" y="65" width="7" height="6" rx="1" fill={color} transform="rotate(45 28 65)" />

        {/* Small Gear */}
        <circle cx="68" cy="70" r="12" fill={color} />
        <circle cx="68" cy="70" r="5" fill={variant === 'dark' ? '#ffffff' : '#1a1a2e'} />
        {/* Small gear teeth */}
        <rect x="66" y="55" width="4" height="5" rx="1" fill={color} />
        <rect x="66" y="80" width="4" height="5" rx="1" fill={color} />
        <rect x="53" y="68" width="5" height="4" rx="1" fill={color} />
        <rect x="78" y="68" width="5" height="4" rx="1" fill={color} />
      </svg>

      {/* Text */}
      {showText && (
        <span
          className="font-bold text-xl tracking-tight"
          style={{ color }}
        >
          <span className="font-extrabold">ToolTime</span> Pro
        </span>
      )}
    </div>
  );
}
