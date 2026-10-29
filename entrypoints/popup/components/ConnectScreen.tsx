import { useCallback, useState } from "react";
import type { ExtensionSettings } from "@/lib/settings";
import { Header } from "./Header";

const PRIVACY_POLICY_URL = "https://github.com/Cretezy/wealthsimple-ynab/blob/main/PRIVACY.md";

interface ConnectScreenProps {
  settings: ExtensionSettings;
  authError: boolean;
  budgetsQuery: { isError: boolean; error: Error | null };
  updateSetting: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
  authorizeMutation: { isPending: boolean; mutateAsync: (v?: void) => Promise<unknown> };
}

export function ConnectScreen({
  settings,
  authError,
  budgetsQuery,
  updateSetting,
  authorizeMutation,
}: ConnectScreenProps) {
  const [showPat, setShowPat] = useState(false);

  const handleAuthorize = useCallback(async () => {
    try {
      await authorizeMutation.mutateAsync();
    } catch {
      /* handled by mutation state */
    }
  }, [authorizeMutation]);

  return (
    <div className="popup">
      {showPat ? (
        <Header title="Personal access token" onBack={() => setShowPat(false)} />
      ) : (
        <Header />
      )}
      <div className="empty-state">
        {authError && !showPat ? (
          <>
            <div className="toast toast-error" style={{ marginBottom: "16px", textAlign: "left" }}>
              Your YNAB session has expired. Please sign in again.
            </div>
            <h2>Reconnect to YNAB</h2>
            <p>Your access token is no longer valid.</p>
            <button
              type="button"
              className="btn btn-primary btn-oauth"
              onClick={handleAuthorize}
              disabled={authorizeMutation.isPending}
            >
              {authorizeMutation.isPending ? "Connecting..." : "Sign back in with YNAB"}
            </button>
            <button type="button" className="pat-toggle link-btn" onClick={() => setShowPat(true)}>
              or use a new personal access token
            </button>
          </>
        ) : showPat ? (
          <div className="field" style={{ textAlign: "left", width: "100%" }}>
            <label className="field-label" htmlFor="pat-input">
              Personal Access Token
            </label>
            <div className="field-input-row">
              <input
                id="pat-input"
                type="password"
                value={settings.ynabAccessToken}
                onChange={(e) => updateSetting("ynabAccessToken", e.target.value)}
                placeholder="Paste your token..."
                className="input"
              />
              {budgetsQuery.isError && (
                <span className="token-indicator token-invalid">&times;</span>
              )}
            </div>
            <a
              href="https://app.ynab.com/settings/developer"
              target="_blank"
              rel="noopener noreferrer"
              className="token-link"
              style={{ display: "block", marginTop: "12px" }}
            >
              Get a token here &rarr;
            </a>
          </div>
        ) : (
          <>
            <div className="empty-icon">🔗</div>
            <h2>Connect to YNAB</h2>
            <p>Authorize with YNAB to start syncing your Wealthsimple transactions.</p>
            <button
              type="button"
              className="btn btn-primary btn-oauth"
              onClick={handleAuthorize}
              disabled={authorizeMutation.isPending}
            >
              {authorizeMutation.isPending ? "Connecting..." : "Authorize with YNAB"}
            </button>
            <button type="button" className="pat-toggle link-btn" onClick={() => setShowPat(true)}>
              or use a personal access token
            </button>
          </>
        )}
        <a
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="token-link"
          style={{ display: "block", marginTop: "16px" }}
        >
          Privacy policy
        </a>
      </div>
    </div>
  );
}
