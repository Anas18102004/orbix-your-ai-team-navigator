import nodemailer from 'nodemailer';

// Email service for sending workspace invites
// In production, configure with real SMTP settings (Gmail, SendGrid, etc.)

const createTransporter = () => {
  // For development, use a test account or configure with real SMTP
  // You can use Gmail, SendGrid, AWS SES, etc.
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  // If no email config, return null (emails won't be sent but won't crash)
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASS in .env to enable email invites.');
    return null;
  }

  return nodemailer.createTransport(emailConfig);
};

export const sendWorkspaceInvite = async (data: {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteCode: string;
  inviteLink?: string;
  inviteId?: string;
}) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      const missingConfig = [];
      if (!process.env.SMTP_USER) missingConfig.push('SMTP_USER');
      if (!process.env.SMTP_PASS) missingConfig.push('SMTP_PASS');
      
      console.warn(`⚠️  [Email not sent - SMTP not configured] Invite to ${data.to} for workspace "${data.workspaceName}"`);
      console.warn(`   Missing configuration: ${missingConfig.join(', ')}`);
      console.warn(`   Please set ${missingConfig.join(' and ')} in your .env file to enable email sending.`);
      
      return { 
        success: false, 
        message: 'Email service not configured. Please configure SMTP settings in .env file.',
        error: 'SMTP_NOT_CONFIGURED',
        errorCode: 'SMTP_NOT_CONFIGURED',
        missingConfig 
      };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const inviteLink = data.inviteLink || `${frontendUrl}/join-workspace?code=${data.inviteCode}`;
    const acceptLink = `${frontendUrl}/app?action=accept&inviteId=${data.inviteCode}`;
    const rejectLink = `${frontendUrl}/app?action=reject&inviteId=${data.inviteCode}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Orbix'}" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `You've been invited to join ${data.workspaceName} on Orbix`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Workspace Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi there,
            </p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${data.inviterName}</strong> has invited you to join the workspace <strong>"${data.workspaceName}"</strong> on Orbix.
            </p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your invite code:</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #667eea;">${data.inviteCode}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Accept Invite
                </a>
                <a href="${rejectLink}" style="display: inline-block; background: #f5f5f5; color: #666; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; border: 1px solid #e0e0e0;">
                  Decline
                </a>
              </div>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:<br>
              <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
You've been invited to join "${data.workspaceName}" on Orbix!

${data.inviterName} has invited you to join their workspace.

Your invite code: ${data.inviteCode}

Join here: ${inviteLink}

If you didn't expect this invitation, you can safely ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${data.to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    console.error('   Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your SMTP credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to email server. Please check your SMTP_HOST and SMTP_PORT.';
    } else if (error.response) {
      errorMessage = `Email server error: ${error.response}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorCode: error.code,
      errorDetails: error.response || error.message
    };
  }
};

