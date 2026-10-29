import { Header } from "./Header";

interface WealthsimpleReauthScreenProps {
  /** Optional detail message from the failed request. */
  message?: string;
  onRetry: () => void;
}

/**
 * Shown when a Wealthsimple request (typically the cards list) fails with 401.
 * Wealthsimple access tokens can't be refreshed from the extension (the token
 * endpoint rejects non-first-party origins), so the user must re-open
 * Wealthsimple — which refreshes the cookie — and then retry.
 */
export function WealthsimpleReauthScreen({ message, onRetry }: WealthsimpleReauthScreenProps) {
  return (
    <div className="popup">
      <Header />
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <h2>Wealthsimple session expired</h2>
        <p>
          {message ??
            "Open Wealthsimple to refresh your authentication, then come back and try again."}
        </p>
        <a
          href="https://my.wealthsimple.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-lg"
        >
          Open Wealthsimple &rarr;
        </a>
        <button type="button" className="pat-toggle link-btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
