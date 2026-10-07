# Styleguide Familienkalender

Das Regelblatt für **neue Ansichten und Funktionen**. Wer etwas Neues baut, liest diese
Datei und kommt ohne weitere Entscheidungen zu einer Ansicht, die zum Rest passt.

- **Warum** das System so aussieht (Skylight-Herkunft, Messwerte, Abwägungen): `DESIGN.md`.
- **Die Werte selbst** stehen nur in `css/tokens.css`. Diese Datei nennt Namen und Einsatz,
  keine Kopie der Zahlen — weicht etwas ab, gilt `tokens.css`.

Leitbild: **modern, hell, pastell.** Warmweißer Grund, weiße Karten, Pastellflächen in der
Farbe der Person, ein einziger kräftiger Akzent.

---

## 1. Die sechs Grundregeln

1. **Fläche statt Rahmen.** Getrennt wird über Farbe, Abstand und Schatten. Keine
   Trennlinien zwischen Karten, keine Rahmen um Inhalte. Linien nur als Raster
   (Zeitachse) und dann blass.
2. **Warmweiß als Grund, Weiß nur für Karten.** Kein reines Grau, kein Schwarz — alle
   Neutralen sind warm gebrochen.
3. **Eine Person = ein Farbton.** Was einer Person gehört (Termin, Aufgabe, Chip), trägt
   ihre Farbe als zarte Fläche. Die Person erkennt man am Ton, bevor man den Namen liest.
4. **Korall ist Signal, nie Dekoration.** Nur für: heute, jetzt, dringend, überfällig,
   Zähler — und für die eine bestätigende Aktion (`.btn-primary`).
5. **Serife für Zeit und Namen, Grotesk für Inhalt.** Der Schriftkontrast ersetzt Fett,
   Farbe und Unterstreichung.
6. **Keine Emoji als Bedienelement.** Symbole der Oberfläche sind Strichsymbole (SVG,
   `currentColor`). Emoji bleiben Inhalt: das Emoji einer Aufgabe, das Wettersymbol.

---

## 2. Farbe

**Keine neuen Hex-Werte.** Alles kommt aus `--c-*` oder den Rollen.

### Neutrale Flächen

| Token | Einsatz |
|---|---|
| `--c-canvas` | Hintergrund der App |
| `--c-surface` | Karten, Tagesspalten, Modals |
| `--c-sand-soft` | Sidebar, ruhige Flächen, Standard-Chip |
| `--c-sand` | gewählter Chip, Listenflächen |
| `--c-line` | Raster und Chip-Rand — sparsam |
| `--c-ink` / `--c-ink-2` / `--c-muted` | Text: primär / sekundär / Zeiten, Zähler, Deaktiviertes |

### Pastellfamilien

Sieben Familien, je drei Stufen: `-s` (Fläche), `-m` (Tönung), ohne Endung (Marker).
Korall, Aprikose, Minze, Himmel, Flieder, Rosé, Sand.

| Familie | Gehört |
|---|---|
| Himmel | Seb |
| Aprikose | Jessi |
| Rosé | Zoe |
| Minze | Romy |
| Flieder | Die Sturms / Familie |
| Sand | frei für eine sechste Person |
| Korall | **reserviert** als Signalfarbe |

### Personenfarbe ableiten

In der Konfiguration steht je Person nur der kräftige Wert. Die Fläche leitet CSS ab —
nie einen zweiten Farbwert für dieselbe Person hinterlegen:

```css
background: color-mix(in srgb, var(--profile-color) 13%, var(--c-canvas));   /* offen   */
background: color-mix(in srgb, var(--profile-color) 34%, var(--c-canvas));   /* erledigt */
```

In JavaScript für Termine: `resolveBackground(ev.calendars)` aus `js/calendar-view.js`.
Sie kennt auch die Streifen für Mehrpersonentermine und die Ausnahme „Die Sturms".

### Rollen für Zustände

| Bedeutung | Fläche | Text |
|---|---|---|
| Erledigt, bestätigt, guter Hinweis | `--ok-flaeche` | `--ok-text` |
| Heute, dringend, überfällig, Fehler | `--warn-flaeche` | `--warn-text` |
| Hinweis, Countdown, Schwelle erreicht | `--hinweis-flaeche` | `--hinweis-text` |

Text auf Pastell ist immer dunkel (`--c-ink` oder der Rollentext). Weiße Schrift gibt es
nur auf Korall.

---

## 3. Schrift

**Keine neuen Schriftgrößen.** Sechs Stufen:

| Token | Schrift | Einsatz |
|---|---|---|
| `--t-display` | Newsreader 400 | Uhrzeit, Datums-Hero |
| `--t-title` | Newsreader 400 | Titel einer Ansicht, Familienname |
| `--t-heading` | Newsreader 400 | Name im Kartenkopf, Kennzahlen |
| `--t-body` | Figtree 600 | Termintitel, Aufgaben, Listenzeilen |
| `--t-meta` | Figtree 500–600 | Zeiten, Orte, Chips, Hinweise |
| `--t-label` | Figtree 700, Versalien, +0.07em | Kartenüberschrift, Sidebar-Label |

- `--f-display` für alles, was Zeit, Datum oder Name ist. `--f-ui` für den Rest.
- Zahlen untereinander: `font-variant-numeric: tabular-nums`.
- Im Bestand stehen noch einzelne Rohwerte (12 px, 22 px). Nicht nachahmen.

---

## 4. Form, Abstand, Tiefe

| Token | Einsatz |
|---|---|
| `--r-card` | Karten, Tagesspalten, Modals |
| `--r-chip` | Termine, Listenzeilen, Hinweisbänder |
| `--r-pill` | Chips, Knöpfe, Zähler |
| `50%` | Avatare |

Der Behälter ist immer runder als sein Inhalt: Karte außen, Chip-Radius innen.

| Token | Einsatz |
|---|---|
| `--gap` | zwischen Geschwistern (Karten, Spalten) |
| `--pad` | Innenraum einer Karte |
| `--sec` | zwischen Abschnitten |

Abstände über `gap` in Flex/Grid setzen, nicht über Einzelmargins.

| Token | Einsatz |
|---|---|
| `--sh-1` | Termin-Chips, Tagesspalten |
| `--sh-2` | Karten, aktiver Sidebar-Eintrag, hervorgehobene Spalte |
| `--sh-3` | Modals |

---

## 5. Bauteile

**Erst hier suchen, dann bauen.** Eine neue Klasse nur, wenn keins dieser Teile passt.

| Bauteil | Klasse | Hinweise |
|---|---|---|
| Karte | `.card` | weiß, `--r-card`, `--sh-2`, `--pad` |
| Kartenüberschrift | `.today-card-title` | `--t-label`, Versalien, `--c-muted` |
| Pille / Umschalter | `.chip` | gewählt: `.on`; gedimmt: `.inactive` |
| – Person | `.chip--person` + `style="--chip-color:…"` | mit `.chip-avatar`; ohne Foto `.chip-avatar--initial` |
| – eine starke Aktion in der Gruppe | `.chip--stark` | Korall, höchstens einer je Gruppe |
| – zurückhaltend | `.chip--geist` | „Ändern", „Zurück", „+ Name" |
| – klein / nur Symbol | `.chip--klein` / `.chip--icon` | |
| – Segmentwahl | `.chip-seg` > `.chip--seg` | wie 1/3/5/7 Tage |
| – Zähler, Countdown | `.chip--count` | Aprikose, nicht klickbar |
| Chip-Zeile | `.chip-row` | |
| Hauptaktion | `.btn-primary` | eine je Ansicht, oben rechts, Text „+ Ding" |
| Ankreuzfeld | `.check` | erledigt: `.is-done`; Farbe über `--erledigt-farbe` |
| Termin auf der Zeitachse | `.event-chip` | Fläche aus `resolveBackground()` |
| Termin in einer Liste | `.event-chip.event-chip--zeile` | Vergangenes: `.vorbei` |
| Avatare am Termin | `CalendarView.avatarStack(calendars)` | unten rechts |
| Aufgabenzeile | `.task-row` + `style="--profile-color:…"` | mit `.check`, `.task-emoji`, `.task-title`, `.task-due` |
| Leerzustand | `.empty` | Lade-Zustand: `.empty--laedt`; ganze Ansicht: `.empty--gross` |
| Fehler | `.error-banner` | |
| Hinweisband | `.evening-hint` | Minze-Fläche, ein Satz |
| Dialog | `Modal.open(html)` | `.modal-header`, `.modal-body`, `.modal-footer`; breit: `.modal-box--breit` |
| Formular | `.form-label`, `.form-input`, `.form-row`, `.form-error` | |
| Sidebar-Symbol | `navIcon()` in `js/app.js` | 24er-Raster, Strich 1.75, runde Enden |
| Zähler an der Sidebar | `setNavBadge(view, anzahl)` | |

---

## 6. Rezept für eine neue Ansicht

1. **Eintragen:** `VIEWS` und `switchView` in `js/app.js`, Skript in `index.html`. Ein
   Strichsymbol über `navIcon()` — kein Emoji.
2. **Kopf:** die gemeinsame Kopfzeile bleibt stehen. Titel der Ansicht in `--t-title`
   (Serife), rechts daneben `.btn-primary` für die eine Hauptaktion.
3. **Inhalt in Karten:** `.card` auf dem warmen Grund, `--gap` dazwischen. Jede Karte
   beginnt mit einer Überschrift in `--t-label`.
4. **Zeilen in der Karte:** Pastellflächen mit `--r-chip`, keine Trennlinien. Gehört die
   Zeile einer Person, trägt sie deren Tönung.
5. **Zustände:** Laden mit `.empty.empty--laedt`, Leere mit `.empty` und einem Satz, der
   sagt, was fehlt. Fehler mit `.error-banner`.
6. **Maß nehmen:** 1080 × 810 quer, ohne Scrollen, wenn es der Inhalt erlaubt.
   Tippziele mindestens so groß wie ein `.chip`.
7. **Prüfen:** im Browser öffnen, Konsole ansehen, gegen die Liste unten halten.

---

## 7. Prüfliste vor dem Fertigmelden

- [ ] Kein neuer Hex-Wert, keine neue Schriftgröße, kein neuer Radius oder Schatten
- [ ] Korall nur für heute / jetzt / dringend / überfällig / Hauptaktion
- [ ] Keine Trennlinien oder Rahmen, wo Abstand und Fläche reichen
- [ ] Personen in ihrer Farbe, überall dieselbe
- [ ] Zeit, Datum und Namen in der Serife
- [ ] Bestehende Bauteile benutzt statt neuer Klassen
- [ ] Kein Emoji als Symbol der Oberfläche
- [ ] Kein `loading="lazy"` (Kiosk-Betrieb)
- [ ] Lade-, Leer- und Fehlerzustand vorhanden
- [ ] Passt bei 1080 × 810, Konsole ohne Fehler
- [ ] Neues Bauteil oder neue Regel hier nachgetragen
