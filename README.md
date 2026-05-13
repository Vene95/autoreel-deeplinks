# AutoReel — Deep Links Setup

Acest folder conține fișierele care trebuie hostate public pe domeniul tău (`YOUR_DOMAIN_HERE`) prin GitHub Pages. Conține:

- `.well-known/apple-app-site-association` — pentru iOS Universal Links
- `.well-known/assetlinks.json` — pentru Android App Links
- `CNAME` — domeniul tău (pentru GitHub Pages custom domain)
- `index.html` — landing page + fallback la app store

Când utilizatorii dau click pe un link de tip `https://YOUR_DOMAIN_HERE/car/<id>` într-un mesaj WhatsApp / Email / Browser, OS-ul:
1. Vede că domeniul are aplicație asociată (prin fișierele de mai sus)
2. Deschide direct app-ul AutoReel la `CarDetailScreen` pentru acel ID
3. Dacă app-ul nu e instalat, deschide `index.html` cu CTA către Play Store / App Store

---

## Pași de setup (în ordine)

### 1. Cumpără domeniul

- **Cloudflare Registrar** (recomandat): https://www.cloudflare.com/products/registrar/ — preț la cost, fără markup
- **Namecheap**: https://www.namecheap.com — alternativ
- **ROTLD** (pentru .ro): https://www.rotld.ro — pentru `.ro`

Sugestii: `autoreel.app` (.app forțează HTTPS — perfect pentru deep links).

### 2. Creează un repo public pe GitHub

```bash
cd C:\Users\user\Projects\AutoReel\deeplinks
git init
git add .
git commit -m "Initial GitHub Pages setup"
gh repo create autoreel-deeplinks --public --source=. --push
# Sau prin UI: github.com → New repository → autoreel-deeplinks
```

Apoi push:
```bash
git remote add origin https://github.com/<TU>/autoreel-deeplinks.git
git push -u origin main
```

### 3. Activează GitHub Pages

În repo pe GitHub → **Settings** → **Pages** → **Source** → **main branch** → **/ (root)** → **Save**.

În 1-2 minute, repo-ul tău e accesibil la `https://<TU>.github.io/autoreel-deeplinks/`.

### 4. Conectează domeniul propriu

În același loc (**Settings → Pages**) → **Custom domain** → introdu `YOUR_DOMAIN_HERE` → **Save** → **Enforce HTTPS** ✅.

Apoi în panoul de DNS al domeniului tău (la Cloudflare / Namecheap / unde l-ai cumpărat), adaugă:

```
Type     Name    Value
A        @       185.199.108.153
A        @       185.199.109.153
A        @       185.199.110.153
A        @       185.199.111.153
CNAME    www     <TU>.github.io
```

GitHub Pages verifică automat și emite certificat HTTPS (durează ~5 min — 24h, de obicei 10min).

### 5. Înlocuiește placeholder-ele

Edit pe GitHub direct (sau local + push):

**`.well-known/apple-app-site-association`**:
- Schimbă `TEAMID_HERE` cu Apple Developer Team ID (~10 caractere alfanumerice)
  - Găsești la https://developer.apple.com → Membership
  - **Necesită cont Apple Developer ($99/an)** — pentru iOS Universal Links
  - Dacă nu vrei iOS deep links acum, lasă placeholder-ul. iOS o să ignore.

**`.well-known/assetlinks.json`**:
- Schimbă `REPLACE_WITH_DEBUG_SHA256` și `REPLACE_WITH_RELEASE_SHA256` cu fingerprint-urile cheilor tale Android.
- Pentru DEBUG (cel cu care rulezi `flutter run`):
  ```bash
  cd C:\Users\user\Projects\AutoReel
  keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
  Caută linia `SHA256:` — un șir de 32 hex bytes separate cu `:`. Copiază-l.

- Pentru RELEASE (când vei semna APK-ul pentru Play Store):
  ```bash
  keytool -list -v -keystore <calea_la_cheia_ta>.keystore -alias <aliasul_tau>
  ```

  Înainte de release pe Play Store, completezi al doilea SHA256.

**`CNAME`** și **`index.html`**:
- Caută `YOUR_DOMAIN_HERE` și înlocuiește cu domeniul tău real (ex: `autoreel.app`).
- În `index.html` și înlocuiește `YOUR_APPLE_APP_ID` cu ID-ul aplicației din App Store (vine după publicare).

### 6. Verifică în browser

- `https://YOUR_DOMAIN_HERE/.well-known/apple-app-site-association` → trebuie să returneze JSON-ul (NU 404)
- `https://YOUR_DOMAIN_HERE/.well-known/assetlinks.json` → la fel
- `https://YOUR_DOMAIN_HERE/` → vezi landing page

Folosește tool-uri de validare:
- iOS: https://app-site-association.cdn-apple.com/a/v1/YOUR_DOMAIN_HERE
- Android: https://developers.google.com/digital-asset-links/tools/generator

### 7. Configurează Flutter app

Partea Flutter e deja făcută în repo:

- `pubspec.yaml` → pachetul `app_links: ^6.3.2`
- `android/app/src/main/AndroidManifest.xml` → intent-filter cu `android:autoVerify="true"` pe `https://YOUR_DOMAIN_HERE`
- `lib/core/deep_links/deep_link_handler.dart` → mapează URL-urile primite la rute go_router (`/car/<uuid>`, `/dealer/<uuid>`, `/saved`, `/profile/edit`)
- `lib/core/deep_links/deep_links_gate.dart` → widget care pornește handler-ul la mount și-l închide la unmount
- `lib/app.dart` → atașează `DeepLinksGate` ca builder pe `MaterialApp.router`

Ce trebuie să faci tu manual după ce ai domeniul:

1. Înlocuiește `YOUR_DOMAIN_HERE` în `android/app/src/main/AndroidManifest.xml` cu domeniul real.
2. (Opțional) Setează `APP_PUBLIC_URL=https://<domeniul_tau>` în `.env` ca să se potrivească cu URL-ul folosit la share button. Default-ul e `https://autoreel.app` — dacă alegi alt domeniu, suprascrie.
3. Rulează:
   ```bash
   flutter pub get
   flutter clean
   flutter run
   ```

> **iOS Universal Links**: necesită și un entitlement `com.apple.developer.associated-domains = ["applinks:<domain>"]` în `ios/Runner/Runner.entitlements` + cont Apple Developer activ. Folderul `ios/` nu e generat pe acest setup; după `flutter create . --platforms=ios` adaugi entitlement-ul manual sau prin Xcode (Signing & Capabilities → Associated Domains).

### 8. Testare

După ce toate de mai sus sunt rezolvate:

```bash
# Pe device cu app-ul instalat:
adb shell am start -W -a android.intent.action.VIEW -d "https://YOUR_DOMAIN_HERE/car/0a000001-0000-0000-0000-0000000000a1" com.autoreel.autoreel
```

Ar trebui să deschidă direct app-ul la mașina respectivă.

Apoi încearcă din WhatsApp: trimite-ți un link `https://YOUR_DOMAIN_HERE/car/<id>` → tap → app-ul se deschide la detail.

---

## De ce am ales așa

- **GitHub Pages** e gratis și ultra-stabil — Microsoft hostuiește, cache CDN gratis
- **Cloudflare DNS** poate fi folosit chiar dacă registratorul e altul
- **Apple TEAMID** îți trebuie doar dacă vrei iOS Universal Links. Pentru Android e suficient SHA256 din keystore (gratis).

## Costuri

- Domeniu: ~10-18 USD/an (Cloudflare) sau ~30-60 RON/an (`.ro`)
- Hosting: **gratis** (GitHub Pages)
- iOS Universal Links: necesită Apple Developer ($99/an) — opțional
- Android App Links: **gratis** (doar SHA256)

Total minim pentru deep links Android: ~15 USD/an.
