"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

let activeElement: HTMLElement | null = null;

function setElementLoading(element: HTMLElement | null) {
  if (!element) return;

  activeElement?.removeAttribute("data-loading-active");
  activeElement = element;
  activeElement.setAttribute("data-loading-active", "true");
}

function clearElementLoading() {
  activeElement?.removeAttribute("data-loading-active");
  activeElement = null;
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
    clearElementLoading();
  }, [pathname]);

  useEffect(() => {
    if (!pending) return;

    const timeout = window.setTimeout(() => {
      setPending(false);
      clearElementLoading();
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  useEffect(() => {
    function shouldIgnoreLink(anchor: HTMLAnchorElement) {
      const href = anchor.getAttribute("href");

      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return true;
      }

      const url = new URL(href, window.location.href);
      const isSamePage =
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search;

      return url.origin !== window.location.origin || isSamePage;
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor || shouldIgnoreLink(anchor)) return;

      setElementLoading(anchor);
      setPending(true);
    }

    function handleSubmit(event: SubmitEvent) {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || target.target === "_blank") return;

      const submitter = event.submitter;
      setElementLoading(submitter instanceof HTMLElement ? submitter : target.querySelector("button[type='submit'], button:not([type])"));
      setPending(true);
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50" aria-live="polite" aria-label="Cargando">
      <div className="h-1 w-full overflow-hidden bg-mint">
        <div className="h-full w-1/2 animate-[loading-slide_1s_ease-in-out_infinite] bg-maize" />
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white shadow-soft">
        <Loader2 className="animate-spin" size={16} aria-hidden />
        Cargando...
      </div>
    </div>
  );
}
