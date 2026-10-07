# Designkonzept Familienkalender

Grundlage: die Skylight-Kalender-Oberfläche
([Calendar Max](https://uk.myskylight.com/calendar-max/), [Calendar](https://uk.myskylight.com/calendar/)).
Das Pastellsystem ist 1:1 übernommen — alle Hex-Werte unten sind aus den Produkt- und
UI-Renderings der beiden Seiten ausgemessen, nicht nachempfunden. Wo ein Wert abgeleitet ist,
steht das dabei.

Dieses Dokument löst den Backlog-Punkt „Einheitliches Design über alle Ansichten" auf und
liefert die Grundlagen, die dort gefordert waren: Farbrollen, eine Schriftskala, feste Radien,
zwei Abstandsmaße, zusammengeführte Bedienelemente.

---

## 1. Was Skylight visuell ausmacht

Fünf Prinzipien, die das ganze Konzept tragen:

1. **Fläche statt Rahmen.** Es gibt fast keine Linien. Ein Termin ist ein Pastellblock, eine
   Karte ist weiß auf warmweiß. Getrennt wird über Farbe und Abstand.
2. **Ein Farbton pro Person, drei Helligkeiten.** Derselbe Ton erscheint als Terminfläche
   (hell), als Fortschrittsbalken (mittel) und als Avatar (kräftig). Dadurch erkennt man eine
   Person am Ton, bevor man den Namen liest.
3. **Warmweiß, nie Reinweiß als Grund.** Der Hintergrund ist `#FFFBF7`, Listenflächen gehen in
   Sand `#F6E6D5`. Das nimmt dem Display die Bildschirmhärte.
4. **Serifen für Zeit und Namen, Grotesk für Inhalt.** „Miller Family", „Thu 13", „April 12"
   stehen in einer Serifenschrift; Termintitel und Zeiten in einer freundlichen Grotesk. Der
   Kontrast der beiden Schriften ersetzt Auszeichnungen.
5. **Ein einziger kräftiger Akzent pro Bildschirm.** Korall markiert „heute" — sonst nichts.
   Alles andere bleibt pastell.

Unser heutiger Stand widerspricht dem an drei Stellen: 18 fest verdrahtete Hex-Werte neben den
`:root`-Variablen, sechs Eckenradien, 15 Schriftgrößen. Das Konzept ersetzt das durch 7 Farb­
familien, 6 Schriftstufen und 4 Radien.

---

## 2. Farbe

### 2.1 Neutrale Flächen

| Token | Hex | Einsatz | Quelle |
|---|---|---|---|
| `--c-canvas` | `#FFFBF7` | App-Hintergrund | gemessen (Routinen-Karte) |
| `--c-surface` | `#FFFFFF` | Karten, Tagesspalten, Modals | gemessen |
| `--c-sand` | `#F6E6D5` | Listenflächen (Einkaufen), Sidebar-Grund | gemessen (Listen-Rendering) |
| `--c-sand-soft` | `#FAF4EC` | ruhige Flächen, inaktive Zeilen | abgeleitet (Sand auf 45 %) |
| `--c-line` | `#EFE7DC` | Haarlinien, Zeitraster | abgeleitet |
| `--c-ink` | `#211E1B` | Primärtext | gemessen |
| `--c-ink-2` | `#6B655E` | Sekundärtext | abgeleitet |
| `--c-muted` | `#95918B` | Zeiten, Zähler, Deaktiviertes | gemessen |

Alle Neutralen sind warm gebrochen (Gelb-/Rotstich). Ein neutrales Grau fällt in dieser
Umgebung sofort als Fremdkörper auf — das ist der häufigste Fehler beim Nachbau.

### 2.2 Die sieben Pastellfamilien

Jede Familie hat drei Stufen: **soft** (Terminfläche, Kartenhintergrund), **mid**
(Fortschritt, erledigte Zeile, Ganztags-Pille), **solid** (Avatar, Punkt, Marker).

| Familie | soft | mid | solid |
|---|---|---|---|
| Korall | `#FCE1DD` | `#FCC3B9` | `#F86A53` |
| Aprikose | `#FDF4E4` | `#FFE1B7` | `#F2A357` |
| Minze | `#E4F0F0` | `#B5DEDE` | `#60A8A0` |
| Himmel | `#E8F0F7` | `#B1CEDD` | `#3CAAE0` |
| Flieder | `#F3EBF3` | `#DFD2DF` | `#8663BF` |
| Rosé | `#FEF2F2` | `#FBC9DA` | `#F592B3` |
| Sand | `#F6E6D5` | `#F2E7D9` | `#CE802D` |

Alle 21 Werte sind ausgemessen.

### 2.3 Zuordnung zur Familie

| Person | heute | neu | Familie |
|---|---|---|---|
| Seb | `#4A90D9` | `#3CAAE0` | Himmel |
| Jessi | `#F2C14E` | `#F2A357` | Aprikose |
| Zoe | `#F4A6A6` | `#F592B3` | Rosé |
| Romy | `#81B29A` | `#60A8A0` | Minze |
| Die Sturms | `#B0A8C9` | `#8663BF` | Flieder |
| *(frei)* | — | `#F86A53` | Korall — **reserviert** |

Korall bleibt frei, weil es die einzige Signalfarbe im System ist. Kommt ein sechstes
Familienmitglied dazu, bekommt es Sand.

### 2.4 Semantische Rollen

Damit fallen die drei Grüntöne und vier Rottöne aus dem heutigen CSS weg:

| Rolle | Familie | Fläche | Marke |
|---|---|---|---|
| Heute / dringend / überfällig | Korall | `#FCE1DD` | `#F86A53` |
| Erledigt / bestätigt | Minze | `#E4F0F0` | `#60A8A0` |
| Hinweis / Countdown | Aprikose | `#FDF4E4` | `#F2A357` |
| Neutral / inaktiv | Sand | `#F6E6D5` | `#95918B` |

### 2.5 Eine Quelle pro Person

Der Backlog-Punkt „Familienprofile" und dieses Konzept greifen ineinander: In `CONFIG.people`
steht pro Person **nur der solid-Wert**. Die beiden helleren Stufen leitet CSS ab:

```css
.person { --p: #3CAAE0; }                                  /* aus CONFIG.people */
.person-soft { background: color-mix(in oklab, var(--p) 14%, #FFFBF7); }
.person-mid  { background: color-mix(in oklab, var(--p) 42%, #FFFBF7); }
.person-solid{ background: var(--p); }
```

Damit kann eine Person nicht mehr in Kalender, Aufgaben und Kita-Karte auseinanderlaufen.

> `color-mix()` braucht Safari 16.4+. Das ist vorher am iPad zu prüfen. Fällt es aus, werden
> die drei Stufen aus der Tabelle in 2.2 fest in `CONFIG.people` hinterlegt — der Rest des
> Konzepts bleibt davon unberührt.

### 2.6 Die eine bewusste Abweichung

Skylight setzt Avatar-Initialen **weiß auf solid**. Auf Aprikose (`#F2A357`) und Rosé
(`#F592B3`) ergibt das rund 2:1 Kontrast — auf einem 27-Zoll-Display aus zwei Metern noch
lesbar, auf unserem 10-Zöller an der Wand nicht mehr. Bei uns stehen Initialen deshalb in
`--c-ink` auf dem **mid**-Ton. Sobald echte Fotos in `img/avatars/` liegen, entfällt der Fall
ohnehin.

---

## 3. Typografie

| Rolle | Schrift | Lizenz |
|---|---|---|
| Display | **Newsreader** | SIL OFL |
| UI | **Figtree** | SIL OFL |

Newsreader trifft die transitionale Serife, die Skylight für Datum und Familienname benutzt;
Figtree die geometrisch-humanistische Grotesk mit hoher x-Höhe für Termintitel. Beide werden
**selbst gehostet** (`css/fonts/`, woff2) — das Wandtablet darf nicht von einem CDN abhängen.

Fallback: `ui-serif, Georgia, serif` bzw. `-apple-system, system-ui, sans-serif`.

### Skala — 6 Stufen statt 15

| Token | Größe / Zeile | Schrift | Einsatz |
|---|---|---|---|
| `--t-display` | 44 / 1.05 | Newsreader 400 | Uhrzeit, Datums-Hero in „Heute" |
| `--t-title` | 28 / 1.15 | Newsreader 400 | Tagesspaltenkopf, Familienname, View-Titel |
| `--t-heading` | 19 / 1.25 | Figtree 600 | Kartenüberschriften |
| `--t-body` | 15 / 1.35 | Figtree 600 | Termintitel, Aufgaben, Listenzeilen |
| `--t-meta` | 13 / 1.35 | Figtree 500 | Zeiten, Orte, Zähler |
| `--t-label` | 11 / 1.2 | Figtree 700, +0.07em, Versalien | Sidebar-Labels, Sektionsköpfe |

Zahlen, die untereinander stehen (Zeitachse, Zähler, Mengen), bekommen
`font-variant-numeric: tabular-nums`.

---

## 4. Form, Abstand, Tiefe

**Radien — 4 statt 6:**

```
--r-card:   20px   /* Karten, Tagesspalten, Modals */
--r-chip:   14px   /* Termine, Listenzeilen, Buttons */
--r-pill:  999px   /* Filter, Tabs, Ganztags-Balken, Countdown */
--r-round:  50%    /* Avatare, Checks, FAB */
```

Die Trennung Karte (20) / Chip (14) ist keine Willkür, sondern Skylights eigene Staffelung:
der Behälter ist runder als sein Inhalt.

**Abstände** — 4er-Raster, im Layout aber nur zwei Maße:

```
--gap:  12px   /* zwischen Geschwisterelementen */
--pad:  16px   /* Karteninnenraum */
--sec:  24px   /* zwischen Sektionen (= --pad + --gap) */
```

Gesetzt wird über `gap` in Flex/Grid, nicht über Einzelmargins.

**Schatten** — 3 Stufen, warm getönt statt neutral-schwarz:

```
--sh-1: 0 1px 2px rgba(58,44,32,.05)     /* Termin-Chips              */
--sh-2: 0 4px 16px rgba(58,44,32,.07)    /* Karten, aktives Nav-Item   */
--sh-3: 0 12px 32px rgba(58,44,32,.10)   /* Modal, FAB                 */
```

---

## 5. Bedienelemente zusammenführen

Heute existieren sieben Klassen für „Pille mit Text, an/aus", drei Ankreuzfelder und drei
Leerzustände. Das Konzept führt sie auf je eine Klasse mit Varianten zurück:

| heute | neu |
|---|---|
| `.filter-chip`, `.kita-chip`, `.list-tab`, `.day-switch-btn`, `.nav-btn`, `.btn-random`, `.countdown-chip` | `.chip` + `.chip--toggle` / `--nav` / `--count` / `.is-active` |
| `.item-checkbox`, `.task-check`, `.hf-check` | `.check` + `.is-done` |
| `.today-empty`, `.hf-loading`, `.placeholder-view` | `.empty` (Icon, Zeile, optionaler Hinweis) |
| diverse Kartenränder | `.card` |

Neu dazu, weil Skylight sie überall benutzt:

- `.event` — Pastellblock: Titel (`--t-body`), Zeit (`--t-meta`, `--c-muted`), Avatar unten rechts.
- `.avatar` — Kreis, 28 px in Listen, 36 px in der Personenleiste.
- `.progress` — Balken in `mid` auf `--c-line`, mit Zähler „2/3" rechts.
- `.fab` — 56-px-Kreis unten rechts, `--sh-3`.

---

## 6. Die Ansichten

**Sidebar** — Sand `#FAF4EC`, 88 px. Aktives Item: weiße Pille, `--sh-2`, Icon in `--c-ink`,
Label in `--t-label`. Bleibt im Kiosk-Modus sichtbar, der Header entfällt dort.

**Header** — „Familie Sturm" in `--t-title` (Serife), Uhrzeit in `--t-display`, Datum in
`--t-meta`. Wetter rechts, Countdowns als `.chip--count` in Aprikose.

**Kalender** — die Leitansicht, direkt nach Skylight:
- Personenleiste oben: Avatar (solid) + Name + Fortschrittsbalken je Person.
- Tagesköpfe in `--t-title` (Serife). Heute: Tageszahl in weiß auf korallenem Kreis.
- Ganztägiges als volle Pille in `mid` über dem Raster.
- Termine als `.event` in `soft`, Avatar unten rechts.
- Mehrpersonentermine: 45°-Streifen aus den **soft**-Tönen der Beteiligten (nicht mid — sonst
  leidet die Titellesbarkeit), Avatare gestapelt unten rechts. Ist „Die Sturms" beteiligt,
  gilt weiter die bestehende Regel: keine Streifen, nur Flieder.
- Zeitachse links in `--t-meta` / `--c-muted`, Raster in `--c-line`.

**Heute** — Datums-Hero in `--t-display`, darunter Karten in fester Reihenfolge: Termine heute,
Kita, Aufgaben, Essen. Jede Karte weiß mit `--sh-2`, Überschrift in `--t-label`.

**Einkaufen** — Listenfläche in Sand `#F6E6D5`, Zeilen als weiße `.chip`-Reihen, `.check`
rechts. Abgehakt: Fläche wechselt auf Minze-soft, Text auf `--c-muted` mit Durchstreichung.

**To-Dos** — je Person eine Karte in ihrer Tönung, exakt wie Skylights Routinen-Ansicht:
Kopf mit Avatar + Name + „1/10", offene Aufgaben auf `soft` mit leerem Ring, erledigte auf
`mid` mit gefülltem Check in `solid`.

**HelloFresh** — Gerichte als Karten mit Emoji und Titel in `--t-title` (Serife), Flächen
abwechselnd Aprikose-mid und Minze-mid — genau Skylights Meal-Karten.

**Kita-Karte** — bekommt endlich Avatar und Farbe: die Slots als `.chip--toggle`, gewählter
Slot in der Farbe der bringenden/holenden Person statt als freier Text.

> **Stand 05.08.2026:** Die **Namen** sind umgesetzt — überall `.chip--person` mit Avatar und
> Personenfarbe, wie in der Kalenderleiste: als Knopf in der „Bringt"-Zeile, als ruhiger Chip
> (`.kita-person`, `<span>`) vor den Zeiten und in der Anzeige, mit Avatar auch auf den
> Entscheidungsknöpfen und im „… holt um"-Band. Gewählt heißt **Ring in der Personenfarbe**
> (`.chip--person.on`), nicht Sandfläche: `.chip.on` würde die Person sonst gerade dann
> verstecken, wenn sie ausgewählt ist. Ohne Profil (Oma) erscheint der Anfangsbuchstabe im
> Kreis (`.chip-avatar--initial`).
>
> **Die Zeit-Chips sind noch neutral** — der gewählte Slot in der Farbe der abholenden
> Person steht weiterhin aus.

**Wetter-Dialog** — seit 04.08.2026 nach einer Vorlage aufgebaut, die der Nutzer mitgebracht
hat. Übernommen ist die **Anordnung**, nicht die Farbwelt: Die Vorlage ist ein dunkles
Dashboard, wir bleiben hell.

- Dreiteilig oben: aktuelle Temperatur in `--t-display` (Serife) mit Zustand in `--t-title`
  und den Kennzahlen Wind, Luftfeuchte und UV darunter — Beschriftung in `--t-label`,
  Zahlen in `--t-heading` (Serife). In der Mitte das Wettersymbol groß, rechts die Tagesliste
  auf `--c-sand-soft` in `--r-card`.
- Unten der Stundenverlauf: weiche Linie in `--c-line` durch acht Stützstellen, Temperaturen
  in `--t-heading` (Serife) darüber, Zeitachse in `--t-meta` / `--c-muted`. Geblättert wird
  über `.chip--icon` am rechten Rand, sechs Seiten zu je acht Stunden.
- Unter jeder Uhrzeit steht der **UV-Wert, immer** — in `--t-label` / `--c-muted`, damit acht
  Werte nebeneinander die Achse nicht dominieren. **Ab Stufe 3** wechselt er in die
  Hinweisrolle (`--hinweis-flaeche` / `--hinweis-text`): Maßstab sind die Kinder, für die
  Sonnenschutz dort beginnt, nicht die Erwachsenen. Dieselbe Schwelle (`UV_SONNENSCHUTZ` in
  `js/open-meteo.js`) löst den Kleidungshinweis in der Heute-Ansicht aus — beide dürfen nie
  auseinanderlaufen, sonst steht ein Hinweis für eine Stunde, die im Verlauf unauffällig
  aussieht. Die Schwelle greift auf den **gerundeten** Wert, sonst stünde ein blasses „UV 3"
  (Rohwert 2,8) neben einem hervorgehobenen „UV 3".
  Die Regenmenge erscheint dort nur, wenn es welche gibt — acht Mal „0,0 mm" wäre eine
  Zeile, die nie etwas sagt.
- **Korall** markiert genau zwei Dinge: die Zeile „Heute" in der Tagesliste (linker Balken)
  und die nächste Stunde im Verlauf (Punkt auf der Kurve, Uhrzeit als Pille in
  `--c-korall-s`). Das ist die bekannte Rolle „jetzt/heute", keine Dekoration.
- Der Dialog nutzt die Variante `.modal-box--wetter` (880 px) — die Normalbox mit 420 px
  trägt drei Spalten nicht.

Eine bewusste Abweichung von der Skala: Das Wettersymbol steht auf
`calc(var(--t-display) * 2)`. Es ist an dieser Stelle Illustration und kein Text; der Wert
ist von der Skala abgeleitet statt frei gegriffen. Die Vorlage hat dort eine gezeichnete
Grafik — mit einem Emoji bleibt es zurückhaltender. Ein Satz eigener SVG-Symbole wäre der
nächste Schritt, wenn das Emoji auf Dauer zu beliebig wirkt.

---

## 7. Nachtmodus

Das Tokenmodell macht ihn zum Tausch von neun Werten — mehr nicht. Für das Wandtablet ab
21 Uhr:

```
--c-canvas  #1A1815     --c-ink     #F2EDE6
--c-surface #232019     --c-ink-2   #A8A199
--c-sand    #2A251E     --c-muted   #7C766E
--c-line    #332D25
```

Die Pastellfamilien behalten ihren Ton, werden aber auf 22 % gegen `--c-canvas` gemischt;
`solid` bleibt unverändert und trägt die Erkennbarkeit. Nicht Teil der ersten Umsetzung, aber
ab dem Tokenmodell jederzeit nachrüstbar.

---

## 8. Umsetzung in drei Schritten

> **Stand 28.07.2026: Schritte 1 bis 3 sind umgesetzt.** Alle fünf Ansichten laufen auf den
> Tokens, die Schriften sind selbst gehostet, die Bedienelemente zusammengeführt. Was
> offenblieb, steht in `BACKLOG.md` unter „Einheitliches Design über alle Ansichten":
> uneinheitliche Zustandsklassen, 13 Schriftgrößen als Rohwert, kein Nachtmodus.
> `CONFIG.people` als führende Personenliste ist weiterhin offen — Farbe und Avatar stehen
> nach wie vor doppelt in `calendars` und `taskProfiles`, jetzt aber wenigstens mit
> denselben Werten.

1. **Tokens** — `css/tokens.css` mit den Werten aus 2–4 anlegen, in `index.html` vor
   `style.css` einbinden. Die 18 fest verdrahteten Hex-Werte in `style.css` durch Tokens
   ersetzen. Sichtbare Änderung: gering, Risiko: gering.
2. **Bedienelemente** — die sieben Chip-Klassen, drei Checks und drei Leerzustände auf `.chip`,
   `.check`, `.empty` zusammenführen. Danach ist `style.css` deutlich kürzer.
3. **Ansichten** — Kalender zuerst (dort sitzt die Skylight-Anmutung), dann Heute, To-Dos,
   Einkaufen, HelloFresh. Parallel `CONFIG.people` einführen, damit Farbe und Avatar pro Person
   nur noch an einer Stelle stehen.

Der Nachtmodus ist danach eine Ergänzung von neun Werten.
