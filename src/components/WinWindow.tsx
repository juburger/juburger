import React, { type ReactNode } from 'react';

interface WinWindowProps {
  icon: string;
  title: string;
  menuItems?: { label: string; onClick: () => void }[];
  controls?: { label: string; onClick: () => void }[];
  statusItems?: string[];
  children: ReactNode;
  bodyClass?: string;
}

const WinWindow = ({ icon, title, menuItems, controls, statusItems, children, bodyClass }: WinWindowProps) => {
  return (
    <div className="min-h-screen p-3 bg-background overflow-x-hidden">
      <div className="neu-raised max-w-full overflow-hidden">
        {/* Title bar */}
        <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between text-sm font-semibold select-none rounded-t-[var(--radius)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span>{title}</span>
          </div>
          <div className="flex gap-1.5">
            {controls?.map((c, i) => (
              <button key={i} onClick={c.onClick}
                className="w-7 h-7 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs flex items-center justify-center cursor-pointer hover:bg-primary-foreground/25 transition-colors">
                {c.label}
              </button>
            )) || (
              <>
                <span className="w-3 h-3 rounded-full bg-primary-foreground/20" />
                <span className="w-3 h-3 rounded-full bg-primary-foreground/20" />
                <span className="w-3 h-3 rounded-full bg-primary-foreground/20" />
              </>
            )}
          </div>
        </div>

        {/* Menu bar */}
        {menuItems && menuItems.length > 0 && (
          <div className="bg-card px-2 py-1.5 flex gap-0.5 border-b border-border/50">
            {menuItems.map((m, i) => (
              <button key={i} onClick={m.onClick}
                className="px-3 py-1 text-xs cursor-pointer text-card-foreground font-medium bg-transparent border-none rounded-lg hover:bg-accent transition-colors">
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className={`bg-background m-2 p-4 text-sm leading-relaxed overflow-x-hidden overflow-y-auto min-h-[calc(100vh-100px)] rounded-xl neu-sunken ${bodyClass || ''}`}>
          {children}
        </div>

        {/* Status bar */}
        {statusItems && (
          <div className="px-4 py-1.5 text-xs text-muted-foreground flex gap-3">
            {statusItems.map((s, i) => (
              <span key={i} className="bg-muted/50 px-2.5 py-0.5 rounded-full text-[11px]">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WinWindow;
