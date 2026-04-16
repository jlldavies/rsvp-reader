import { useEffect } from 'react';
import { useReaderStore } from '../stores/reader-store';

export function useTheme() {
  const theme = useReaderStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;

    function apply(isDark: boolean) {
      root.classList.toggle('dark', isDark);
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      apply(theme === 'dark');
    }
  }, [theme]);
}
