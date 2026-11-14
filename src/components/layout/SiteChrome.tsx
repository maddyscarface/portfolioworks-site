"use client";
import { usePathname } from "next/navigation";

/** Hides the marketing header/footer and the tracking/consent layer on private customer walkthrough links (/w/...) and staff admin pages, which run as focused apps. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (p?.startsWith("/w/") || p?.startsWith("/admin")) return null;
  return <>{children}</>;
}
