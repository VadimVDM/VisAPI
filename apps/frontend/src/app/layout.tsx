import './global.css';
import { AuthProvider } from '../components/auth/AuthProvider';

export const metadata = {
  title: 'VisAPI Admin Dashboard',
  description: 'VisAPI workflow automation admin dashboard',
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
