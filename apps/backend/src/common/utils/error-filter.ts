/**
 * Error filter utility to suppress known non-critical errors in production
 */
export class ErrorFilter {
  private static readonly SUPPRESSED_PATTERNS = [
    // Redis localhost connection attempts from BullMQ internal schedulers
    /Error: connect ECONNREFUSED 127\.0\.0\.1:6379/,
    // NestJS route converter warnings for wildcard paths
    /LegacyRouteConverter.*Unsupported route path.*\/api\/\*/,
    // Node.js 22 punycode deprecation
    /\[DEP0040\].*punycode.*deprecated/,
    // BullMQ internal scheduler attempting localhost
    /connect ECONNREFUSED.*127\.0\.0\.1.*6379/,
  ];

  /**
   * Check if an error message should be suppressed
   */
  static shouldSuppress(message: string): boolean {
    return this.SUPPRESSED_PATTERNS.some(pattern => pattern.test(message));
  }

  /**
   * Wrap console methods to filter errors
   */
  static install(): void {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || JSON.stringify(arg)
      ).join(' ');

      if (!this.shouldSuppress(message)) {
        originalError.apply(console, args);
      }
    };

    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || JSON.stringify(arg)
      ).join(' ');

      if (!this.shouldSuppress(message)) {
        originalWarn.apply(console, args);
      }
    };

    // Also filter console.log since NestJS might use it for warnings
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg?.message || arg?.toString() || JSON.stringify(arg)
      ).join(' ');

      // Only suppress if it contains warning patterns
      if (message.includes('LegacyRouteConverter') || 
          message.includes('Unsupported route path')) {
        return;
      }

      originalLog.apply(console, args);
    };
  }
}