"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Bloque que aparece (.reveal → .in) la primera vez que entra en pantalla.
export function Reveal({
  as: Tag = "section",
  className = "",
  "aria-hidden": ariaHidden,
  children,
}: {
  as?: "section" | "div";
  className?: string;
  "aria-hidden"?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={("reveal " + className).trim()} aria-hidden={ariaHidden}>
      {children}
    </Tag>
  );
}
