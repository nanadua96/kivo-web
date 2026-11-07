import { redirect } from 'next/navigation';
import VerifyOtpForm from './verify-otp-form';

type Props = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function VerifyOtpContent({ searchParams }: Props) {
  const { email } = await searchParams;

  console.log('[VerifyOtpContent]', await searchParams);

  if (!email) {
    redirect('/login');
  }

  return <VerifyOtpForm email={email} />;
}
