'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import logoLight from '../../../public/Visanet-Logo.svg';
import logoDark from '../../../public/Visanet-Logo-White.svg';

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
    return (
      <div
        className={className}
        style={{ width, height }}
      />
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const logoSrc = currentTheme === 'dark' ? logoDark : logoLight;

  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}