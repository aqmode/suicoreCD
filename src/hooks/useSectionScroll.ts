import { useState, useEffect, useCallback, useRef } from 'react';

export function useSectionScroll(totalSections: number) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);
  const cooldownMs = 900;

  const scrollTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSections || scrollingRef.current) return;
      scrollingRef.current = true;
      setCurrent(index);
      setTimeout(() => {
        scrollingRef.current = false;
      }, cooldownMs);
    },
    [totalSections]
  );

  const next = useCallback(() => scrollTo(current + 1), [current, scrollTo]);
  const prev = useCallback(() => scrollTo(current - 1), [current, scrollTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scrollingRef.current) return;

      if (e.deltaY > 0) scrollTo(current + 1);
      else if (e.deltaY < 0) scrollTo(current - 1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollTo(current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollTo(current - 1);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [current, scrollTo]);

  const reset = useCallback(() => {
    scrollingRef.current = false;
    setCurrent(0);
  }, []);

  return { current, scrollTo, next, prev, reset, containerRef };
}
