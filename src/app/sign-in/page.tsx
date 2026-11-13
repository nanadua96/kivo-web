import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in | Kivo",
  description: "Sign in to Kivo with your email.",
};

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

async function SignInPageContent({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main>
      <SignInForm
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
      />
    </main>
  );
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <Suspense
      fallback={
        <main>
          <p>Loading...</p>
        </main>
      }
    >
      <SignInPageContent searchParams={searchParams} />
    </Suspense>
  );
}
