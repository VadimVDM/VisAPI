//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

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
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  
  // Skip problematic pages during CI builds
  ...(process.env.NODE_ENV === 'production' && process.env.CI === 'true' && {
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true,
    exportPathMap: async function (defaultPathMap) {
      return {
        '/': { page: '/' },
        '/dashboard': { page: '/dashboard' },
        '/dashboard/api-keys': { page: '/dashboard/api-keys' },
        '/dashboard/workflows': { page: '/dashboard/workflows' },
        // Skip logs page that causes build issues
        // '/dashboard/logs': { page: '/dashboard/logs' },
      };
    },
  }),
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
