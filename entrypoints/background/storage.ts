import type { ExtensionSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { localDateDaysAgo } from "@/lib/date";

export const STORAGE_KEY = "settings";
let settingsWrite = Promise.resolve();

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const storedSettings = stored[STORAGE_KEY] as
    | (Partial<ExtensionSettings> & { lookbackDays?: number })
    | undefined;

  return {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    since: storedSettings?.since ?? localDateDaysAgo(storedSettings?.lookbackDays ?? 45),
  };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const write = settingsWrite.then(async () => {
    const current = await loadSettings();
    await browser.storage.local.set({ [STORAGE_KEY]: { ...current, ...settings } });
  });
  settingsWrite = write.catch(() => {});
  await write;
}

export async function getEffectiveToken(): Promise<string> {
  const { settings } = (await browser.storage.local.get(STORAGE_KEY)) as {
    settings?: ExtensionSettings;
  };
  return settings?.ynabAccessToken ?? "";
}
