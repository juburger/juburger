import React, { type ReactNode, useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

export function useModDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('mod-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('mod-dark-mode', String(dark));
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark] as const;
}

interface WinWindowProps {
  icon: ReactNode;
  title: string;
  menuItems?: { label: string; onClick: () => void }[];
  controls?: { label: ReactNode; onClick: () => void }[];
  statusItems?: string[];
  children: ReactNode;
  bodyClass?: string;
}

/** NEU layout — classic neumorphic window */
const NeuLayout = ({ icon, title, menuItems, controls, statusItems, children, bodyClass }: WinWindowProps) => (
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

/** MOD layout — Apple/Tesla minimal */
const ModLayout = ({ icon, title, menuItems, controls, statusItems, children, bodyClass }: WinWindowProps) => {
  const [dark, setDark] = useModDarkMode();

  return (
  <div className="min-h-screen bg-background overflow-x-hidden">
    {/* Minimal top bar */}
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-sm font-semibold tracking-tight text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {controls?.slice(0, -1).map((c, i) => (
            <button key={i} onClick={c.onClick}
              className="h-8 px-3 rounded-full flex items-center justify-center cursor-pointer text-foreground/70 hover:text-foreground hover:bg-muted transition-colors text-xs font-medium whitespace-nowrap gap-1 border border-border">
              {c.label}
            </button>
          ))}
          {controls && controls.length > 0 && (
            <button onClick={controls[controls.length - 1].onClick}
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-foreground hover:bg-muted transition-colors">
              {controls[controls.length - 1].label}
            </button>
          )}
        </div>
      </div>

      {/* Menu bar as pill navigation */}
      {menuItems && menuItems.length > 0 && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          {menuItems.map((m, i) => (
            <button key={i} onClick={m.onClick}
              className="px-4 py-1.5 text-xs cursor-pointer text-muted-foreground font-medium rounded-full transition-all hover:bg-muted hover:text-foreground border border-border">
              {m.label}
            </button>
          ))}
        </div>
      )}
    </header>

    {/* Body — generous whitespace */}
    <main className={`px-5 py-6 text-sm leading-relaxed overflow-x-hidden min-h-[calc(100vh-80px)] ${bodyClass || ''}`}>
      {children}
    </main>

    {/* Status bar — subtle bottom */}
    {statusItems && statusItems.length > 0 && (
      <footer className="px-5 py-2 border-t border-border">
        <div className="flex gap-3">
          {statusItems.map((s, i) => (
            <span key={i} className="text-[11px] text-muted-foreground">{s}</span>
          ))}
        </div>
      </footer>
    )}
  </div>
  );
};

const WinWindow = (props: WinWindowProps) => {
  const { uiTheme } = useTenant();
  
  if (uiTheme === 'mod') {
    return <ModLayout {...props} />;
  }
  return <NeuLayout {...props} />;
};

export default WinWindow;
