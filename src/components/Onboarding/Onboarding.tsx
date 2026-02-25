import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSpotify } from '../../context/SpotifyContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { getBrowseWithoutAuth, FORCE_ONBOARDING_AFTER_LOGIN_KEY } from '../../pages/AuthRequiredPage/AuthRequiredPage';
import * as api from '../../lib/api';
import styles from './Onboarding.module.css';

type StepAction = 'navigate' | 'click' | 'scroll' | 'complete';

interface Step {
  text: string;
  target: string | null;
  action: StepAction;
  /** Для navigate — ожидаемый path. Для scroll — элемент, появление которого в viewport считаем «прокрутил». */
  expectedPath?: string;
}

const DESKTOP_STEPS: Step[] = [
  { text: 'Перейдите в каталог', target: 'nav-catalog', action: 'navigate', expectedPath: '/catalog' },
  { text: 'Выберите альбом Disk of Nature', target: 'release-disk-of-nature', action: 'navigate', expectedPath: 'release-disk' },
  { text: 'Прокрутите вниз к списку треков', target: 'scroll-to-tracks', action: 'scroll' },
  { text: 'Добавьте трек Summer Delight в корзину — нажмите на цену', target: 'track-summer-delight-cart', action: 'click' },
  { text: 'Перейдите в корзину', target: 'nav-basket', action: 'navigate', expectedPath: '/basket' },
  { text: 'Вы теперь умеете пользоваться сайтом.', target: null, action: 'complete' },
];

const MOBILE_STEPS: Step[] = [
  { text: 'Нажмите на меню (три полоски)', target: 'nav-menu', action: 'click' },
  { text: 'В меню выберите Catalog', target: 'nav-catalog-mobile', action: 'click' },
  { text: 'Выберите альбом Disk of Nature', target: 'release-disk-of-nature', action: 'navigate', expectedPath: 'release-disk' },
  { text: 'Прокрутите вниз к списку треков', target: 'scroll-to-tracks', action: 'scroll' },
  { text: 'Добавьте Summer Delight в корзину — нажмите на цену трека', target: 'track-summer-delight-cart', action: 'click' },
  { text: 'Откройте меню', target: 'nav-menu', action: 'click' },
  { text: 'Выберите Basket в меню', target: 'nav-basket-mobile', action: 'click' },
  { text: 'Вы теперь умеете пользоваться сайтом.', target: null, action: 'complete' },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { releases } = useSpotify();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);
  const [done, setDone] = useState(false);
  const prevPathRef = useRef(location.pathname + location.search);

  const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const diskOfNatureId = releases.find((r) => r.name.toLowerCase().includes('disk of nature'))?.id;

  const forceOnboardingOrigin = import.meta.env.VITE_ONBOARDING_ALWAYS_ORIGIN as string | undefined;
  const isForceOnboarding = (() => {
    try {
      if (!forceOnboardingOrigin || typeof window === 'undefined') return false;
      return window.location?.origin === forceOnboardingOrigin;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (getBrowseWithoutAuth()) {
      setVisible(false);
      setLoading(false);
      return;
    }
    if (isForceOnboarding) {
      setVisible(true);
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      setVisible(false);
      return;
    }
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(FORCE_ONBOARDING_AFTER_LOGIN_KEY) === '1') {
        sessionStorage.removeItem(FORCE_ONBOARDING_AFTER_LOGIN_KEY);
        setVisible(true);
        setLoading(false);
        return;
      }
    } catch {
      /* ignore */
    }
    let cancelled = false;
    api.apiGetProfile().then(({ data }) => {
      if (cancelled || !data) return;
      const needDesktop = !(data.onboarding_desktop_done === true);
      const needMobile = !(data.onboarding_mobile_done === true);
      if (isMobile && needMobile) setVisible(true);
      else if (!isMobile && needDesktop) setVisible(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, isMobile, isForceOnboarding]);

  const advanceStep = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  const isStepComplete = (): boolean => {
    if (!step) return false;
    if (step.action === 'complete') return false;
    if (step.action === 'navigate' && step.expectedPath) {
      if (step.expectedPath === '/catalog') return location.pathname === '/catalog';
      if (step.expectedPath === '/basket') return location.pathname === '/basket';
      if (step.expectedPath === 'release-disk') return Boolean(diskOfNatureId && location.pathname === `/release/${diskOfNatureId}`);
    }
    return false;
  };

  // Проверка навигации: пользователь только что перешёл на нужную страницу (не повторять при повторном срабатывании эффекта)
  useEffect(() => {
    if (!visible || !step || step.action !== 'navigate' || !step.expectedPath) return;
    const currentKey = location.pathname + location.search;
    const justArrived = prevPathRef.current !== currentKey;
    prevPathRef.current = currentKey;
    if (!justArrived) return;
    if (isStepComplete()) advanceStep();
  }, [visible, step?.action, step?.expectedPath, location.pathname, location.search, diskOfNatureId]);

  // Проверка прокрутки: секция треков появилась во viewport (десктоп — смена секции, мобильный — скролл)
  useEffect(() => {
    if (!visible || !step || step.action !== 'scroll') return;
    const trackSectionEl = document.querySelector('[data-onboarding="track-section"]');
    if (!trackSectionEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) advanceStep();
      },
      { threshold: 0.15, rootMargin: '0px' }
    );
    observer.observe(trackSectionEl);
    return () => observer.disconnect();
  }, [visible, stepIndex, step?.action, location.pathname]);

  // Проверка клика: пользователь нажал на подсвеченный элемент
  useEffect(() => {
    if (!visible || !step?.target || step.action !== 'click') return;
    const targetSel = `[data-onboarding="${step.target}"]`;
    const handler = (e: MouseEvent) => {
      const el = document.querySelector(targetSel);
      if (el && (el === e.target || el.contains(e.target as Node))) {
        advanceStep();
        // Не вызываем stopPropagation, чтобы клик дошёл до элемента (меню открылось, переход по ссылке и т.д.)
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [visible, stepIndex, step?.target, step?.action]);

  useEffect(() => {
    if (!visible || !step) return;
    const targetSel = step.target ? `[data-onboarding="${step.target}"]` : null;
    const updateHighlight = () => {
      if (!targetSel) {
        setHighlight(null);
        return;
      }
      const el = document.querySelector(targetSel);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlight(new DOMRect(rect.x, rect.y, rect.width, rect.height));
      } else {
        setHighlight(null);
      }
    };
    updateHighlight();
    const interval = setInterval(updateHighlight, 150);
    return () => clearInterval(interval);
  }, [visible, step?.target, stepIndex, location.pathname]);

  const handleFinish = async () => {
    if (!step) return;
    if (step.action === 'complete') {
      if (!isForceOnboarding) {
        const key = isMobile ? 'onboarding_mobile_done' : 'onboarding_desktop_done';
        await api.apiUpdateProfile({ [key]: true });
      }
      setDone(true);
      setVisible(false);
      return;
    }
    advanceStep();
  };

  if (loading || !visible || done) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Обучение">
      {highlight && (
        <div
          className={styles.highlight}
          style={{
            top: highlight.y - 4,
            left: highlight.x - 4,
            width: highlight.width + 8,
            height: highlight.height + 8,
          }}
        />
      )}
      <div className={styles.card}>
        <p className={styles.text}>{step?.text}</p>
        {isLast ? (
          <button type="button" className={styles.btn} onClick={handleFinish}>
            Готово
          </button>
        ) : (
          <button type="button" className={styles.skipLink} onClick={handleFinish}>
            Пропустить шаг
          </button>
        )}
      </div>
    </div>
  );
}
