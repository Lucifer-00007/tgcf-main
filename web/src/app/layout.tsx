import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link'; // Import Link for client-side navigation
import './globals.css'; // Tailwind CSS is imported here

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'tgcf Web UI',
  description: 'A web interface for configuring tgcf',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Defaulting to dark theme as an example */}
      <body className={`${inter.className} bg-gray-900 text-gray-100 min-h-screen flex flex-col`}>
        <header className="bg-gray-800 shadow-md">
          <nav className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-semibold text-white">
                tgcf Web UI
              </Link>
              {/* Navigation links using Next.js Link component */}
              <div className="space-x-4">
                <Link href="/" className="text-gray-300 hover:text-white">Welcome</Link>
                <Link href="/login" className="text-gray-300 hover:text-white">Login</Link>
                <Link href="/config/admins" className="text-gray-300 hover:text-white">Admins</Link>
                <Link href="/config/connections" className="text-gray-300 hover:text-white">Connections</Link>
                <Link href="/config/plugins" className="text-gray-300 hover:text-white">Plugins</Link>
                <Link href="#" className="text-gray-300 hover:text-white">Run</Link>
                <Link href="/config/advanced" className="text-gray-300 hover:text-white">Advanced</Link>
              </div>
            </div>
          </nav>
        </header>
        <main className="flex-grow container mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="bg-gray-800 text-center text-sm text-gray-400 py-4 mt-auto">
          tgcf Web UI - modern configuration for tgcf
        </footer>
      </body>
    </html>
  );
}
