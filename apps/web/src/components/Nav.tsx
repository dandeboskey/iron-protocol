"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/checkin", label: "Check-In", icon: "♥" },
  { href: "/workout", label: "Workout", icon: "⚡" },
  { href: "/block", label: "Block", icon: "▦" },
  { href: "/history", label: "History", icon: "◷" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block border-b border-iron-800 bg-iron-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-accent">IRON</span>
              <span className="text-iron-300 ml-1">PROTOCOL</span>
            </Link>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-iron-800 text-white"
                      : "text-iron-400 hover:text-iron-200 hover:bg-iron-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/profile"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/profile"
                    ? "bg-iron-800 text-white"
                    : "text-iron-400 hover:text-iron-200 hover:bg-iron-900"
                }`}
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile header */}
      <div className="md:hidden border-b border-iron-800 bg-iron-950 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-accent">IRON</span>
          <span className="text-iron-300 ml-1">PROTOCOL</span>
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-iron-950 border-t border-iron-800 z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg min-w-[60px] transition-colors ${
                pathname === item.href
                  ? "text-accent"
                  : "text-iron-500 active:text-iron-300"
              }`}
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
