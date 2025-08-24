import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app/app.module';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '@visapi/core-supabase';
import { User } from '@visapi/shared-types';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const supabaseService = app.get(SupabaseService);

  try {
    // Check if a system user exists, or create one
    const systemEmail = 'vizi-system@visanet.app';

    const { data: user, error: userError } = await supabaseService.serviceClient
      .from('users')
      .insert({
        email: systemEmail,
        role: 'admin', // Use admin role instead of system
      })
      .select()
      .single<User>();

    if (userError && !userError.message.includes('duplicate')) {
      throw userError;
    }

    let userId = user?.id;

    if (!userId) {
      // User already exists, fetch it
      const { data: existingUser } = await supabaseService.serviceClient
        .from('users')
        .select('id')
        .eq('email', systemEmail)
        .single<{ id: string }>();

      if (existingUser) {
        userId = existingUser.id;
      }
    }

    if (!userId) {
      throw new Error('Could not create or find system user');
    }

    // Create a Vizi API key with webhook scopes
    const { key, apiKey } = await authService.createApiKey(
      'Vizi Webhook API Key',
      ['webhook:vizi', 'orders:write', 'triggers:create'],
      userId,
      'vizi_', // Custom prefix for Vizi keys
    );

    console.log('✅ Vizi API Key created successfully!');
    console.log('');
    console.log('Save this key securely, it will not be shown again:');
    console.log('');
    console.log(`API Key: ${key}`);
    console.log('');
    console.log('Key Details:');
    console.log('- Key ID:', apiKey.id);
    console.log('- Prefix:', apiKey.prefix);
    console.log('- Scopes:', apiKey.scopes.join(', '));
    console.log('- Expires:', apiKey.expires_at);
    console.log('');
    console.log('Use this key in the X-API-Key header when calling:');
    console.log('POST /api/v1/webhooks/vizi/orders');
  } catch (error) {
    console.error('Error creating Vizi API key:', error);
  } finally {
    await app.close();
  }
}

void bootstrap();
