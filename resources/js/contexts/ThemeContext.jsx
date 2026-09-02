import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState('dark');

    const applyDom = useCallback((value) => {
        const isDark = value === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        window.dispatchEvent(new CustomEvent('themechange', { detail: value }));
    }, []);

    useEffect(() => {
        let initial = 'dark';
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') initial = stored;
        } catch {
            initial = 'dark';
        }
        setThemeState(initial);
        applyDom(initial);
    }, [applyDom]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key !== STORAGE_KEY || !e.newValue) return;
            if (e.newValue === 'light' || e.newValue === 'dark') {
                setThemeState(e.newValue);
                applyDom(e.newValue);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [applyDom]);

    const setTheme = useCallback(
        (next) => {
            const value = next === 'light' ? 'light' : 'dark';
            try {
                localStorage.setItem(STORAGE_KEY, value);
            } catch {
                /* ignore */
            }
            setThemeState(value);
            applyDom(value);
        },
        [applyDom],
    );

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [setTheme, theme]);

    const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
