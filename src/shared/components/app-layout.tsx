import { AppNav } from "./app-nav";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, actions }: AppLayoutProps) {
  return (
    <div className="min-h-svh bg-background flex flex-col">
      <AppNav />

      <div className="max-w-[1200px] w-full mx-auto px-8 flex-1 flex flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between py-5 border-b border-border/40">
          <h1 className="font-mono text-xs tracking-tight uppercase text-muted-foreground">
            {title}
          </h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {/* Content */}
        <main className="py-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
