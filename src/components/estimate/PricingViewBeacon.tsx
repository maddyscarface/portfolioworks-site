"use client";
import { useEffect, useRef } from "react";
import { recordPricingView } from "@/lib/estimate/pricing-views";

/**
 * Drop next to any price guide, pricing table or calculator result. Counts a view once the
 * block is at least half on screen, so "saw pricing" means they actually scrolled to it.
 */
export function PricingViewBeacon({ where }: { where: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el || typeof IntersectionObserver === "undefined") { recordPricingView(where); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting && (e.intersectionRatio >= 0.25 || e.intersectionRect.height >= 240))) { recordPricingView(where); io.disconnect(); }
    }, { threshold: [0, 0.1, 0.25] });
    io.observe(el);
    return () => io.disconnect();
  }, [where]);
  return <span ref={ref} hidden aria-hidden data-pricing-beacon={where} />;
}
