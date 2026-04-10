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
- Ser KUN whitelistet indhold — inkl. indhold fra abonnerede lister
- Kan skifte profil ved at klikke "YAY!" logo (går til profilpicker)
- Næste-video logik tjekker whitelist
- "Kuratormode" knap øverst til højre
- Video/kanal-sider har Tilbage og Bloker knapper (z-[60] for at overstyre player-overlay)
- YouTube player bruger facade/lazy load (klik-til-start) — fix til iOS Chrome autoplay-begrænsning
- Kanal-siden cacher videoer i channel_cache tabellen

### Kuratormode (/curator)
- Aktiveres med 4-cifret PIN (gælder per husstand)
- Auto-vælger første profil hvis ingen aktiv profil er sat (redirect via /curator/auto-select)
- Viser "Hej [aktiv profil]" — kuraterer for den valgte profil
- Paste YouTube URL direkte i kuratorlisten (sparer ~99 API units vs. søgning)
- Browse-mode: YouTube-lignende browsing med yay/nay overlay
- Populære kategorier: LEGO, Minecraft, Madlavning, Natur, Musik, Sport, Tegnefilm, Videnskab
- YayListUI viser Abonnementer, Kanaler, Videoer og Blokerede videoer — alle collapsible med chevron og "Vis alle/Vis færre"
- Abonnementer-sektion øverst med indhold fra abonnerede bibliotekslister
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
- Én liste per profil (auto-oprettet ved profilskabelse via createProfile action)
- Listen hedder det samme som profilen (kan redigeres under profil-indstillinger med suffix-logik)
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

Feed inkluderer indhold fra brugerens egne lister OG abonnerede bibliotekslister (`allListIds = [...egne, ...abonnerede]`).

Kanal-whitelisting: når en kanal godkendes hentes de seneste videoer automatisk via getChannelVideos(). Nay'ede videoer filtreres fra.

---

## Bibliotek og deling

### /library
- Kræver curator_unlocked cookie (samme PIN-gate som kuratormode)
- To sektioner: "YayYouMay Anbefaler" (lister fra admin-profiler) og "Delt af forældre" (community)
- Admin-profiler identificeres via admin-Supabase-klient (bypasser RLS) mod hardkodet ADMIN_USER_ID
- Splittet sker i JavaScript via Set — undgår PostgREST UUID-quoting-problemer med `.not('in', ...)`
- Søgefelt filtrerer på navn og beskrivelse client-side
- Abonnér/Opsig abonnement knapper med optimistisk spinner

### Offentlig deling af lister
- `lists.is_public` boolean — styrer synlighed i biblioteket
- `lists.description` — valgfri beskrivelse til søgning og visning
- `lists.name` — kan redigeres i /curator/profiles/[id] med suffix-logik: `"${profilnavn}s ${suffix}"` eller `"${profilnavn}s liste"` hvis intet suffix
- Toggle og redigering sker i ProfileDetailUI under profil-indstillinger

### list_subscriptions
- Tabel kobler subscriber_user_id → list_id (ikke i Supabase TypeScript-typer — bruger `as never` casts)
- subscribeToList / unsubscribeFromList server actions i /library/actions.ts
- Junior-feedet fetcher abonnerede list_ids parallelt med egne lister
- Kurator YayListUI viser abonnerede lister som collapsible Abonnementer-sektion

---

## Databaseskema

Database: Supabase (PostgreSQL), West Europe (London).
RLS aktiveret på alle tabeller.
Supabase projekt ref: ebwjikqypiuserpkuhoo

### Tabeller
- profiles: person i husstanden, linked til auth.users
- user_settings: 1:1 med auth.users. username, curator_pin_hash, hotkey_hash, youtube_premium (ubrugt)
- lists: én per profil. name, description, is_public
- list_items: yay/nay på kanal ELLER video (CHECK constraint). status: 'yay'|'nay'
- list_subscriptions: subscriber_user_id + list_id (ikke i genererede typer)
- channels: YouTube kanal metadata
- videos: YouTube video metadata, upserted ved afspilning
- channel_cache: cacher video-liste per kanal (channel_id PK, video_ids[], cached_at). TTL-baseret refresh
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
- 20260101000007: channel_cache tabel
- 20260101000008: list_subscriptions tabel + library-relaterede kolonner (description, is_public på lists)
- 20260101000009_list_items_public_read.sql: RLS-policy så list_items fra offentlige lister kan læses uden ejerskab

---

## Sider og routes

### Juniormode
- /: profilpicker → feed (Videoer/Kanaler tabs + autocomplete søgning)
- /watch/[videoId]: afspil video, whitelist-check, næste video
- /channel/[channelId]: alle videoer fra whitelistet kanal via YouTube API (med channel_cache)

### Kuratormode
- /curator: dashboard, paste URL, aktiv profil, YayListUI med abonnementer
- /curator/auto-select: Route Handler — sætter active_profile_id cookie til første profil, redirect til /curator
- /curator/browse: browse-mode med kategori-grid og yay/nay overlay
- /curator/profiles: profilliste
- /curator/profiles/[id]: profildetalje — listenavn, beskrivelse, is_public toggle, godkendt indhold
- /curator/pin-setup: sæt PIN første gang
- /curator/settings: ordfilter + annonceinfo

### Bibliotek
- /library: offentlige lister — YayYouMay Anbefaler + Delt af forældre, søgning, abonnér/opsig

### Auth
- /login: brugernavn + password
- /register: opret konto → vis hotkey
- /recover: gendan konto med hotkey

---

## Komponenter (shared)
- SharedHeader: sticky header med avatar, låse-knap og back-navigation
- PinModal: 4-cifret PIN, auto-submit, sætter curator_unlocked cookie
- ProfilePicker: avatarcirkler uden tekst
- YayNayButtons: ét klik gemmer til aktiv profils liste
- VideoPreviewModal: preview i modal, autoplay, Escape-luk
- JuniorFeed: Videoer/Kanaler tabs, autocomplete søgning, 4-kolonne grid
- BrowseUI: kategori-grid, søgning, yay/nay badges
- YayListUI: curator-liste med collapsible sektioner (Abonnementer, Kanaler, Videoer, Blokerede)

---

## Tech stack
- Next.js 16.x App Router + TypeScript
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
SUPABASE_SERVICE_ROLE_KEY=... (admin-klient, bypasser RLS)
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
- UI/UX polish runde
- Fjern DEV nav, erstat med rigtig navigation

### V1.5
- Profil-billede/avatar upload
- "Følg en skolekammerats liste" — social deling uden for biblioteket

### V2
- AI-drevet indholdsvurdering (Anthropic API)
- Abonnementsmodel

### API økonomi
- YouTube Data API: søgning koster 100 units, kanal-opslag ~200 units, video-opslag ~1 unit
- Browse-siden starter tom (ingen autoload) for at spare units
- Paste URL-feature sparer 99 units per tilføjelse vs. søgning
- channel_cache reducerer API-kald ved gentagne besøg på kanal-siden

### UX feedback der venter
- Kortene i juniormode kan blive mere YouTube-agtige
- Browse mode: diverse forbedringer
- Kanal vs video skelnen kan forbedres visuelt

---

## Kendte quirks
- /junior giver 404 — korrekt, brug / i stedet
- youtube_premium kolonne eksisterer i DB men bruges ikke i UI
- list_subscriptions ikke i Supabase TypeScript-typer — bruger `as never` casts og eksplicitte type assertions
- PostgREST `.not('col', 'in', '(uuid,...)')` fejler stille med rå UUIDs — brug altid JS Set-filtrering til UUID-splitning
- Wicked Makers (horror) er whitelistet i testdata — overvej at nay'e
