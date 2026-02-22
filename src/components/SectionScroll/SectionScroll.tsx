import { useEffect, type ReactNode } from 'react';
import { useSectionScroll } from '../../hooks/useSectionScroll';
import styles from './SectionScroll.module.css';

interface Props {
  children: ReactNode[];
  onSectionChange?: (index: number) => void;
}

export default function SectionScroll({ children, onSectionChange }: Props) {
  const sections = Array.isArray(children) ? children : [children];
  const { current, containerRef, scrollTo } = useSectionScroll(sections.length);

  useEffect(() => {
    onSectionChange?.(current);
  }, [current, onSectionChange]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div
        className={styles.track}
        style={{ transform: `translateY(-${current * 100}vh)` }}
      >
        {sections.map((child, i) => (
          <section key={i} className={styles.section}>
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
