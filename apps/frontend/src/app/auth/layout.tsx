import { VisanetLogo } from '@/components/ui/visanet-logo';
import Link from 'next/link';
import { ThemeToggleAnimated } from '@/components/ui/theme-toggle-animated';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="w-full border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <VisanetLogo width={140} height={40} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Theme toggle - fixed position like in adf99f0 */}
      <ThemeToggleAnimated />
    </div>
  );
}
