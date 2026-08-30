"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/transactions", label: "Transactions", icon: "📋" },
  { href: "/monthly", label: "Monthly Grid", icon: "📊" },
  { href: "/income", label: "Income & SIPs", icon: "💰" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-white/10 bg-neutral-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14 overflow-x-auto">
        <Link href="/" className="font-bold text-lg mr-4 whitespace-nowrap bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
          chiching 💸
        </Link>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-white text-neutral-900 font-medium"
                  : "text-neutral-300 hover:bg-white/10"
              )}
            >
              <span className="mr-1">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
