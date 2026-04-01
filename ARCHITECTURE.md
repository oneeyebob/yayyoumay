# YayYouMay — Arkitekturdokumentation

> Et kuratorlag oven på YouTube — bygget af forældre, til forældre.
> App navn: YAY!
> Domæner: yayoumay.dk / yayoumay.com
> GitHub: oneeyebob/yayyoumay

---

## Konceptet

YayYouMay er en mobile-first webapp der løser et konkret problem: YouTube Kids er for babyer, klassisk YouTube er ukontrolleret. YayYouMay er et filterlag oven på YouTubes egen søgning og algoritme — ikke en ny streaming-tjeneste.

Produktet ejer ingen content. Alt video-indhold kommer fra YouTube via YouTube Data API. YayYouMay er udelukkende et kuratorlag.

---

## To brugerniveauer

### Juniormode (/)
- Standardtilstand når appen åbnes
- Viser profilpicker (Netflix-model) — ingen tekst, bare avatarer
- Efter profilvalg: feed med Videoer og Kanaler tabs
- Søgning inden for godkendt indhold (autocomplete)
- Ser KUN whitelistet indhold
- Kan skifte profil ved at klikke "YAY!" logo (går til profilpicker)
- Næste-video logik tjekker whitelist
- "Kuratormode" knap øverst til højre

### Kuratormode (/curator)
- Aktiveres med 4-cifret PIN (gælder per husstand)
- Viser "Hej [aktiv profil]" — kuraterer for den valgte profil
- Søgning via YouTube API med yay/nay på resultater
- Browse-mode: YouTube-lignende browsing med yay/nay overlay
- Populære kategorier: LEGO, Minecraft, Madlavning, Natur, Musik, Sport, Tegnefilm, Videnskab
- Navigation: Profiler, Indstillinger

---

## Auth-model

Ingen personoplysninger i systemet.

- Login: brugernavn + password
- Supabase auth email: {username}@yayyoumay.local (intern, aldrig vist)
- Brugernavn gemmes i user_settings.username
- Recovery: 32-tegns hotkey vises én gang ved oprettelse, gemmes som bcrypt hash
- Email confirmation: SLÅET FRA i Supabase
- PIN: bcrypt hash (cost 10, random salt) i user_settings.curator_pin_hash
- Kuratormode: httpOnly cookie curator_unlocked=true (TTL 1 time)
- Aktiv profil: cookie active_profile_id (session-cookie, ingen maxAge)

### Onboarding flow
/register → vis hotkey (gem din nøgle) → /curator/profiles → opret første profil → /curator/pin-setup → sæt PIN → /curator

---

## Netflix-model for profiler

- Én konto per husstand
- Flere profiler under samme konto (Albert, Lise osv.)
- Én liste per profil (auto-oprettet ved profilskabelse)
- Listen hedder det samme som profilen
- Kuratormode viser aktiv profil — yay/nay går til den profils liste
- Profilskift i juniormode: klik YAY! logo → profilpicker
- Frit profilskift i juniormode (ingen PIN) — tillidsbaseret model

---

## Whitelist-logik

Prioritetskæde (højest vinder):
1. Eksplicit NAY på video → aldrig vist (trumfer alt)
2. Eksplicit YAY på video → altid vist
3. Kanal er YAY'd → alle kanalens videoer vises (via YouTube API, op til 20-30)
4. Ingenting → ikke vist

Kanal-whitelisting: når en kanal godkendes hentes de seneste videoer automatisk via getChannelVideos(). Nay'ede videoer filtreres fra.

---

## Databaseskema

Database: Supabase (PostgreSQL), West Europe (London).
RLS aktiveret på alle tabeller.
Supabase projekt ref: ebwjikqypiuserpkuhoo

### Tabeller
- profiles: person i husstanden, linked til auth.users
- user_settings: 1:1 med auth.users. username, curator_pin_hash, hotkey_hash, youtube_premium (ubrugt)
- lists: én per profil. lang_filter, age_filter
- list_items: yay/nay på kanal ELLER video (CHECK constraint). status: 'yay'|'nay'
- channels: YouTube kanal metadata
- videos: YouTube video metadata, upserted ved afspilning
- tags: 21 seed-tags (sprog, alderstrin, emne, tone)
- list_item_tags: kobling list_items til tags
- list_follows: community follow
- community_votes: peer-validering
- keyword_blacklist: husstandsniveau. UNIQUE(user_id, keyword)

### Migrations
- 20260101000000: initial schema
- 20260101000001: RLS på channels/videos INSERT
- 20260101000002: username + hotkey_hash på user_settings
- 20260101000003: age_filter på lists
- youtube_premium kolonne på user_settings
- keyword_blacklist tabel

---

## Sider og routes

### Juniormode
- /: profilpicker → feed (Videoer/Kanaler tabs + autocomplete søgning)
- /watch/[videoId]: afspil video, whitelist-check, næste video
- /channel/[channelId]: alle videoer fra whitelistet kanal via YouTube API

### Kuratormode
- /curator: dashboard, søgning, browse-link, aktiv profil
- /curator/browse: browse-mode med kategori-grid og yay/nay overlay
- /curator/profiles: profilliste
- /curator/profiles/[id]: profildetalje (navn, sprogfilter, aldersgruppe, godkendt indhold)
- /curator/pin-setup: sæt PIN første gang
- /curator/settings: ordfilter + annonceinfo

### Auth
- /login: brugernavn + password
- /register: opret konto → vis hotkey

---

## Komponenter (shared)
- PinModal: 4-cifret PIN, auto-submit, sætter curator_unlocked cookie
- ProfilePicker: avatarcirkler uden tekst
- YayNayButtons: ét klik gemmer til aktiv profils liste
- VideoPreviewModal: preview i modal, autoplay, Escape-luk
- JuniorFeed: Videoer/Kanaler tabs, autocomplete søgning, 4-kolonne grid
- BrowseUI: kategori-grid, søgning, yay/nay badges

---

## Tech stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Vercel (hosting — ikke deployed endnu)
- Supabase (PostgreSQL + Auth)
- YouTube Data API v3 (Google Cloud projekt: YayYouMay)
- Anthropic API (planlagt V2)
- GitHub: oneeyebob/yayyoumay

---

## Miljøvariabler (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://ebwjikqypiuserpkuhoo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
YOUTUBE_API_KEY=... (Google Cloud: YayYouMay projekt)
CURATOR_PIN_SALT=... (reserveret, ubrugt)

---

## DEV nav bar
Sort sticky navbar øverst. Links: YayYouMay (home+profilreset), Kuratormode, Profiler, Log ud.
Markeret: // DEV NAV — remove before launch i src/app/layout.tsx

---

## Åbne punkter

### V1 mangler
- Deploy til Vercel (yayoumay.dk)
- Account recovery med hotkey (/recover)
- UI/UX polish runde
- Fjern DEV nav, erstat med rigtig navigation
- Tilføj Profiler-knap tilbage på kurator-dashboard

### V1.5
- Community og follow-funktionen
- Profil-billede/avatar upload

### V2
- AI-drevet indholdsvurdering (Anthropic API)
- Abonnementsmodel

### UX feedback der venter
- Kortene i juniormode kan blive mere YouTube-agtige
- Browse mode: diverse forbedringer
- Kanal vs video skelnen kan forbedres visuelt

---

## Kendte quirks
- /junior giver 404 — korrekt, brug / i stedet
- youtube_premium kolonne eksisterer i DB men bruges ikke i UI
- Wicked Makers (horror) er whitelistet i testdata — overvej at nay'e
