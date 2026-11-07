import { signUpAction } from '@/app/(auth)/actions/auth';

export default function SignUpPage() {
  return (
    <div>
      <h1>Sign Up</h1>
      <form action={signUpAction}>
        <input type="text" name="name" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
