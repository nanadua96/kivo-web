import type { Metadata } from "next";
import { FaqClient } from "./FaqClient";

export const metadata: Metadata = {
  title: "Help & FAQ | Kivo",
  description: "Answers to common questions about Kivo.",
};

export default function FaqPage() {
  return <FaqClient supportEmail={process.env.NEXT_PUBLIC_SUPPORT_EMAIL} />;
}
