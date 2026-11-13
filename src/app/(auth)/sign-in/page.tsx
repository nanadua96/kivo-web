import type { Metadata } from "next";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in | Kivo",
  description: "Sign in to Kivo with your email.",
};

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main>
      <SignInForm
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
      />
    </main>
  );
}
