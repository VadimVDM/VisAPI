interface WelcomeEmailData {
  user_email: string;
  user_name?: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const userName = data.user_name || data.user_email.split('@')[0];
  
  const subject = 'Welcome to VisAPI - Your Account is Ready!';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to VisAPI</title>
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
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 16px;
    }
    h1 {
      color: #1e293b;
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .welcome-message {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
      text-align: center;
    }
    .feature-list {
      margin: 24px 0;
    }
    .feature-item {
      display: flex;
      align-items: center;
      margin: 12px 0;
      padding: 12px;
      background-color: #f8fafc;
      border-radius: 6px;
    }
    .feature-icon {
      color: #10b981;
      margin-right: 12px;
      font-weight: bold;
    }
    .cta-button {
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
    .cta-button:hover {
      background-color: #059669;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">VisAPI</div>
      <div class="subtitle">Enterprise Workflow Automation</div>
    </div>
    
    <h1>Welcome to VisAPI, ${userName}! 🎉</h1>
    
    <div class="welcome-message">
      <h2 style="margin: 0 0 8px 0; color: white;">Your account is ready!</h2>
      <p style="margin: 0; opacity: 0.9;">Start automating your workflows today with enterprise-grade tools.</p>
    </div>
    
    <p>Thank you for joining VisAPI! You now have access to our powerful workflow automation platform designed specifically for Visanet's enterprise needs.</p>
    
    <div class="feature-list">
      <h3>What you can do with VisAPI:</h3>
      
      <div class="feature-item">
        <span class="feature-icon">✅</span>
        <span><strong>Workflow Automation:</strong> Create and manage complex workflows with triggers and actions</span>
      </div>
      
      <div class="feature-item">
        <span class="feature-icon">✅</span>
        <span><strong>WhatsApp Integration:</strong> Send automated messages and notifications</span>
      </div>
      
      <div class="feature-item">
        <span class="feature-icon">✅</span>
        <span><strong>PDF Generation:</strong> Create dynamic documents and reports</span>
      </div>
      
      <div class="feature-item">
        <span class="feature-icon">✅</span>
        <span><strong>Queue Management:</strong> Monitor and manage background jobs</span>
      </div>
      
      <div class="feature-item">
        <span class="feature-icon">✅</span>
        <span><strong>API Keys:</strong> Secure API access with role-based permissions</span>
      </div>
      
      <div class="feature-item">
        <span class="feature-icon">✅</span>
        <span><strong>Real-time Logs:</strong> Track all system activities and events</span>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="https://app.visanet.app" class="cta-button">Access Your Dashboard</a>
    </div>
    
    <p><strong>Need help getting started?</strong><br>
    Check out our documentation or contact our support team at support@visanet.app</p>
    
    <div class="footer">
      <p>Welcome to the VisAPI family!<br>
      VisAPI - Visanet Enterprise Workflow Automation<br>
      Questions? Reply to this email or contact support@visanet.app</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Welcome to VisAPI, ${userName}!

Thank you for joining VisAPI! You now have access to our powerful workflow automation platform.

What you can do with VisAPI:
✅ Workflow Automation: Create and manage complex workflows
✅ WhatsApp Integration: Send automated messages and notifications  
✅ PDF Generation: Create dynamic documents and reports
✅ Queue Management: Monitor and manage background jobs
✅ API Keys: Secure API access with role-based permissions
✅ Real-time Logs: Track all system activities and events

Access your dashboard: https://app.visanet.app

Need help? Contact support@visanet.app

Welcome to the VisAPI family!
VisAPI - Visanet Enterprise Workflow Automation
`;

  return { subject, html, text };
}