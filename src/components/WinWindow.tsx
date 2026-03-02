import React, { type ReactNode } from 'react';

interface WinWindowProps {
  icon: ReactNode;
  title: string;
  menuItems?: { label: string; onClick: () => void }[];
  controls?: { label: ReactNode; onClick: () => void }[];
  statusItems?: string[];
  children: ReactNode;
  bodyClass?: string;
}

const WinWindow = ({ icon, title, menuItems, controls, statusItems, children, bodyClass }: WinWindowProps) => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="neu-raised max-w-full overflow-hidden">
        {/* Title bar */}
        <div className="neu-flat text-foreground px-3 py-2.5 flex items-center justify-between text-xs font-medium select-none" style={{ borderRadius: 'calc(var(--radius) - 4px) calc(var(--radius) - 4px) 0 0' }}>
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-lg">{icon}</span>}
            <span className="tracking-wide">{title}</span>
          </div>
          <div className="flex gap-2">
            {controls?.map((c, i) => (
              <button key={i} onClick={c.onClick}
                className="min-w-8 h-8 px-3 rounded-full text-foreground text-xs flex items-center justify-center cursor-pointer transition-all neu-flat">
                {c.label}
              </button>
            )) || (
              <>
                <span className="w-3.5 h-3.5 rounded-full bg-primary-foreground/15" />
                <span className="w-3.5 h-3.5 rounded-full bg-primary-foreground/15" />
                <span className="w-3.5 h-3.5 rounded-full bg-primary-foreground/15" />
              </>
            )}
          </div>
        </div>

        {/* Menu bar */}
        {menuItems && menuItems.length > 0 && (
          <div className="bg-card px-3 py-2.5 flex gap-1.5 flex-wrap">
            {menuItems.map((m, i) => (
              <button key={i} onClick={m.onClick}
                className="px-3 py-1.5 text-xs cursor-pointer text-card-foreground font-medium rounded-full transition-all neu-flat">
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className={`bg-card p-5 text-sm leading-relaxed overflow-x-hidden overflow-y-auto min-h-[calc(100vh-120px)] ${bodyClass || ''}`} style={{ borderRadius: '0 0 calc(var(--radius) - 4px) calc(var(--radius) - 4px)' }}>
          {children}
        </div>

        {/* Status bar */}
        {statusItems && (
          <div className="px-5 py-2 text-xs text-muted-foreground flex gap-3">
            {statusItems.map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-[11px] neu-sunken">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WinWindow;
