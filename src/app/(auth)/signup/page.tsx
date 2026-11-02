import Link from 'next/link';
import AuthForm from '@/components/auth/auth-form';

export default function SignupPage() {
  return (
    <main>
      <h1>Create an account</h1>

      <AuthForm mode="signup" />

      <p>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </main>
  );
}
