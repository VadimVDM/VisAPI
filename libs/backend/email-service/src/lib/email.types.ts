export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SupabaseEmailHookData {
  user: {
    email: string;
    id: string;
    user_metadata?: Record<string, any>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: 'signup' | 'magic_link' | 'recovery' | 'invite' | 'email_change';
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}