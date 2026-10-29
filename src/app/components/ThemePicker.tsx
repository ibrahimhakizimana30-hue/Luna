import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { getTheme, setTheme, THEMES, type LunaTheme } from '../theme';

// La lune de l'accueil : un appui ouvre le choix de l'apparence (Blanc, Noir, Congo)
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<LunaTheme>(getTheme);
  const boxRef = useRef<HTMLDivElement>(null);

  // Ferme le menu quand on touche ailleurs
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (theme: LunaTheme) => {
    setTheme(theme);
    setCurrent(theme);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Changer l'apparence"
        aria-expanded={open}
        title="Changer l'apparence"
        className="text-4xl leading-none rounded-full p-1 hover:bg-purple-100 active:scale-90 transition-transform"
      >
        🌙
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 z-40 w-52 bg-white rounded-xl shadow-2xl border border-purple-200 p-2"
        >
          <p className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-500">Apparence</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={current === t.id}
              onClick={() => choose(t.id)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                current === t.id ? 'bg-purple-50' : 'hover:bg-gray-100'
              }`}
            >
              <span
                className="w-7 h-7 rounded-full border border-gray-300 flex-shrink-0"
                style={{ background: t.swatch }}
              />
              <span className="flex-1 font-semibold text-gray-900">{t.label}</span>
              {current === t.id && <Check className="w-4 h-4 text-purple-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
