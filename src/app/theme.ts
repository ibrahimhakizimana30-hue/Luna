// Thème d'affichage choisi par l'utilisateur (Blanc, Noir ou Congo).
// Il est gardé sur l'appareil et appliqué avant l'affichage de Luna.

export type LunaTheme = 'blanc' | 'noir' | 'congo';

export const THEMES: { id: LunaTheme; label: string; swatch: string; barColor: string }[] = [
  { id: 'blanc', label: 'Blanc', swatch: 'linear-gradient(135deg, #ffffff, #ede9fe)', barColor: '#6d28d9' },
  { id: 'noir', label: 'Noir', swatch: 'linear-gradient(135deg, #2a2f39, #0d0f14)', barColor: '#0d0f14' },
  {
    id: 'congo',
    label: 'Congo',
    swatch: 'linear-gradient(135deg, #009543 0 38%, #fbde4a 38% 62%, #dc241f 62%)',
    barColor: '#007a37',
  },
];

const STORAGE_KEY = 'luna_theme';

export function getTheme(): LunaTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'blanc' || saved === 'noir' || saved === 'congo') return saved;
  } catch {
    // stockage indisponible : thème par défaut
  }
  return 'blanc';
}

export function applyTheme(theme: LunaTheme): void {
  document.documentElement.dataset.lunaTheme = theme;
  const bar = THEMES.find((t) => t.id === theme)?.barColor;
  if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
}

export function setTheme(theme: LunaTheme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // stockage indisponible : le thème s'applique seulement jusqu'à la fermeture
  }
}
