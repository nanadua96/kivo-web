import type { Metadata } from 'next';
import { Inter_Tight } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const fontPrimary = Inter_Tight({
  variable: '--font-primary',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kivo: Your AI Assistant for Chat, Creativity, Work & Code',
  description:
    'Discover Kivo, your all-in-one AI assistant. Ask questions, write content, get work done, and build with code—all in one place. Start for free.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fontPrimary.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
