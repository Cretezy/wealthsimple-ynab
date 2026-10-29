import type { WealthsimpleAuth } from "@/lib/wealthsimple/client";

export async function readWealthsimpleAuth(): Promise<WealthsimpleAuth | null> {
  const [cookie, deviceCookie] = await Promise.all([
    browser.cookies.get({
      url: "https://my.wealthsimple.com",
      name: "_oauth2_access_v2",
    }),
    browser.cookies.get({
      url: "https://my.wealthsimple.com",
      name: "wssdi",
    }),
  ]);
  if (!cookie?.value) return null;
  try {
    const decoded = decodeURIComponent(cookie.value);
    const parsed = JSON.parse(decoded) as { access_token?: string; identity_canonical_id?: string };
    if (!parsed.access_token) return null;
    return {
      accessToken: parsed.access_token,
      identityId: parsed.identity_canonical_id ?? "",
      deviceId: deviceCookie?.value,
    };
  } catch {
    return null;
  }
}

export async function findWealthsimpleAccountId(): Promise<string | null> {
  const tabs = await browser.tabs.query({
    url: "https://my.wealthsimple.com/app/account-details/*",
  });

  for (const tab of tabs) {
    if (!tab.url) continue;
    try {
      const u = new URL(tab.url);
      const match = /\/account-details\/([^/?#]+)/.exec(u.pathname);
      if (match?.[1]) return match[1];
    } catch {
      /* skip */
    }
  }

  return null;
}
