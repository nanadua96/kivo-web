'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { useSidebar } from '@/store';
import styles from './AuthModal.module.css';

// -----------------------------
// Validation schemas
// -----------------------------
const signInSchema = z.object({
  email: z.email({
    pattern:
      /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i,
  }),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Enter the 6-digit verification code')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

type SignInValues = z.infer<typeof signInSchema>;
type OtpValues = z.infer<typeof otpSchema>;

type AuthView = 'send-otp' | 'verify-otp';

type AuthModalProps = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('send-otp');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // -----------------------------
  // Form instances
  // -----------------------------

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  // -----------------------------
  // Modal behaviour
  // -----------------------------

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // =============================
  // HELPERS
  // =============================
  function changeView(nextView: AuthView) {
    setServerError('');
    setResendMessage('');
    setView(nextView);
  }

  function showError(error: unknown) {
    setServerError(
      error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.',
    );
  }

  ////////////////////////////////////////////////////////////////////!
  async function sendOtp(email: string) {
    return await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });
  }

  async function verifyOtp(email: string, code: string) {
    return await authClient.signIn.emailOtp({ email, otp: code });
  }
  ////////////////////////////////////////////////////////////////////!

  // =============================
  // EMAIL HANDLER
  // =============================
  async function handleEmail(data: SignInValues) {
    setServerError('');

    try {
      setEmail(data.email);

      // const response = await authClient.emailOtp.sendVerificationOtp({
      //   email: data.email,
      //   type: 'sign-in',
      // });

      const response = await sendOtp(data.email);

      if (!response.data?.success) throw new Error(response.error?.message);

      otpForm.reset();

      changeView('verify-otp');
    } catch (error) {
      showError(error);
    }
  }

  // -----------------------------
  // OTP verification handler
  // -----------------------------
  async function handleVerifyOtp(data: OtpValues) {
    setServerError('');

    try {
      const response = await authClient.signIn.emailOtp({
        email,
        otp: data.otp,
      });

      if (!response.data?.user) throw new Error(response.error?.message);

      onClose();
    } catch (error) {
      showError(error);
    }
  }

  // -----------------------------
  // Resend OTP handler
  // -----------------------------
  async function handleResendOtp() {
    if (resending) return;

    setResending(true);
    setServerError('');
    setResendMessage('');

    try {
      const response = await sendOtp(email);

      if (!response.data?.success) throw new Error(response.error?.message);

      setResendMessage('A new verification code has been sent.');

      otpForm.reset();
    } catch (error) {
      showError(error);
    } finally {
      setResending(false);
    }
  }

  const handleEmailChange = () => {
    changeView('send-otp');
  };

  const toggleAuthModal = useSidebar((state) => state.toggleAuthModal);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) toggleAuthModal();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={toggleAuthModal}
          // onClick={onClose}
          aria-label="Close authentication modal"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          {/* SEND OTP */}
          {view === 'send-otp' && (
            <>
              <div className={styles.heading}>
                <h2 id="auth-title">Log in or sign up</h2>
                <p>
                  You’ll get smarter responses and can upload files, images, and
                  more.
                </p>
              </div>

              <form onSubmit={signInForm.handleSubmit(handleEmail)} noValidate>
                <div className={styles.field}>
                  <label htmlFor="signin-email">Email address</label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    {...signInForm.register('email')}
                    aria-invalid={!!signInForm.formState.errors.email}
                  />
                  {signInForm.formState.errors.email && (
                    <span className={styles.fieldError}>
                      {signInForm.formState.errors.email.message}
                    </span>
                  )}
                </div>

                {serverError && (
                  <p className={styles.serverError}>{serverError}</p>
                )}

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={signInForm.formState.isSubmitting}
                >
                  {signInForm.formState.isSubmitting
                    ? 'Sending code...'
                    : 'Continue with email'}
                </button>
              </form>
            </>
          )}

          {/* OTP VERIFICATION */}
          {view === 'verify-otp' && (
            <>
              <div className={styles.heading}>
                <h2 id="auth-title">Check your email</h2>
                <p>
                  We've sent a verification code to
                  <strong className={styles.emailAddress}>{email}</strong>
                </p>
              </div>

              <div className={styles.changeEmail}>
                <p>Wrong email?</p>
                <button type="button" onClick={handleEmailChange}>
                  Change email address
                </button>
              </div>

              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} noValidate>
                <div className={styles.field}>
                  <label htmlFor="otp">Verification code</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter verfication code"
                    className={styles.otpInput}
                    {...otpForm.register('otp')}
                    aria-invalid={!!otpForm.formState.errors.otp}
                    onChange={(event) => {
                      const value = event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 6);

                      otpForm.setValue('otp', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />

                  {otpForm.formState.errors.otp && (
                    <span className={styles.fieldError}>
                      {otpForm.formState.errors.otp.message}
                    </span>
                  )}
                </div>

                {serverError && (
                  <p className={styles.serverError}>{serverError}</p>
                )}

                {resendMessage && (
                  <p className={styles.successMessage}>{resendMessage}</p>
                )}

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={otpForm.formState.isSubmitting}
                >
                  {otpForm.formState.isSubmitting
                    ? 'Verifying...'
                    : 'Verify email'}
                </button>
              </form>

              <div className={styles.resendText}>
                Didn't receive a code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          By signing up or logging in, you consent to Kivo's Terms of Use and
          Privacy Policy.
        </div>
      </section>
    </div>
  );
}
