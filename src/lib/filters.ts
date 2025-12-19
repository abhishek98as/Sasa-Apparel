const STORAGE_KEY = 'sasa-filters';

export interface FilterPreset<T = Record<string, unknown>> {
  name: string;
  values: T;
  createdAt: number;
}

export function loadPresets<T = Record<string, unknown>>(): FilterPreset<T>[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FilterPreset<T>[];
  } catch {
    return [];
  }
}

export function savePreset<T = Record<string, unknown>>(preset: FilterPreset<T>) {
  if (typeof window === 'undefined') return;
  const existing = loadPresets<T>().filter((p) => p.name !== preset.name);
  existing.unshift({ ...preset, createdAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 15)));
}

export function deletePreset(name: string) {
  if (typeof window === 'undefined') return;
  const existing = loadPresets().filter((p) => p.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

