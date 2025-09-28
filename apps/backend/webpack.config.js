const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/backend'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        {
          input: './src/airtable/scripts',
          glob: '**/*.py',
          output: './airtable/scripts',
        },
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      // Use 'all' to let webpack determine external dependencies
      // This will include all node_modules as external and generate proper package.json
      externalDependencies: 'all',
    }),
  ],
};
