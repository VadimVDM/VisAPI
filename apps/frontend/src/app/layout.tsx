import './global.css';
import { AuthProvider } from '../components/auth/AuthProvider';

export const metadata = {
  title: 'VisAPI Admin Dashboard',
  description: 'VisAPI workflow automation admin dashboard',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
