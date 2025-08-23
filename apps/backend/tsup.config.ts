import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: '../../dist/apps/backend',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false, // We don't need type definitions for the app
  minify: process.env.NODE_ENV === 'production',
  bundle: true,
  
  // External dependencies that should not be bundled
  external: [
    // Native Node.js modules
    'crypto',
    'fs',
    'path',
    'http',
    'https',
    'stream',
    'util',
    'buffer',
    'events',
    'querystring',
    'url',
    'child_process',
    'cluster',
    'dns',
    'net',
    'os',
    'readline',
    'tls',
    'v8',
    'vm',
    'zlib',
    
    // Peer dependencies / problematic packages
    '@nestjs/microservices',
    '@nestjs/websockets',
    'cache-manager',
    'class-transformer',
    'class-validator',
    'fastify',
    '@fastify/*',
    'kafkajs',
    'mqtt',
    'nats',
    'redis',
    '@redis/client',
    'amqplib',
    'amqp-connection-manager',
    'grpc',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    
    // Keep these external to avoid bundling issues
    'bcrypt',
    'sharp',
    'canvas',
    'bufferutil',
    'utf-8-validate',
    '@swc/core',
    '@swc/wasm',
  ],
  
  // ESBuild options
  esbuildOptions(options) {
    options.banner = {
      js: `
        // VisAPI Backend - Built with tsup
        // Build time: ${new Date().toISOString()}
        // Node version: ${process.version}
      `.trim(),
    };
    
    // Keep class names and function names for better debugging
    options.keepNames = true;
    
    // Enable tree shaking
    options.treeShaking = true;
    
    // Use more aggressive optimizations in production
    if (process.env.NODE_ENV === 'production') {
      options.drop = ['console', 'debugger'];
      options.legalComments = 'none';
    }
  },
  
  // Watch options for development
  onSuccess: process.env.NODE_ENV === 'development' 
    ? 'node ../../dist/apps/backend/main.js' 
    : undefined,
});