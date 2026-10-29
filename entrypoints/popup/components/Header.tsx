interface HeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

/** Shared header used across all screens. Without title = brand header (logo). With title = navigation header (back + title + optional right). */
export function Header({ title, onBack, right }: HeaderProps) {
  if (title) {
    return (
      <div className="header" style={{ justifyContent: "space-between" }}>
        {onBack && (
          <button
            type="button"
            className="link-btn"
            style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}
            onClick={onBack}
          >
            &larr; Back
          </button>
        )}
        {!onBack && <span />}
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2 }}>{title}</span>
        <span>{right ?? <span />}</span>
      </div>
    );
  }

  return (
    <div className="header">
      <div className="logo">
        <img src="/icon/32.png" className="logo-icon" alt="" />
        Wealthsimple<span className="arrow">→</span>YNAB
      </div>
    </div>
  );
}
