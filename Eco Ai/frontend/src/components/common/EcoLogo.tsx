import React from 'react';
import logoImg from '../../assets/logo-transparent.png';

interface EcoLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
}

export const EcoLogo: React.FC<EcoLogoProps> = ({
  className = '',
  size = 'md',
  rounded = false,
}) => {
  const sizeMap: Record<string, string> = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const containerClass = sizeMap[size] || 'w-9 h-9';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${containerClass} ${
        rounded
          ? 'rounded-xl bg-slate-900/90 p-1 border border-emerald-500/20 shadow-lg shadow-emerald-500/10'
          : ''
      } ${className}`}
    >
      <img
        src={logoImg}
        alt="Eco AI Logo"
        className="w-full h-full object-contain filter drop-shadow-sm select-none"
      />
    </div>
  );
};

export default EcoLogo;
