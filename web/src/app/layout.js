"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
const link_1 = __importDefault(require("next/link")); // Import Link for client-side navigation
require("./globals.css"); // Tailwind CSS is imported here
const inter = (0, google_1.Inter)({ subsets: ['latin'] });
exports.metadata = {
    title: 'tgcf Web UI',
    description: 'A web interface for configuring tgcf',
};
function RootLayout({ children, }) {
    return (<html lang="en" className="dark"> {/* Defaulting to dark theme as an example */}
      <body className={`${inter.className} bg-gray-900 text-gray-100 min-h-screen flex flex-col`}>
        <header className="bg-gray-800 shadow-md">
          <nav className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <link_1.default href="/" className="text-xl font-semibold text-white">
                tgcf Web UI
              </link_1.default>
              {/* Navigation links using Next.js Link component */}
              <div className="space-x-4">
                <link_1.default href="/" className="text-gray-300 hover:text-white">Welcome</link_1.default>
                <link_1.default href="/login" className="text-gray-300 hover:text-white">Login</link_1.default>
                <link_1.default href="/config/admins" className="text-gray-300 hover:text-white">Admins</link_1.default>
                <link_1.default href="/config/connections" className="text-gray-300 hover:text-white">Connections</link_1.default>
                <link_1.default href="/config/plugins" className="text-gray-300 hover:text-white">Plugins</link_1.default>
                <link_1.default href="#" className="text-gray-300 hover:text-white">Run</link_1.default>
                <link_1.default href="/config/advanced" className="text-gray-300 hover:text-white">Advanced</link_1.default>
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
    </html>);
}
