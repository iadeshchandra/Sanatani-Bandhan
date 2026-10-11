import React from 'react';

export interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;
  className?: string;
  glow?: boolean;
  rounded?: string;
  alt?: string;
  showText?: boolean;
  textVariant?: 'dark' | 'light';
  subtitle?: string;
  id?: string;
}

const sizeMap = {
  xs: 'w-5 h-5 min-w-5 min-h-5',
  sm: 'w-7 h-7 min-w-7 min-h-7',
  md: 'w-9 h-9 min-w-9 min-h-9',
  lg: 'w-12 h-12 min-w-12 min-h-12',
  xl: 'w-16 h-16 min-w-16 min-h-16',
  '2xl': 'w-20 h-20 min-w-20 min-h-20',
  '3xl': 'w-24 h-24 min-w-24 min-h-24',
};

const radiusMap = {
  xs: 'rounded-md',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
  '3xl': 'rounded-3xl',
};

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  glow = false,
  rounded,
  alt = 'Sanatani Bandhan Logo',
  showText = false,
  textVariant = 'dark',
  subtitle,
  id,
}) => {
  const sizeClass = typeof size === 'string' ? sizeMap[size] : `w-[${size}px] h-[${size}px]`;
  const defaultRadius = typeof size === 'string' ? radiusMap[size] : 'rounded-xl';
  const effectiveRadius = rounded || defaultRadius;

  return (
    <div id={id} className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`relative flex-shrink-0 ${sizeClass} ${glow ? 'group' : ''}`}>
        {glow && (
          <div className={`absolute -inset-1 bg-gradient-to-r from-saffron-500 to-saffron-600 ${effectiveRadius} blur-sm opacity-50 group-hover:opacity-75 transition-opacity duration-300 pointer-events-none`} />
        )}
        <img
          src="/logo.png"
          alt={alt}
          referrerPolicy="no-referrer"
          className={`relative w-full h-full object-contain ${effectiveRadius} shadow-sm transition-transform duration-200 hover:scale-105`}
          onError={(e) => {
            // Fallback to png if svg fails
            const target = e.currentTarget;
            if (target.src.endsWith('.svg')) {
              target.src = '/icon-192x192.png';
            }
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col select-none">
          <span className={`font-black tracking-tight leading-none ${
            size === 'xs' || size === 'sm' ? 'text-sm' :
            size === 'md' ? 'text-base' :
            size === 'lg' ? 'text-xl' : 'text-2xl'
          } ${textVariant === 'light' ? 'text-white' : 'text-temple-900'}`}>
            Sanatani<span className="text-saffron-500">Bandhan</span>
          </span>
          {subtitle && (
            <span className={`text-[10px] font-bold tracking-wider uppercase mt-0.5 ${
              textVariant === 'light' ? 'text-saffron-200/80' : 'text-temple-500'
            }`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AppLogo;
