"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[#2a2a2a] px-6 py-4">
            <h2 className="font-syne text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
