import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Layout = omsluter ALLA sidor. Tänk det som en master page i ASP.NET.
// Här lägger du saker som ska finnas överallt: header, footer, etc.

export const metadata: Metadata = {
  title: "Hem Dashboard",
  description: "Smarthemdata från Homey Pro",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ⭐ HÅRDKODAD VERSION - uppdateras vid varje release
  const version = "v0.84";
  
  return (
    <html lang="sv">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
            <h1 className="text-lg sm:text-2xl font-bold">Krokgatan 7 – {version}</h1>
            <p className="text-xs sm:text-sm text-gray-500">🏠 Hem Dashboard</p>
          </div>
        </header>

        {/* Sidinnehållet renderas här */}
        <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
