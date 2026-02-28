"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/stocks",
    label: "Stocks",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 15a4 4 0 0 0-8 0v1h8v-1ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM16 15h1v-1a3 3 0 0 0-2.33-2.91A5.02 5.02 0 0 1 16 15ZM4 15H3v-1a3 3 0 0 1 2.33-2.91A5.02 5.02 0 0 0 4 15Z" />
        <path fillRule="evenodd" d="M3 4.5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 4.5Zm0 3a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 7.5Zm0 3a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/members",
    label: "Members",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
      </svg>
    ),
  },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-100 px-4 dark:border-zinc-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white dark:text-zinc-900">
            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm4.75 11.25a.75.75 0 0 0 1.5 0v-2.546l.943 1.048a.75.75 0 1 0 1.114-1.004l-2.25-2.5a.75.75 0 0 0-1.114 0l-2.25 2.5a.75.75 0 1 0 1.114 1.004l.943-1.048v2.546Z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Database</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
              }`}
            >
              <span className={active ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500"}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
