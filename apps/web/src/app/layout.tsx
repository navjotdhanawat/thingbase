import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ThingBase - Open-Source IoT Platform for Developers',
  description: 'The open-source IoT platform for developers. Device management, real-time telemetry, and multi-tenant control. Connect, monitor, and manage your IoT devices at any scale.',
  keywords: ['IoT', 'Internet of Things', 'device management', 'MQTT', 'real-time', 'open source', 'telemetry'],
  authors: [{ name: 'ThingBase' }],
  openGraph: {
    title: 'ThingBase - Open-Source IoT Platform',
    description: 'Device management, real-time telemetry, and multi-tenant control for IoT developers.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="iot-theme"
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
