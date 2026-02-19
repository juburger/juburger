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
    <div className="min-h-screen p-1.5 bg-background overflow-x-hidden">
      <div className="bg-card win-raised max-w-full overflow-hidden">
        {/* Title bar */}
        <div className="bg-primary text-primary-foreground px-1.5 py-0.5 flex items-center justify-between text-xs font-bold select-none tracking-wide">
          <div className="flex items-center gap-1.5">
            <span>{icon}</span>
            <span>{title}</span>
          </div>
          <div className="flex gap-0.5">
            {controls?.map((c, i) => (
              <button key={i} onClick={c.onClick}
                className="w-4 h-3.5 win-raised bg-card text-[9px] flex items-center justify-center cursor-pointer text-card-foreground font-mono font-bold leading-none">
                {c.label}
              </button>
            )) || (
              <>
                <span className="w-4 h-3.5 win-raised bg-card text-[9px] flex items-center justify-center text-card-foreground font-bold">_</span>
                <span className="w-4 h-3.5 win-raised bg-card text-[9px] flex items-center justify-center text-card-foreground font-bold">□</span>
                <span className="w-4 h-3.5 win-raised bg-card text-[9px] flex items-center justify-center text-card-foreground font-bold">×</span>
              </>
            )}
          </div>
        </div>

        {/* Menu bar */}
        {menuItems && menuItems.length > 0 && (
          <div className="bg-card border-b border-border px-1 py-px flex gap-0">
            {menuItems.map((m, i) => (
              <button key={i} onClick={m.onClick}
                className="px-2 py-0.5 text-xs cursor-pointer text-card-foreground font-mono bg-transparent border-none hover:bg-primary hover:text-primary-foreground">
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className={`bg-popover win-sunken m-1 p-3.5 text-sm leading-relaxed overflow-x-hidden overflow-y-auto min-h-[calc(100vh-80px)] ${bodyClass || ''}`}>
          {children}
        </div>

        {/* Status bar */}
        {statusItems && (
          <div className="px-2 py-0.5 text-[11px] text-muted-foreground flex gap-3 border-t border-border">
            {statusItems.map((s, i) => (
              <span key={i} className="win-sunken px-1.5 py-px">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WinWindow;
