# YayYouMay — Arkitekturdokumentation

> Et kuratorlag oven på YouTube — bygget af forældre, til forældre.
> Domæner: yayoumay.dk / yayoumay.com

---

## Konceptet

YayYouMay er en mobile-first webapp der løser et konkret problem: YouTube Kids er for babyer, klassisk YouTube er ukontrolleret. YayYouMay er et filterlag oven på YouTubes egen søgning og algoritme — ikke en ny streaming-tjeneste.

Produktet ejer ingen content. Alt video-indhold kommer fra YouTube via YouTube Data API. YayYouMay er udelukkende et kuratorlag.

---

## To brugerniveauer

### Juniormode
- Standardtilstand når appen åbnes
- Barnet scroller frit og vælger selv
- Ser **kun** kanaler og videoer der er whitelistet af kuratoren
- Kan skifte frit mellem profiler (f.eks. Albert og Sofie) — ingen PIN krævet
- Næste-video logik tjekker whitelist før den foreslår — ikke YouTubes algoritme

### Kuratormode
- Aktiveres med en 4-cifret PIN (gælder per husstand, ikke per profil)
- Forælder kan browse YouTube som normalt
- Kan yay/nay kanaler, emner og videoer direkte fra browsing-sessionen
- Administrerer profiler og lister
- Alt ikke-whitelistet indhold kræver kuratorgennemgang

---

## Auth-model

Inspireret af ILS-projektet — ingen personoplysninger i systemet.

- Login: email (bruges kun som teknisk nøgle til Supabase Auth) + password
- Brugernavn gemmes i `profiles` tabellen — ikke i auth-systemet
- Recovery: brugeren modtager en "hotkey" på sin email ved oprettelse — en engangskode til at genetablere adgang hvis brugernavn/password glemmes
- Email confirmation: **slået fra** i Supabase (giver øjeblikkelig session efter signup)
- PIN: hashes med bcrypt (cost factor 10, random salt) og gemmes i `user_settings.curator_pin_hash`
- Kuratormode-adgang markeres med en httpOnly cookie `curator_unlocked=true` (TTL: 1 time)

### Netflix-model for profiler
Én konto per husstand. Flere profiler under samme konto (Albert, Sofie, osv.). Hver profil har sin egen whitelist. Kuratormode gælder på tværs af alle profiler.

---

## Databaseskema

Database: Supabase (PostgreSQL), hosted i West Europe (London).
RLS (Row Level Security) er aktiveret på alle tabeller.

### Tabeller

| Tabel | Beskrivelse |
|---|---|
| `profiles` | En person i husstanden. Linked til `auth.users`. |
| `user_settings` | 1:1 med `auth.users`. Gemmer `curator_pin_hash`. |
| `lists` | En whitelist tilknyttet en profil. Kan være public (community). |
| `list_items` | Et godkendt/afvist indhold. Enten en kanal ELLER en video (ikke begge). Status: `yay` eller `nay`. |
| `channels` | YouTube-kanal med metadata. Delt reference-data. |
| `videos` | Enkelt YouTube-video med metadata. |
| `tags` | Kuraterede tags med kategori og dansk/engelsk label. Seeded ved opstart. |
| `list_item_tags` | Kobling mellem `list_items` og `tags`. |
| `list_follows` | En bruger følger en andens liste. |
| `community_votes` | Peer-validering af community-lister (approve/reject). |

### Vigtige constraints
- `list_items`: CHECK constraint sikrer at præcis én af `channel_id`/`video_id` er sat
- `list_follows`: UNIQUE på `(follower_user_id, list_id)` — ingen duplikater
- `community_votes`: UNIQUE på `(voter_user_id, list_id)` — én stemme per bruger per liste

### RLS-politik (sammenfatning)
- `profiles` / `user_settings`: kun ejer via `user_id = auth.uid()`
- `lists`: ejer har fuld adgang; andre kan SELECT hvor `is_public = true`
- `list_items` / `list_item_tags`: ejer-adgang via join-kæde `lists → profiles → user_id`
- `channels` / `videos` / `tags`: alle autentificerede brugere kan SELECT
- `list_follows` / `community_votes`: kun ejer på egne rækker

---

## Tags (seed-data)

21 tags på tværs af 4 kategorier:

| Kategori | Tags |
|---|---|
| `sprog` | dansk, engelsk, norsk, svensk |
| `alderstrin` | 4-6 år, 7-9 år, 10-12 år |
| `emne` | leg og kreativitet, gaming, sport, musik, madlavning, natur og dyr, videnskab, tegnefilm, humor, LEGO |
| `tone` | rolig, energisk, lærerig, sjov |

Slugs er ASCII-safe (f.eks. `laererig`, `4-6-aar`). Display-labels ligger i `label_da` og `label_en`.

---

## Tech stack

| Lag | Teknologi |
|---|---|
| Frontend + routing | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| Database + auth | Supabase (PostgreSQL + Supabase Auth) |
| YouTube-data | YouTube Data API v3 |
| AI-lag (V2+) | Anthropic API |
| Versionsstyring | GitHub (`oneeyebob/yayyoumay`) |

---

## Mappestruktur

```
src/
  app/
    (auth)/          — login, register
    (junior)/        — juniormode (root URL = /)
    curator/         — kuratormode (PIN-beskyttet)
  components/
    junior/          — UI til juniormode
    curator/         — UI til kuratormode
    shared/          — PinModal, ProfilePicker, YayNayButtons, VideoPlayer
  lib/
    youtube/         — gateway-lag (client.ts, types.ts)
    supabase/        — browser + server klienter, genererede typer
    auth.ts          — session-hjælpere
    whitelist.ts     — tjek om kanal/video er godkendt
supabase/
  migrations/        — SQL-migrations
  seed.sql           — tags og startdata
```

---

## Arkitekturprincipper

### YouTube gateway-lag
Al kommunikation med YouTube Data API går gennem `src/lib/youtube/client.ts`. Dette abstrakte lag sikrer at vi kan skifte kvota-model, tilføje caching eller udskifte datakilden uden at røre ved resten af applikationen. API-forbrug logges per bruger fra dag ét.

### Whitelist-logik
`src/lib/whitelist.ts` er den centrale funktion der svarer på "må denne bruger se dette indhold?". Al juniormode-rendering bruger denne funktion.

### AI-laget
Anthropic API er tænkt ind i arkitekturen fra dag ét men aktiveres i V2. Det er bevidst ikke koblet til endnu.

### Annoncer
YouTube Data API forbyder blokering af annoncer. Familier med YouTube Premium slipper for annoncer via deres eget abonnement — ikke via appen.

---

## Forretningsmodel

| Fase | Model |
|---|---|
| V1 | Gratis |
| V1.5 | Buy Me a Coffee |
| V2 | Abonnement (når API-kvota bliver flaskehals) |
| V3+ | Direkte distribution for kuraterede skabere |

---

## Åbne punkter / beslutninger der mangler

- [ ] `user_settings`: tilføj `youtube_premium` boolean (påvirker UI omkring annoncer)
- [ ] Hotkey/recovery-flow: ikke bygget endnu
- [ ] Næste-video logik: implementeres i `VideoPlayer.tsx`
- [ ] Community peer-validering: kræver 2-3 `approve` votes før liste frigives
- [ ] Sprogfilter: YouTube API understøtter `relevanceLanguage` parameter — skal kobles til `lists.lang_filter`
- [ ] AI-drevet indholdsvurdering: V2

---

## Miljøvariabler

Disse skal ligge i `.env.local` (aldrig i git):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
YOUTUBE_API_KEY=
CURATOR_PIN_SALT=        # reserveret til fremtidig brug
```

Supabase projekt ref: `ebwjikqypiuserpkuhoo`
