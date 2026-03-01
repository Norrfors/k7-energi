import type { Metadata } from "next";
import "./globals.css";

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
  const version = "0.55"; // TODO: Injicera från build-tid
  
  return (
    <html lang="sv">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Krokgatan 7 - {version}</h1>
            <p className="text-sm text-gray-500">🏠 Hem Dashboard</p>
          </div>
        </header>

        {/* Sidinnehållet renderas här */}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
