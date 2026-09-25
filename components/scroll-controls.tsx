"use client";

import { useEffect, useState } from "react";

export function ScrollControls() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(true);

  useEffect(() => {
    const syncButtons = () => {
      const scrollTop = window.scrollY;
      const viewport = window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight;

      setShowTop(scrollTop > 240);
      setShowBottom(scrollTop + viewport < totalHeight - 240);
    };

    syncButtons();
    window.addEventListener("scroll", syncButtons, { passive: true });
    window.addEventListener("resize", syncButtons);

    return () => {
      window.removeEventListener("scroll", syncButtons);
      window.removeEventListener("resize", syncButtons);
    };
  }, []);

  return (
    <div className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2">
      <button
        aria-label="Scroll to top"
        className={`rounded-full border border-[color:var(--border)] bg-black/60 p-2 text-[color:var(--accent)] shadow-lg shadow-black/25 backdrop-blur transition hover:bg-[color:var(--accent-soft)] ${showTop ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        type="button"
      >
        ↑
      </button>
      <button
        aria-label="Scroll to bottom"
        className={`rounded-full border border-[color:var(--border)] bg-black/60 p-2 text-[color:var(--accent)] shadow-lg shadow-black/25 backdrop-blur transition hover:bg-[color:var(--accent-soft)] ${showBottom ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() =>
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          })
        }
        type="button"
      >
        ↓
      </button>
    </div>
  );
}
