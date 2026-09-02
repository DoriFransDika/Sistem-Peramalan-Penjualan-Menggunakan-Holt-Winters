import { useEffect, useState } from 'react';
import Dropdown from '@/Components/Dropdown';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

export default function TranslateWidget() {
    const [currentLang, setCurrentLang] = useState('ORIGIN');

    useEffect(() => {
        // Prevent multiple script insertions
        if (!document.getElementById('google-translate-script')) {
            window.googleTranslateElementInit = () => {
                new window.google.translate.TranslateElement(
                    {
                        pageLanguage: 'id',
                        includedLanguages: 'id,en',
                        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                        autoDisplay: false,
                    },
                    'google_translate_element'
                );
            };

            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.type = 'text/javascript';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        }

        // Cek cookie google translate untuk set bahasa awal
        const match = document.cookie.match(/(?:^|;)\s*googtrans=([^;]*)/);
        if (match && match[1]) {
            const lang = match[1].split('/').pop();
            if (lang && lang.toLowerCase() !== 'id' && lang.toLowerCase() !== 'auto') {
                setCurrentLang(lang.toUpperCase());
            } else if (lang && lang.toLowerCase() === 'id') {
                setCurrentLang('ID');
            } else {
                setCurrentLang('ORIGIN');
            }
        } else {
            setCurrentLang('ORIGIN');
        }

        // Hapus banner Google Translate yang menutupi header (ringan, tanpa MutationObserver)
        const removeBanner = () => {
            const bannerFrames = document.querySelectorAll('.goog-te-banner-frame, iframe.skiptranslate');
            bannerFrames.forEach(frame => {
                frame.style.display = 'none';
            });
            document.body.style.top = '0px';
        };

        // Jalankan beberapa kali dengan delay agar menangkap banner yang muncul terlambat
        removeBanner();
        const t1 = setTimeout(removeBanner, 500);
        const t2 = setTimeout(removeBanner, 1500);
        const t3 = setTimeout(removeBanner, 3000);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    const changeLanguage = (langCode) => {
        if (langCode === 'ORIGIN') {
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        } else {
            const cookieValue = `/auto/${langCode.toLowerCase()}`;
            document.cookie = `googtrans=${cookieValue}; path=/;`;
            document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;
        }
        
        window.location.reload();
    };

    return (
        <>
            {/* Widget bawaan Google disembunyikan agar kita bisa pakai UI kustom */}
            <div id="google_translate_element" className="absolute opacity-0 pointer-events-none -z-50"></div>

            <Dropdown>
                <Dropdown.Trigger>
                    <button
                        type="button"
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#C9D4E3] bg-[#FAFBFD] px-3 text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out hover:border-emerald-300/70 hover:bg-[#F4FAF8] hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)] active:scale-[0.98] dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-200 dark:shadow-none dark:hover:border-emerald-500/35 dark:hover:bg-slate-800/90"
                    >
                        <GlobeAltIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold">{currentLang === 'ORIGIN' ? 'ASLI' : currentLang}</span>
                    </button>
                </Dropdown.Trigger>

                <Dropdown.Content align="right" width="48" contentClasses="py-1 bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5">
                    <button
                        type="button"
                        onClick={() => changeLanguage('ORIGIN')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                            currentLang === 'ORIGIN' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-700/50 dark:text-emerald-400 font-semibold' 
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        ☕ Origin (Asli)
                    </button>
                    <button
                        type="button"
                        onClick={() => changeLanguage('ID')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                            currentLang === 'ID' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-700/50 dark:text-emerald-400 font-semibold' 
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        🇮🇩 Indo
                    </button>
                    <button
                        type="button"
                        onClick={() => changeLanguage('EN')}
                        className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                            currentLang === 'EN' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-slate-700/50 dark:text-emerald-400 font-semibold' 
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        🇬🇧 Inggris
                    </button>
                </Dropdown.Content>
            </Dropdown>
        </>
    );
}
