const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/worker'),
  },
  externals: {
    playwright: 'commonjs playwright',
    '@2captcha/captcha-solver': 'commonjs @2captcha/captcha-solver',
  },
  resolve: {
    alias: {
      playwright: false,
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false, // We're using our own package.json
      typeCheck: false, // Skip type checking during webpack build
    }),
  ],
};
