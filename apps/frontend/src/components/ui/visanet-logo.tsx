'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import LogoLight from '../../assets/Visanet-Logo.svg';
import LogoDark from '../../assets/Visanet-Logo-White.svg';

interface VisanetLogoProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export function VisanetLogo({
  width = 160,
  height = 60,
  className = '',
  alt = 'VisAPI Logo',
}: VisanetLogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return <div className={className} style={{ width, height }} />;
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const Logo = currentTheme === 'dark' ? LogoDark : LogoLight;

  return (
    <Logo
      width={width}
      height={height}
      className={className}
      aria-label={alt}
      preserveAspectRatio="xMidYMid meet"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
