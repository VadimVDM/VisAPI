interface EmailVerificationData {
  supabase_url: string;
  email_action_type: string;
  redirect_to: string;
  token_hash: string;
  token: string;
  user_email: string;
}

export function generateEmailVerificationEmail(data: EmailVerificationData): {
  subject: string;
  html: string;
  text: string;
} {
  // Use our custom domain for email verification links
  const apiDomain = 'https://api.visanet.app';
  const verificationUrl = `${apiDomain}/api/v1/auth/confirm?token_hash=${data.token_hash}&type=${data.email_action_type}&redirect_to=${encodeURIComponent(data.redirect_to)}`;

  const subject = 'Verify Your VisAPI Email Address';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - VisAPI</title>
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
    .verify-button {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
      transition: background-color 0.2s;
    }
    .verify-button:hover {
      background-color: #059669;
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
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
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
    
    <h1>Verify Your Email Address</h1>
    <p>Welcome to VisAPI! To complete your account setup, please verify your email address <strong>${data.user_email}</strong>.</p>
    
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
    </div>
    
    <div class="alternative">
      <strong>Alternative option:</strong><br>
      If the button doesn't work, copy and paste this verification code:
      <div class="code">${data.token}</div>
    </div>
    
    <div class="info-box">
      <strong>ℹ️ Why verify your email?</strong><br>
      Email verification helps us:
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Ensure account security</li>
        <li>Send important notifications</li>
        <li>Help with password recovery</li>
        <li>Comply with security policies</li>
      </ul>
    </div>
    
    <div class="security-note">
      <strong>Security Notice:</strong> This verification link will expire in 24 hours and can only be used once.
    </div>
    
    <p><strong>What happens after verification?</strong></p>
    <ul>
      <li>Full access to your VisAPI dashboard</li>
      <li>Ability to create and manage workflows</li>
      <li>Access to all enterprise features</li>
      <li>Email notifications for important updates</li>
    </ul>
    
    <div class="footer">
      <p>This email was sent by VisAPI - Visanet Enterprise Workflow Automation<br>
      If you have questions, contact support at support@visanet.app</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Verify Your VisAPI Email Address

Welcome to VisAPI! To complete your account setup, please verify your email address: ${data.user_email}

Click this link to verify your email:
${verificationUrl}

Alternative: Enter this verification code: ${data.token}

This verification link expires in 24 hours and can only be used once.

Why verify your email?
- Ensure account security
- Send important notifications  
- Help with password recovery
- Comply with security policies

What happens after verification?
- Full access to your VisAPI dashboard
- Ability to create and manage workflows
- Access to all enterprise features
- Email notifications for important updates

VisAPI - Visanet Enterprise Workflow Automation
Support: support@visanet.app
`;

  return { subject, html, text };
}
