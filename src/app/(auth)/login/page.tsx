import Link from 'next/link';
import AuthForm from '@/components/auth/auth-form';

export default function LoginPage() {
  return (
    <main>
      <h1>Welcome back</h1>
      <AuthForm mode="login" />
      <p>
        Don't have an account? <Link href="/signup">Create an account</Link>
      </p>
    </main>
  );
}
