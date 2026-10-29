import { useEffect, useRef, useState } from "react";

export type PopupSelectOption = { value: string; label: string };

interface PopupSelectProps {
  id: string;
  value: string;
  options: PopupSelectOption[];
  fallbackLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** Keep the menu inside the extension popup so choosing an option cannot move focus to a native menu window. */
export function PopupSelect({
  id,
  value,
  options,
  fallbackLabel,
  disabled = false,
  onChange,
}: PopupSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const label = options[selectedIndex]?.label ?? fallbackLabel ?? options[0]?.label ?? "Select...";

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openMenu = (index = selectedIndex) => {
    if (disabled || options.length === 0) return;
    setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
    setOpen(true);
  };

  const choose = (option: PopupSelectOption) => {
    setOpen(false);
    if (option.value !== value) onChange(option.value);
    rootRef.current?.querySelector<HTMLButtonElement>(".popup-select-trigger")?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>(".popup-select-trigger")?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu(selectedIndex + (event.key === "ArrowDown" ? 1 : -1));
      } else {
        setActiveIndex((index) =>
          Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))),
        );
      }
    } else if (open && event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (open && event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`popup-select${open ? " is-open" : ""}`}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        id={id}
        type="button"
        className="input popup-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span>{label}</span>
      </button>
      {open && (
        <div
          id={`${id}-options`}
          className="popup-select-options"
          role="listbox"
          aria-labelledby={id}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              className="popup-select-option"
              role="option"
              aria-selected={option.value === value}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
