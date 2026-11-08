'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import styles from './AuthModal.module.css';

// -----------------------------
// Validation schemas
// -----------------------------
const zEmail = z.email({
  pattern:
    /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i,
});

const signInSchema = z.object({
  email: zEmail,
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: zEmail,
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Enter the 6-digit verification code')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type OtpValues = z.infer<typeof otpSchema>;

type AuthView = 'signin' | 'signup' | 'otp';

type AuthModalProps = {
  onClose: () => void;

  // Call your Better Auth functions here.
  // Resolve after successfully requesting the OTP.
  onSignIn: (data: SignInValues) => Promise<void>;

  onSignUp: (data: SignUpValues) => Promise<void>;

  onVerifyOtp: (data: { email: string; otp: string }) => Promise<void>;

  onResendOtp?: (email: string) => Promise<void>;
};

export default function AuthModal({
  onClose,
  onSignIn,
  onSignUp,
  onVerifyOtp,
  onResendOtp,
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>('signin');
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

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '' },
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

  // -----------------------------
  // Helpers
  // -----------------------------

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

  // -----------------------------
  // Sign in handler
  // -----------------------------

  async function handleSignIn(data: SignInValues) {
    setServerError('');

    console.log(data);

    try {
      await onSignIn(data);

      setEmail(data.email);

      const response = await authClient.emailOtp.sendVerificationOtp({
        email: data.email,
        type: 'sign-in',
      });

      if (!response.data?.success) throw new Error(response.error?.message);

      otpForm.reset();
      changeView('otp');
    } catch (error) {
      showError(error);
    }
  }

  // -----------------------------
  // Sign up handler
  // -----------------------------

  async function handleSignUp(data: SignUpValues) {
    setServerError('');

    try {
      await onSignUp(data);
      setEmail(data.email);

      const response = await authClient.emailOtp.sendVerificationOtp({
        email: data.email,
        type: 'sign-in',
      });

      if (!response.data?.success) throw new Error(response.error?.message);

      otpForm.reset();
      changeView('otp');
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
      //   await onVerifyOtp({
      //     email,
      //     otp: data.otp,
      //   });

      const response = await authClient.signIn.emailOtp({
        email,
        otp: data.otp,
        name: signUpForm.getValues('name'),
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
    if (!onResendOtp || resending) return;

    setResending(true);
    setServerError('');
    setResendMessage('');

    try {
      await onResendOtp(email);
      setResendMessage('A new verification code has been sent.');
      otpForm.reset();
    } catch (error) {
      showError(error);
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
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
          onClick={onClose}
          aria-label="Close authentication modal"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.brandIcon}>W</div>
            <span>Welcome</span>
          </div>

          {/* SIGN IN */}
          {view === 'signin' && (
            <>
              <div className={styles.heading}>
                <h2 id="auth-title">Log in or sign up</h2>
                <p>
                  You’ll get smarter responses and can upload files, images, and
                  more.
                </p>
              </div>

              <form onSubmit={signInForm.handleSubmit(handleSignIn)} noValidate>
                <div className={styles.field}>
                  <label htmlFor="signin-email">Email address</label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
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

              <div className={styles.switchText}>
                Don't have an account?{' '}
                <button type="button" onClick={() => changeView('signup')}>
                  Sign up
                </button>
              </div>
            </>
          )}

          {/* SIGN UP */}
          {view === 'signup' && (
            <>
              <div className={styles.heading}>
                <h2 id="auth-title">Create an account</h2>
                <p>Join us and get started in just a few steps.</p>
              </div>

              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} noValidate>
                <div className={styles.field}>
                  <label htmlFor="signup-name">Full name</label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    {...signUpForm.register('name')}
                    aria-invalid={!!signUpForm.formState.errors.name}
                  />
                  {signUpForm.formState.errors.name && (
                    <span className={styles.fieldError}>
                      {signUpForm.formState.errors.name.message}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="signup-email">Email address</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...signUpForm.register('email')}
                    aria-invalid={!!signUpForm.formState.errors.email}
                  />
                  {signUpForm.formState.errors.email && (
                    <span className={styles.fieldError}>
                      {signUpForm.formState.errors.email.message}
                    </span>
                  )}
                </div>

                {serverError && (
                  <p className={styles.serverError}>{serverError}</p>
                )}

                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={signUpForm.formState.isSubmitting}
                >
                  {signUpForm.formState.isSubmitting
                    ? 'Creating account...'
                    : 'Create account'}
                </button>
              </form>

              <div className={styles.switchText}>
                Already have an account?{' '}
                <button type="button" onClick={() => changeView('signin')}>
                  Sign in
                </button>
              </div>
            </>
          )}

          {/* OTP VERIFICATION */}
          {view === 'otp' && (
            <>
              <div className={styles.otpIcon}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </div>

              <div className={styles.heading}>
                <h2 id="auth-title">Check your email</h2>
                <p>
                  We've sent a verification code to
                  <strong className={styles.emailAddress}>{email}</strong>
                </p>
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
                    placeholder="000000"
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
                  disabled={!onResendOtp || resending}
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>

              <button
                type="button"
                className={styles.backButton}
                onClick={() => changeView('signin')}
              >
                <span aria-hidden="true">←</span> Back to sign in
              </button>
            </>
          )}
        </div>

        <div className={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </section>
    </div>
  );
}
