import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type OTPEmailType = 'sign-in' | 'email-verification' | 'forget-password';

type SendOTPEmailType = {
  to: string;
  otp: string;
  type: OTPEmailType;
};

export async function sendOTPEmail({ to, otp, type }: SendOTPEmailType) {
  const subjects: Record<OTPEmailType, string> = {
    'sign-in': 'Your sign-in code',
    'email-verification': 'Verify your email',
    'forget-password': 'Reset your password',
  };

  await resend.emails.send({
    from: 'Kivo <onboarding@resend.dev>',
    to,
    subject: subjects[type],
    html: `
      <h2>Your verification code</h2>
      <p>Use the code below to continue:</p>
      <h1>${otp}</h1>
      <p>This code expires in 5 minutes.</p>
    `,
  });
}
