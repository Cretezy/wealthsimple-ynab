import { useMemo } from "react";
import type { SyncStatus } from "@/lib/messages";
import { Header } from "./Header";

interface ResultViewProps {
  resultView: "dry-run" | "real";
  viewResult: SyncStatus | null;
  viewLoading: boolean;
  viewError: string | null;
  status: { inProgress: boolean };
  onBack: () => void;
  onSync: () => void;
}

export function ResultView({
  resultView,
  viewResult,
  viewLoading,
  viewError,
  status,
  onBack,
  onSync,
}: ResultViewProps) {
  const isReal = resultView === "real";
  const transactions = viewResult?.lastResult?.transactions ?? [];
  const result = viewResult?.lastResult;
  const dupIds = useMemo(
    () => new Set(viewResult?.lastResult?.duplicateImportIds ?? []),
    [viewResult],
  );

  const itemStatus = (importId: string): string | null => {
    if (!isReal) return null;
    return dupIds.has(importId) ? "updated" : "created";
  };

  return (
    <div className="popup">
      <Header
        title={isReal ? "Sync done" : "Preview"}
        onBack={onBack}
        right={
          !isReal ? (
            <button
              type="button"
              className="link-btn"
              style={{ color: "#38bdf8", fontSize: 12, fontWeight: 600 }}
              onClick={onSync}
              disabled={status.inProgress}
            >
              Sync Now
            </button>
          ) : undefined
        }
      />

      {viewLoading ? (
        <div className="empty-state">
          <p style={{ color: "#94a3b8" }}>Fetching transactions...</p>
        </div>
      ) : viewError ? (
        <div className="toast toast-error" style={{ margin: "12px 16px" }}>
          {viewError}
        </div>
      ) : transactions.length > 0 ? (
        <>
          <div className="dry-run-summary">
            {isReal ? (
              <>
                <span className="result-stat">{result!.created} created</span>
                <span className="result-stat">{result!.updated} updated</span>
              </>
            ) : (
              <span className="result-stat">{result!.supported} to import</span>
            )}
          </div>
          <div className="dry-run-list">
            {transactions.map((tx) => {
              const statusLabel = itemStatus(tx.import_id);
              return (
                <div key={tx.import_id} className="dry-run-item">
                  <div className="dry-run-item-row">
                    <span className="dry-run-item-date">{tx.date}</span>
                    <span className="dry-run-item-payee">{tx.payee_name}</span>
                    <span className={`dry-run-item-amount ${tx.amount < 0 ? "neg" : "pos"}`}>
                      {(tx.amount / 1000).toFixed(2)}
                    </span>
                  </div>
                  <div className="dry-run-item-meta">
                    {statusLabel && (
                      <span className={`dry-run-item-status ${statusLabel}`}>{statusLabel}</span>
                    )}
                    <span className={`dry-run-item-cleared ${tx.cleared}`}>{tx.cleared}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">&#x2705;</div>
          <p>{viewResult ? "No transactions to import." : "Ready to preview."}</p>
        </div>
      )}
    </div>
  );
}
