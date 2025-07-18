import './global.css';
import { AuthProvider } from '../components/auth/AuthProvider';
import { ThemeProvider } from '../components/theme-provider';

export const metadata = {
  title: 'VisAPI Admin Dashboard',
  description: 'VisAPI workflow automation admin dashboard',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
