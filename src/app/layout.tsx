import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/context/LanguageContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { ToastProvider } from '@/context/ToastContext';
import { BotStatusProvider } from '@/context/BotStatusContext';

export const metadata: Metadata = {
  title: 'SakuKu',
  description:
    'SakuKu - Modern Multi-Wallet Personal Finance Management Dashboard with WhatsApp Bot Integration via Baileys & Scheduled Cron Reminders.',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-white dark:bg-gray-950">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <ConfirmProvider>
              <ToastProvider>
                <BotStatusProvider>{children}</BotStatusProvider>
              </ToastProvider>
            </ConfirmProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
