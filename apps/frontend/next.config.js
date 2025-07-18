// @ts-check

const { composePlugins, withNx } = require('@nx/next');
const path = require('path');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {
    svgr: false,
  },
  // Remove standalone output for Vercel deployment - Vercel handles this automatically
  // output: 'standalone',
  reactStrictMode: true,
  // outputFileTracingRoot: path.join(__dirname, '../../'),
  
  // Temporarily disable static page generation for error pages to work around Next.js 15 Html import issue
  trailingSlash: false,
  
  // Image configuration for SVG support
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Skip problematic pages during CI builds
  ...(process.env.NODE_ENV === 'production' && process.env.CI === 'true' && {
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    // exportPathMap is not compatible with app directory
    // Use generateStaticParams in page components instead
  }),
  
  // Webpack configuration for SVGR
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
