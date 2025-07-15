import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '@visapi/core-supabase';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const supabaseService = app.get(SupabaseService);

  try {
    // Create a test user
    const { data: user, error: userError } = await supabaseService.serviceClient
      .from('users')
      .insert({
        email: 'admin@visanet.app',
        role: 'admin',
      })
      .select()
      .single();

    if (userError && !userError.message.includes('duplicate')) {
      throw userError;
    }

    let userId = user?.id;

    if (!userId) {
      // User already exists, fetch it
      const { data: existingUser } = await supabaseService.serviceClient
        .from('users')
        .select('id')
        .eq('email', 'admin@visanet.app')
        .single();

      userId = existingUser?.id;
    }

    // Create an API key with all scopes
    const { key, apiKey } = await authService.createApiKey(
      'Development API Key',
      [
        'workflows:read',
        'workflows:create',
        'logs:read',
        'keys:read',
        'keys:create',
        'keys:delete',
        'triggers:create',
      ],
      userId
    );

    console.log('✅ API Key created successfully!');
    console.log('');
    console.log('Save this key securely, it will not be shown again:');
    console.log('');
    console.log(`API Key: ${key}`);
    console.log('');
    console.log('To use this key, add it to your request headers:');
    console.log('X-API-Key: ' + key);
    console.log('');
    console.log('Key ID:', apiKey.id);
    console.log('Scopes:', apiKey.scopes.join(', '));
    console.log('Expires:', apiKey.expires_at);
  } catch (error) {
    console.error('Error creating API key:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
