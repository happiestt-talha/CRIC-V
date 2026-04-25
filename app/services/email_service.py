import os
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from typing import List
import logging

# Configure logging
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.mail_username = os.getenv("MAIL_USERNAME")
        self.mail_password = os.getenv("MAIL_PASSWORD")
        self.mail_from = os.getenv("MAIL_FROM")
        self.mail_port = int(os.getenv("MAIL_PORT", 587))
        self.mail_server = os.getenv("MAIL_SERVER")
        self.mail_from_name = os.getenv("MAIL_FROM_NAME", "CRIC-V")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Connection configuration
        self.conf = ConnectionConfig(
            MAIL_USERNAME=self.mail_username,
            MAIL_PASSWORD=self.mail_password,
            MAIL_FROM=self.mail_from,
            MAIL_PORT=self.mail_port,
            MAIL_SERVER=self.mail_server,
            MAIL_FROM_NAME=self.mail_from_name,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )

    async def _send_email(self, email: str, subject: str, body: str):
        """Internal helper to send email or print to console"""
        if self.mail_server == "console":
            print("\n" + "="*50)
            print(f"EMAIL SENT TO: {email}")
            print(f"SUBJECT: {subject}")
            print("-" * 50)
            print(body)
            print("="*50 + "\n")
            return

        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=body,
            subtype=MessageType.html
        )

        fm = FastMail(self.conf)
        try:
            await fm.send_message(message)
            logger.info(f"Email sent to {email} with subject: {subject}")
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send email to {email}: {error_msg}")
            
            # Development/Debug fallback: print to console if SMTP fails
            if os.getenv("DEBUG") == "True" or "timed out" in error_msg.lower():
                print("\n" + "!"*60)
                print(f"SMTP FAILURE FALLBACK (DEBUG/TIMEOUT)")
                print(f"TO: {email}")
                print(f"SUBJECT: {subject}")
                print("-" * 60)
                # Strip HTML tags for console readability if you want, but simple print is fine
                print("Email content is available in logs/console.")
                print("!"*60 + "\n")
                
            if os.getenv("DEBUG") != "True":
                # In production, we might still want to know it failed
                pass 
            
            # Don't raise if it's a timeout in development, let the user continue
            if "timed out" in error_msg.lower() and os.getenv("DEBUG") == "True":
                return
                
            if os.getenv("DEBUG") != "True":
                raise e

    async def send_verification_email(self, email: str, token: str):
        verification_link = f"{self.frontend_url}/verify-email?token={token}"
        subject = "Verify your CRIC-V Account"
        
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #22c55e;">Welcome to CRIC-V!</h2>
                    <p>Thank you for registering. Please verify your email address to activate your account.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_link}" 
                           style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Verify Email Address
                        </a>
                    </div>
                    <p>If the button doesn't work, copy and paste the following link into your browser:</p>
                    <p style="word-break: break-all; color: #64748b;">{verification_link}</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8;">This is an automated message from CRIC-V. If you didn't sign up, you can safely ignore this email.</p>
                </div>
            </body>
        </html>
        """
        await self._send_email(email, subject, body)

    async def send_password_reset_email(self, email: str, token: str):
        reset_link = f"{self.frontend_url}/reset-password?token={token}"
        subject = "Reset your CRIC-V Password"
        
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #22c55e;">Password Reset Request</h2>
                    <p>You requested to reset your password for your CRIC-V account. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    <p>If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
                    <p>This link will expire in 1 hour.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8;">CRIC-V Cricket Coaching Assistant</p>
                </div>
            </body>
        </html>
        """
        await self._send_email(email, subject, body)

    async def send_player_credentials_email(self, email: str, username: str, temporary_password: str):
        subject = "Your CRIC-V Player Credentials"
        
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #22c55e;">Welcome to CRIC-V!</h2>
                    <p>Your coach has created an account for you on the CRIC-V platform.</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Username:</strong> {username}</p>
                        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> {temporary_password}</p>
                    </div>
                    <p>Please log in and change your password immediately.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{self.frontend_url}/login" 
                           style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Login Now
                        </a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #94a3b8;">CRIC-V Cricket Coaching Assistant</p>
                </div>
            </body>
        </html>
        """
        await self._send_email(email, subject, body)

# Initialize a global instance
email_service = EmailService()
