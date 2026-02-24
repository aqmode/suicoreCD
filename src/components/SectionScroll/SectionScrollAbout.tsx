import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSectionScroll } from '../../hooks/useSectionScroll';
import styles from './SectionScroll.module.css';

const FIRST_SECTION_VH = 100;

interface Props {
  children: ReactNode[];
  onSectionChange?: (index: number) => void;
}

export default function SectionScrollAbout({ children, onSectionChange }: Props) {
  const sections = Array.isArray(children) ? children : [children];
  const lastSectionRef = useRef<HTMLElement | null>(null);
  const [lastSectionHeightPx, setLastSectionHeightPx] = useState<number | null>(null);

  const measureLastSection = () => {
    const el = lastSectionRef.current;
    if (!el?.firstElementChild) return;
    const h = (el.firstElementChild as HTMLElement).offsetHeight;
    if (h > 0) setLastSectionHeightPx(h);
  };

  useEffect(() => {
    measureLastSection();
    const ro = new ResizeObserver(measureLastSection);
    const el = lastSectionRef.current;
    if (el?.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [sections]);

  const vhPx = typeof window !== 'undefined' ? window.innerHeight * 0.01 : 36;
  const firstSectionHeightPx = FIRST_SECTION_VH * vhPx;
  const lastH = lastSectionHeightPx ?? Math.round(72 * vhPx);
  const trackHeightPx = firstSectionHeightPx + lastH;
  const offsetPx = firstSectionHeightPx;

  const { current, containerRef, scrollTo } = useSectionScroll(sections.length);

  useEffect(() => {
    onSectionChange?.(current);
  }, [current, onSectionChange]);

  const isLastSection = current === sections.length - 1 && sections.length > 1;

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${styles.containerWithBg}`.trim()}
      style={
        isLastSection
          ? { height: `${lastH}px` }
          : undefined
      }
    >
      <div
        className={styles.track}
        style={{
          height: `${trackHeightPx}px`,
          transform: `translateY(-${current === 0 ? 0 : offsetPx}px)`,
        }}
      >
        {sections.map((child, i) => (
          <section
            key={i}
            ref={i === sections.length - 1 && sections.length > 1 ? lastSectionRef : undefined}
            className={
              i === sections.length - 1 && sections.length > 1
                ? `${styles.section} ${styles.sectionShort}`
                : styles.section
            }
            style={{
              height: i === sections.length - 1 && sections.length > 1 ? `${lastH}px` : `${FIRST_SECTION_VH}vh`,
            }}
          >
            {child}
          </section>
        ))}
      </div>

      {sections.length > 1 && (
        <div className={styles.dots}>
          {sections.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
              onClick={() => scrollTo(i)}
              aria-label={`Section ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
