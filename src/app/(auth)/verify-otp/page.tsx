import { Suspense } from 'react';
import VerifyOtpContent from './verify-otp-content';

type Props = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function VerifyOtpPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<p>Loading verification...</p>}>
      <VerifyOtpContent searchParams={searchParams} />
    </Suspense>
  );
}
