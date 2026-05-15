export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
          refresh
        </span>
        <p className="text-label-md text-on-surface-variant">Carregando...</p>
      </div>
    </div>
  );
}
