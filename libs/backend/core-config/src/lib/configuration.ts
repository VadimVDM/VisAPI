import { getValidatedConfig } from './config-schema';

/**
 * Get validated configuration with Zod schema validation
 * This ensures all environment variables are properly typed and validated
 */
export default () => {
  try {
    return getValidatedConfig();
  } catch (error) {
    // Log the error details for debugging
    console.error('❌ Configuration validation failed:', error.message);
    
    // In development, provide helpful error message
    if (process.env.NODE_ENV !== 'production') {
      console.error('\n💡 Tip: Check your .env file and ensure all required variables are set correctly.');
      console.error('   You can reference .env.example for the complete list of variables.\n');
    }
    
    // Re-throw to prevent app from starting with invalid config
    throw error;
  }
};
