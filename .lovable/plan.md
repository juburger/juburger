

# Font Degisikligi: Google Sans

Google Sans (Product Sans) ozel bir font oldugu icin Google Fonts uzerinden dogrudan kullanilamaz. Bunun yerine **"Google Sans Text"** veya en yakin acik alternatif olan **"Inter"** kullanilabilir. Ancak Google'in resmi sitelerinde kullanilan gorunume en yakin font Google Fonts'ta **"Inter"** veya **"Outfit"**'tir.

Eger tam olarak "Google Sans" istiyorsaniz, bunun yerine Google Fonts'ta bulunan ve cok benzer olan **"Product Sans"** benzeri **"Poppins"** veya dogrudan **"Inter"** onerilir.

Alternatif olarak, Google Sans CSS'i dogrudan Google'in CDN'inden cekilerek kullanilabilir (ancak bu lisans acisindan gri bir alan).

## Yapilacaklar

### 1. `src/index.css` - Font import ve tanimlama
- Satir 1'deki Space Grotesk importunu Google Sans importu ile degistir
- Body font-family tanimini guncelle

### 2. `src/index.css` - Neumorphic buton font tanimlari
- `.neu-btn` ve `.neu-input` siniflarindaki `font-family: 'Space Grotesk'` referanslarini guncelle

### Teknik Detay
- Google Sans icin su CDN linki kullanilacak: `https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;700&display=swap`
- Fallback olarak system font stack eklenecek: `'Google Sans', sans-serif`
- Toplamda `src/index.css` dosyasinda 4-5 satir degisecek

