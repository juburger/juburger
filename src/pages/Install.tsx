import React, { useEffect, useState } from 'react';

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🍔</div>
      <h1 className="text-2xl font-bold mb-2">JU Burger</h1>

      {isInstalled ? (
        <div className="mt-4">
          <p className="text-muted-foreground">Uygulama zaten yüklü! ✓</p>
          <a href="/" className="neu-btn inline-block mt-4 px-6 py-2 text-sm">Uygulamayı Aç</a>
        </div>
      ) : isIOS ? (
        <div className="mt-4 space-y-3">
          <p className="text-muted-foreground text-sm">iPhone'a yüklemek için:</p>
          <div className="neu-flat rounded-2xl p-4 text-left text-sm space-y-2">
            <p>1. Alttaki <strong>Paylaş</strong> butonuna dokunun ⬆️</p>
            <p>2. <strong>"Ana Ekrana Ekle"</strong> seçeneğini seçin</p>
            <p>3. <strong>"Ekle"</strong> butonuna dokunun</p>
          </div>
        </div>
      ) : deferredPrompt ? (
        <button onClick={handleInstall} className="neu-btn mt-4 px-8 py-3 text-sm font-medium">
          📲 Uygulamayı Yükle
        </button>
      ) : (
        <div className="mt-4">
          <p className="text-muted-foreground text-sm">
            Tarayıcı menüsünden "Ana Ekrana Ekle" seçeneğini kullanabilirsiniz.
          </p>
        </div>
      )}

      <p className="text-muted-foreground text-xs mt-8">
        QR kodu okutarak da direkt menüye erişebilirsiniz.
      </p>
    </div>
  );
};

export default Install;
