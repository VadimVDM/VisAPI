# Testing Guide - Resource-Friendly Test Execution

## Overview

The test suite has been optimized to run more efficiently and use fewer system resources. This guide explains the various test commands available and when to use them.

## Test Commands

### 1. Light Test Mode (Recommended for Development)

```bash
pnpm test:backend:light
```

This runs tests with:
- Maximum 2 parallel workers
- Memory limit of 512MB per worker
- Automatic memory cleanup after each test file

### 2. Serial Test Mode (Lowest Resource Usage)

```bash
pnpm test:backend:serial
```

Runs all tests sequentially (one at a time). Best for:
- Systems with limited RAM
- When experiencing test failures due to resource contention
- Debugging test isolation issues

### 3. Watch Mode (Development)

```bash
pnpm test:backend:watch
```

Runs tests in watch mode with only 1 worker. Great for:
- TDD (Test-Driven Development)
- Focusing on specific test files
- Immediate feedback during development

### 4. Test Specific Files

```bash
# Test a specific file
pnpm test:backend:file cron-seeder

# Test multiple files matching a pattern
pnpm test:backend:file "api-keys|queue"
```

### 5. Coverage Mode

```bash
pnpm test:backend:coverage
```

Runs tests with coverage reporting using 2 workers max.

## Resource Optimization Features

### 1. Smart Test Sequencing

Tests are automatically ordered by:
- Unit tests run before integration tests
- Smaller files run before larger files
- This allows memory to be freed progressively

### 2. Memory Management

- **Worker Idle Memory Limit**: Workers release memory after 512MB usage
- **Isolated Modules**: TypeScript compilation is faster with isolated modules
- **Garbage Collection**: Forced GC after all tests complete

### 3. Console Noise Reduction

- Console output is suppressed during tests (unless `DEBUG_TESTS=1`)
- Verbose mode is disabled by default
- Clean, focused test output

### 4. Caching

- Jest cache is enabled and stored in `.jest-cache/`
- Significantly speeds up subsequent test runs
- Clear with: `rm -rf .jest-cache`

## Best Practices

### For Daily Development

```bash
# Use light mode for regular test runs
pnpm test:backend:light

# Use watch mode when working on specific features
pnpm test:backend:watch
```

### For CI/CD

```bash
# CI automatically uses more workers (4)
pnpm test:backend
```

### When System is Under Load

```bash
# Use serial mode to minimize resource usage
pnpm test:backend:serial
```

### Debugging Test Issues

```bash
# Enable debug output
DEBUG_TESTS=1 pnpm test:backend:file problematic-test

# Run with Node inspect
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## Performance Tips

1. **Close Other Applications**: IDEs, browsers, and Docker consume significant RAM
2. **Use Docker Sparingly**: Stop Docker services when not needed: `pnpm docker:down`
3. **Clear Jest Cache**: If tests are slow: `rm -rf .jest-cache`
4. **Restart Between Runs**: For long test sessions, restart occasionally to free memory

## Troubleshooting

### Tests Still Lagging?

1. Check available memory: `free -h` (Linux) or Activity Monitor (macOS)
2. Use serial mode: `pnpm test:backend:serial`
3. Test specific files only: `pnpm test:backend:file <pattern>`
4. Increase Node memory limit: `NODE_OPTIONS="--max-old-space-size=2048" pnpm test:backend`

### Tests Failing Inconsistently?

1. Run in serial mode to eliminate race conditions
2. Check for test interdependencies
3. Ensure proper test cleanup in `afterEach` hooks
4. Use `--detectOpenHandles` to find hanging resources

## Environment Variables

- `DEBUG_TESTS=1` - Enable console output during tests
- `CI=true` - Simulate CI environment (uses more workers)
- `NODE_OPTIONS="--max-old-space-size=2048"` - Increase Node memory limit

## Summary

The optimized test configuration provides multiple execution strategies to match your system's capabilities and current workload. Start with `test:backend:light` for most development work, and adjust based on your needs.