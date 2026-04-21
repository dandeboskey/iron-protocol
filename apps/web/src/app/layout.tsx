import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Iron Protocol",
  description: "Deterministic strength programming engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-iron-950">
        <div className="flex flex-col min-h-screen">
          <Nav />
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
