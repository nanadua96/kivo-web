import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Kivo: Chat, Work, Create & Code with AI',
  description:
    'Use Kivo to answer questions, write, create images, complete work, and code—all in one place. Get started for free or download the app.',
};

// export default function RootLayout({ children }: LayoutProps<"/">) {
//   return (
//     <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
//       <body>{children}</body>
//     </html>
//   );
// }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
