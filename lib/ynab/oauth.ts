/**
 * YNAB OAuth — Implicit Grant (client-side flow).
 *
 * No client_secret needed. Token comes back as a URL fragment.
 * Token expires in 2 hours — user must re-authorize when expired.
 *
 * Register an OAuth app at https://app.ynab.com/settings/developer
 * with redirect URIs for Chrome and Firefox:
 *   - https://<ext-id>.chromiumapp.org/
 *   - https://<ext-id>.extensions.allizom.org/
 */

const YNAB_CLIENT_ID = "8OcMC8IMrN_ySWgN2IctI4XyUYI3efMjjWOfZug1oww";
const YNAB_AUTH_URL = "https://app.ynab.com/oauth/authorize";

/** `state` must be echoed back in the redirect fragment (CSRF protection). */
export function buildAuthUrl(state: string): string {
  const redirectUri = browser.identity.getRedirectURL();
  const params = new URLSearchParams({
    client_id: YNAB_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "token",
    state,
  });
  return `${YNAB_AUTH_URL}?${params}`;
}

export function getClientId(): string {
  return YNAB_CLIENT_ID;
}
