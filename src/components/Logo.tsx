import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = 'Intelligence Directory & Metrics',
  className = '',
  onClick,
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  const titleSize = {
    sm: 'text-xl',
    md: 'text-2xl md:text-3xl',
    lg: 'text-3xl md:text-4xl',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none cursor-pointer group ${className}`}
      id="brand-logo-toolverai"
    >
      {/* Icon Mark: Stylized T + V + AI Neural Vertex */}
      <div className={`relative ${iconDimensions} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            {/* Primary Brand Gradient */}
            <linearGradient id="tv-primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338CA" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>

            {/* Accent Cyan / AI Glow */}
            <linearGradient id="tv-accent-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>

            {/* Subtle inner highlight overlay */}
            <linearGradient id="tv-specular" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Squircle Base with border */}
          <rect
            x="1.5"
            y="1.5"
            width="41"
            height="41"
            rx="11"
            fill="url(#tv-primary-grad)"
            stroke="#4338CA"
            strokeWidth="1.5"
          />
          <rect
            x="2.5"
            y="2.5"
            width="39"
            height="39"
            rx="10"
            fill="url(#tv-specular)"
          />

          {/* Stylized 'T' & 'V' Overlap Shape */}
          {/* Top 'T' Bar with futuristic bevel */}
          <path
            d="M10 13C10 11.8954 10.8954 11 12 11H32C33.1046 11 34 11.8954 34 13V15.5C34 16.0523 33.5523 16.5 33 16.5H11C10.4477 16.5 10 16.0523 10 15.5V13Z"
            fill="#FFFFFF"
          />

          {/* Interlocking 'V' Chevron representing "Ver" & Vertex */}
          <path
            d="M16 17.5L22 31.5L28 17.5H24L22 23.5L20 17.5H16Z"
            fill="#FFFFFF"
            fillOpacity="0.95"
          />

          {/* AI Energy Spark / Neural Vertex Node */}
          <circle cx="22" cy="18" r="2.5" fill="#38BDF8" />
          <path
            d="M33 9L34.2 12.2L37.4 13.4L34.2 14.6L33 17.8L31.8 14.6L28.6 13.4L31.8 12.2L33 9Z"
            fill="#FACC15"
            opacity="0.95"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 leading-none">
            <span className={`font-heading ${titleSize} font-extrabold tracking-tight text-slate-900`}>
              Toolver<span className="text-indigo-600 font-black">AI</span>
            </span>
          </div>

          {subtitle && (
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1 hidden sm:inline leading-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
