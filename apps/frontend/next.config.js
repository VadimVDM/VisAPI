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
  output: 'standalone',
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  
  // Skip problematic pages during CI builds
  ...(process.env.NODE_ENV === 'production' && process.env.CI === 'true' && {
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    // exportPathMap is not compatible with app directory
    // Use generateStaticParams in page components instead
  }),
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
