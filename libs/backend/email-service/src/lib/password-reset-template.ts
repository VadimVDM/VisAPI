interface PasswordResetEmailData {
  supabase_url: string;
  email_action_type: string;
  redirect_to: string;
  token_hash: string;
  token: string;
  user_email: string;
}

export function generatePasswordResetEmail(data: PasswordResetEmailData): { subject: string; html: string; text: string } {
  const resetUrl = `${data.supabase_url}/auth/v1/verify?token=${data.token_hash}&type=${data.email_action_type}&redirect_to=${data.redirect_to}`;
  
  const subject = 'Reset Your VisAPI Password';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your VisAPI Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      color: #1e40af;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    .reset-button {
      display: inline-block;
      background-color: #dc2626;
      color: #ffffff;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      transition: background-color 0.2s;
    }
    .reset-button:hover {
      background-color: #b91c1c;
    }
    .alternative {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .code {
      display: inline-block;
      background-color: #e2e8f0;
      color: #1e293b;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 16px;
      font-weight: 600;
      margin: 8px 0;
      border: 1px solid #cbd5e1;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      text-align: center;
    }
    .security-note {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .warning {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">VisAPI</div>
      <div class="subtitle">Enterprise Workflow Automation</div>
    </div>
    
    <h1>Reset Your Password</h1>
    <p>We received a request to reset the password for your VisAPI account associated with <strong>${data.user_email}</strong>.</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="reset-button">Reset Password</a>
    </div>
    
    <div class="alternative">
      <strong>Alternative option:</strong><br>
      If the button doesn't work, copy and paste this verification code:
      <div class="code">${data.token}</div>
    </div>
    
    <div class="security-note">
      <strong>Security Notice:</strong> This link will expire in 1 hour and can only be used once.
    </div>
    
    <div class="warning">
      <strong>⚠️ Didn't request this?</strong><br>
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Consider reviewing your account security if you receive multiple unrequested emails.
    </div>
    
    <p><strong>After resetting your password:</strong></p>
    <ul>
      <li>Use a strong, unique password</li>
      <li>Don't share your credentials with anyone</li>
      <li>Consider using a password manager</li>
    </ul>
    
    <div class="footer">
      <p>This email was sent by VisAPI - Visanet Enterprise Workflow Automation<br>
      If you have questions, contact support at support@visanet.app</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Reset Your VisAPI Password

We received a request to reset the password for your VisAPI account: ${data.user_email}

Click this link to reset your password:
${resetUrl}

Alternative: Enter this verification code: ${data.token}

This link expires in 1 hour and can only be used once.

⚠️ Didn't request this?
If you didn't request a password reset, please ignore this email.

After resetting your password:
- Use a strong, unique password
- Don't share your credentials with anyone
- Consider using a password manager

VisAPI - Visanet Enterprise Workflow Automation
Support: support@visanet.app
`;

  return { subject, html, text };
}