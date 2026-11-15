import type { Metadata } from "next";
import { Suspense } from "react";
import SignUpForm from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign up | Kivo",
  description: "Create your Kivo account.",
};

type SignUpPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

async function SignUpPageContent({ searchParams }: SignUpPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main>
      <SignUpForm
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
      />
    </main>
  );
}

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <Suspense
      fallback={
        <main>
          <p>Loading...</p>
        </main>
      }
    >
      <SignUpPageContent searchParams={searchParams} />
    </Suspense>
  );
}
