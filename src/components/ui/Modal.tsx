"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

// Native <dialog> gives focus trapping, Esc-to-close and inert background for free.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-ink-600 bg-ink-800 p-0 text-parchment shadow-2xl open:animate-fade-in backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 id="modal-title" className="font-display text-lg text-gold-300">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted hover:bg-ink-700 hover:text-parchment"
          >
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
