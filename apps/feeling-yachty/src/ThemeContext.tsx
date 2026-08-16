import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { saveSettingsLocal, updateAccount } from './auth';
import { colorsFromSettings, type Colors, type ThemeId } from './theme';
import type { AppSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

type ThemeCtx = {
  colors: Colors;
  settings: AppSettings;
  setSettings: (next: AppSettings, persistRemote?: boolean) => Promise<void>;
  patchSettings: (patch: Partial<AppSettings>, persistRemote?: boolean) => Promise<void>;
  applyRemote: (partial?: Partial<AppSettings>) => Promise<void>;
};

const Ctx = createContext<ThemeCtx>({
  colors: colorsFromSettings('yachty'),
  settings: DEFAULT_SETTINGS,
  setSettings: async () => undefined,
  patchSettings: async () => undefined,
  applyRemote: async () => undefined,
});

export function ThemeProvider({
  initial,
  children,
}: {
  initial: AppSettings;
  children: ReactNode;
}) {
  const [settings, setLocal] = useState<AppSettings>(initial);

  useEffect(() => {
    setLocal(initial);
  }, [initial]);

  const colors = useMemo(
    () => colorsFromSettings(settings.themeId as ThemeId, settings.customAccent, settings.customHeader),
    [settings.themeId, settings.customAccent, settings.customHeader]
  );

  const setSettings = useCallback(async (next: AppSettings, persistRemote = false) => {
    setLocal(next);
    await saveSettingsLocal(next);
    if (persistRemote) {
      try {
        await updateAccount({ settings: next });
      } catch {
        // Local theme still applies.
      }
    }
  }, []);

  const patchSettings = useCallback(
    async (patch: Partial<AppSettings>, persistRemote = false) => {
      const next = { ...settings, ...patch };
      await setSettings(next, persistRemote);
    },
    [settings, setSettings]
  );

  const applyRemote = useCallback(async (partial?: Partial<AppSettings>) => {
    if (!partial || !Object.keys(partial).length) {
      return;
    }
    let next: AppSettings | null = null;
    setLocal((cur) => {
      next = { ...cur, ...partial };
      return next;
    });
    if (next) {
      await saveSettingsLocal(next);
    }
  }, []);

  return <Ctx.Provider value={{ colors, settings, setSettings, patchSettings, applyRemote }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
