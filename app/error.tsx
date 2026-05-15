"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <span className="material-symbols-outlined text-error text-[48px]">error</span>
        <h2 className="text-title-lg font-semibold text-on-surface">Algo deu errado</h2>
        <p className="text-label-md text-on-surface-variant">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
        </p>
        <Button onClick={reset}>
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
