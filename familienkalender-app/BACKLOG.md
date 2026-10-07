# Backlog

Ideen und offene Punkte, die bewusst zurückgestellt wurden.

## Einheitliches Design über alle Ansichten

> **Umgesetzt am 28.07.2026** nach `DESIGN.md`. Alle fünf Ansichten laufen auf
> `css/tokens.css`; Newsreader und Figtree sind selbst gehostet in `css/fonts/`.
> Die 18 fest verdrahteten Hex-Werte sind weg, die sieben Chip-Klassen sind `.chip` mit
> Varianten, die drei Ankreuzfelder `.check`, die drei Leerzustände `.empty`.
>
> **Was davon offen blieb:**
>
> - **Zustandsklassen sind noch uneinheitlich.** In der Logik stehen weiterhin `active`,
>   `on`, `inactive` und `selected` nebeneinander; `.chip` bedient alle drei Schreibweisen.
>   Sauber wäre ein einziges `is-active`.
> - **13 Schriftgrößen stehen noch als Rohwert** (10, 12, 12.5, 14, 14.5, 16, 17, 18, 22,
>   26, 30, 36, 44 px). Auf Tokens umgestellt sind nur die Deklarationen, die exakt auf einer
>   Stufe der Skala lagen — dort war der Tausch ohne optische Folge. Der Rest braucht je eine
>   Entscheidung, auf welche Stufe er gehört.
> - **Nachtmodus** (DESIGN.md, Abschnitt 7) ist nicht gebaut. Die Tokens tragen ihn, es fehlt
>   der Satz überschriebener Werte plus ein Auslöser.

Farben, Typografie und Bedienelemente sind über die Ansichten hinweg gewachsen statt
entworfen. Jede neue Ansicht hat eigene Varianten mitgebracht, die fast, aber nicht ganz
gleich aussehen.

Bestandsaufnahme am 28.07.2026 aus `css/style.css`:

- **Farben:** Es gibt zwar Variablen in `:root`, aber daneben **18 fest verdrahtete
  Hex-Werte** — `#eaf3ec` fünfmal, `#fdecea` viermal, `#a2662a` viermal und so weiter.
  Grün für "erledigt" existiert in drei Tönen (`#eaf3ec`, `#4f7a5c`, `#3f6b4c`), Rot für
  Warnungen in vieren. Ein Themenwechsel oder ein Dark Mode wäre damit nicht möglich.
- **Eckenradien:** sechs verschiedene Werte (8, 10, 12, 14, 16, 999 px), oft ohne
  erkennbare Regel — Karten mal 12, mal 14 px.
- **Schriftgrößen:** 15 verschiedene Stufen von 10 bis 48 px, die meisten zwischen 11 und
  16 px. Es gibt keine Skala, jede Ansicht hat ihre eigene Abstufung gewählt.
- **Bedienelemente:** mindestens sieben Klassen für dieselbe Sache — `.filter-chip`,
  `.kita-chip`, `.list-tab`, `.day-switch-btn`, `.nav-btn`, `.btn-random`, `.countdown-chip`
  sind alle "Pille mit Text, an/aus". Dazu drei Ankreuzfelder (`.item-checkbox`,
  `.task-check`, `.hf-check`) und drei Leerzustände (`.today-empty`, `.hf-loading`,
  `.placeholder-view`).

**Vorschlag:** Erst die Grundlagen festlegen — Farbrollen (Erfolg, Warnung, Hinweis,
gedämpft), eine Schriftskala mit vier bis fünf Stufen, zwei Eckenradien (Karte und Pille),
zwei Abstandsmaße. Dann die Dubletten zusammenführen: eine Chip-Klasse mit Varianten statt
sieben, eine Karten-Klasse, ein Leerzustand.

Nebeneffekt: Danach wäre ein Dark Mode für den Abend am Wandtablet realistisch, heute nicht.

## Familienprofile für Termin- und Aufgabenzuweisung

Ein Profil je Familienmitglied als einzige Quelle für alles, was eine Person ausmacht —
statt der heutigen drei getrennten Definitionen. Deckt sich mit dem, was Skylight als
ersten Einrichtungsschritt vorsieht: Profile anlegen, ihnen Kalender zuordnen, jeder
bekommt eine eigene Farbe.

**Problem heute:** Eine Person ist an drei Stellen unterschiedlich definiert, ohne Bezug
zueinander (Stand 28.07.2026):

| Stelle | Format | Enthält |
|---|---|---|
| `CONFIG.calendars` | Objekt mit `entity` | Name, Farbe, Avatar, Kalender-Entity |
| `CONFIG.taskProfiles` | Objekt mit `id` | Name, Farbe, Avatar, `shared` — Zuordnung als `people: [id]` im Beschreibungsfeld |
| Kita-Karte | freier Text | nur der Name, keine Farbe, kein Avatar |

Dadurch: Jessi taucht bei den Aufgaben auf, hat aber keinen Kalender; in der Kita-Karte
erscheinen Namen ohne Avatar oder Farbe; und ein neues Familienmitglied muss an mehreren
Stellen gepflegt werden.

**Einheitliches Erscheinungsbild über alle Ansichten** ist Teil davon und der sichtbarste
Nutzen: Dieselbe Person muss überall dieselbe Farbe und dasselbe Profilbild tragen — im
Kalender, auf den Aufgaben-Karten, in der Kita-Karte und in der Tageszusammenfassung.

Heute stimmt das nur zufällig überein, weil ich beim Anlegen der Aufgaben-Profile dieselben
Werte von Hand eingetragen habe. Ändert jemand später Sebs Farbe in `CONFIG.calendars`,
bleibt sie in `CONFIG.taskProfiles` stehen und die Ansichten widersprechen sich. Konkret
schon jetzt uneinheitlich:

- ~~**Die Kita-Karte** zeigt Namen als reinen Text, ohne Avatar und ohne Farbe.~~ Erledigt am
  05.08.2026: Alle Namen in der Karte sind jetzt Personen-Chips wie im Kalender — Avatar plus
  Personenfarbe, gewählter Chip mit Ring statt Sandfläche.

  Zusammengeführt wird über den **Namen** (`KitaCard.profilVon`), quer über `taskProfiles`
  und `calendars`, geteilte Profile ausgenommen. Das ist der Behelf, solange es keine
  führende Personenliste gibt — genau der Punkt oben. Personen ohne Profil (Oma,
  Tagesmutter) bekommen ihren Anfangsbuchstaben im Kreis, damit die Zeile dieselbe Form hat.

  Noch offen aus `DESIGN.md`: Die **Zeit-Chips** selbst sind weiterhin neutral. Der Entwurf
  sieht vor, den gewählten Slot in der Farbe der abholenden Person zu zeigen.
- **"Familie"** heißt bei den Aufgaben so (`taskProfiles`, lila), im Kalender aber
  "Die Sturms" (`calendar.die_sturms`, gleiche Farbe) — zwei Namen für dasselbe Konzept.
- **Zoe und Romy** haben Kalenderfarben und Avatare, sind aber keine Aufgaben-Profile.

**Vorschlag:** Ein `CONFIG.people`-Block als führende Liste, aus dem sich alles ableitet:

```js
people: [
  {
    id: "seb",
    name: "Seb",
    color: "#4A90D9",
    avatar: "img/avatars/seb.svg",
    calendar: "calendar.privat",   // optional
    role: "adult",                  // adult | child
  },
]
```

Daraus ergibt sich:

- **Termine** — Farbe, Avatar und Filter-Chips im Kalender wie heute, aber ohne separate
  Kalenderkonfiguration.
- **Aufgaben** — Zuweisung über dieselben Profile; das Beschreibungsfeld nutzt weiterhin
  `people: [id]`, bleibt also abwärtskompatibel zu den bereits angelegten Aufgaben.
- **Kita** — die Auswahl "wer bringt / wer holt" bietet Profile statt freiem Text an, mit
  Avatar und Farbe. Freie Eingabe muss zusätzlich möglich bleiben (Oma, Tagesmutter), aber
  als Ausnahme, nicht als Normalfall.
- **Zusammenfassung** — die Sätze in der Heute-Ansicht könnten Rollen nutzen, z.B. Kinder
  von Erwachsenen unterscheiden.

### Optional: Profil-Dashboard als Einstellung

Nicht beschlossen, aber denkbar: eine kleine Einstellungsansicht, in der **Name, Farbe und
Funktionen** je Profil gepflegt werden — welche Funktionen ein Profil nutzt, etwa Zoe und
Romy nur den Kalender, nicht die Aufgabenzuweisung.

**Avatare gehören ausdrücklich nicht dazu.** Die bleiben im Code, als Dateien in
`img/avatars/`, und werden über `config.js` zugeordnet.

Aufwand wäre gering: Speicher analog zur Kita-Karte, ein Eintrag je Profil in einer
Local-To-do-Liste mit JSON in der Beschreibung. Setzt aber die führende Profil-Liste oben
voraus — ohne die gäbe es nichts Sinnvolles zu bearbeiten.

~~**Schon geprüft und verworfen (28.07.2026):** HAs `image_upload` für Avatar-Uploads. Der
Upload selbst funktioniert, aber das Ausliefern verlangt einen Authorization-Header, den
ein `<img src>` nicht senden kann.~~

**Korrigiert am 03.08.2026:** Das stimmt nicht. Gegen HA 2026.7.3 nachgemessen liefert
`GET /api/image/serve/<id>/512x512` **HTTP 200 ohne Token** — ein einfaches `<img src>`
reicht. Damit ist `image_upload` auch für Avatare gangbar. Einzelheiten in
`PROJEKTE-PLAN.md`, Abschnitt 1.

**Offene Fragen für die Umsetzung:**

- Nicht jedes Profil hat einen Kalender (Jessi heute nicht), nicht jeder Kalender gehört zu
  einer Person (`calendar.die_sturms` ist der geteilte). Das Modell muss beides zulassen.

  ~~Platzhalter für Jessi schon einbauen.~~ Erledigt am 05.08.2026 mit `platzhalter: true`
  in `CONFIG.calendars`: Jessi steht mit Farbe und Avatar in der Personenleiste, wird aber
  **nicht bei HA abgefragt** (`getAllEvents` überspringt Platzhalter, sonst liefe jeder
  Aufruf in einen Fehler) und ist im Dialog „Neuer Termin" **nicht wählbar** — ein
  `create_event` auf einen nicht existierenden Kalender endet in einer Fehlermeldung statt
  in einem Termin. Sobald `calendar.jessi` in HA existiert, reicht es, die eine Zeile zu
  entfernen.
- **Ein Name für das gemeinsame Profil** festlegen: "Die Sturms". Der
  Kalendername kommt aus iCloud und lässt sich nicht beliebig ändern — vermutlich braucht
  das Profil also einen Anzeigenamen, der vom Kalendernamen abweichen darf.
- Sollen Profile in `config.js` stehen oder im Dashboard pflegbar sein? Letzteres bräuchte
  wieder Speicher in HA, analog zur Kita-Karte.

## Kalender

### Aus dem Skylight-Funktionsvergleich

Abgeglichen am 27.07.2026 gegen ein Skylight-Video-Transkript. Bereits vorhanden und
deshalb nicht als Aufgabe geführt: aktueller Tag immer als erste Spalte, hinterlegte
Wochenenden, farbige Personenzuordnung. Nicht relevant: Wahl des Wochenstarts (bei uns
immer Montag). Personenprofile stehen als eigener Abschnitt weiter oben.

- **Weitere Ansichten: Tag, Monat, Zeitplan.** Wir haben bisher nur die Wochenansicht.
  - *Zeitplan* (chronologische Liste über mehrere Tage, ohne Zeitraster) ist aus meiner
    Sicht der größte Gewinn: An vollen Tagen ist sie lesbarer als das Raster, und die
    Bausteine dafür existieren schon in `DaySummary` und der Agenda der Heute-Ansicht.
  - *Monat* für die Übersicht über Urlaube und Ferien.
  - *Tag* für ein einzelnes, dicht belegtes Datum.
  - Umschaltung gehört in die Kalender-Toolbar neben die Vor-/Zurück-Navigation.

- ~~**Sieben statt fünf Tagesspalten.**~~ Erledigt am 27.07.2026: Umschalter 1/3/5/7 in der
  Toolbar, Auswahl pro Gerät in `localStorage` (Wandtablet, Handy und Rechner haben
  unterschiedlich viel Platz und würden sich eine gemeinsame Einstellung überschreiben).
  `CONFIG.daysToShow` ist nur noch der Startwert, steht auf 3.

- ~~**Regenwahrscheinlichkeit anzeigen.**~~ Gebaut am 05.08.2026. Der Stundenverlauf im
  Wetter-Dialog zeigt jetzt je Stunde Prozentwert, UV und — wenn vorhanden — Regenmenge.

  **Warum nicht über HA:** met.no liefert für Köln keine Wahrscheinlichkeit. Die
  Integration könnte sie durchreichen (`FORECAST_MAP` in `met/const.py` enthält
  `precipitation_probability`), das Feld kommt nur nie an; es steckt im nordischen Modell,
  nicht im globalen Produkt. Geprüft über alle 48 Stunden- und 6 Tageseinträge.

  **HAs eingebaute Open-Meteo-Integration hilft nicht:** Ihr Koordinator fragt stündlich nur
  `precipitation`, `temperature_2m` und `weather_code` ab — die Wahrscheinlichkeit gar nicht
  erst. Installieren würde also nichts ändern.

  **Geprüfte Alternativen (05.08.2026):**

  | Weg | Wahrscheinlichkeit | Schlüssel | Befund |
  |---|---|---|---|
  | Open-Meteo direkt | stündlich + Tagesmaximum | nein | `access-control-allow-origin: *`, aus dem Browser nutzbar — **gewählt** |
  | Bright Sky (DWD MOSMIX) | stündlich | nein | CORS offen, Station Köln 4,8 km. Für zurückliegende Stunden Messwerte ohne Wahrscheinlichkeit |
  | OpenWeatherMap in HA | stündlich + täglich | ja, kostenlos (1000/Tag) | Zuordnung im Quelltext vorhanden |
  | AccuWeather in HA | stündlich + täglich | ja, nur **50 Aufrufe/Tag** | HA pollt ~36×/Tag — zu knapp |
  | Buienradar in HA | nur täglich | nein | kann ausschließlich `FORECAST_DAILY` |

  **Die Falle dabei:** Ohne `models=` mischt Open-Meteo die Quellen — die Menge kommt aus
  einem hochaufgelösten Modell, die Wahrscheinlichkeit aus einem Ensemble. Gemessen stand
  für den 05.08. um 08:00 „2,9 mm" neben „0 %". Mit `models=icon_seamless` (DWD-Kette)
  stammen beide aus derselben Quelle und passen zusammen. Der UV-Index fehlt in dieser Kette
  vollständig (72 von 72 Stunden leer) und kommt aus `best_match` im selben Aufruf.

  Der Zugriff liegt seit dem 05.08.2026 in `js/open-meteo.js`, weil ihn zwei Ansichten
  brauchen: der Wetter-Dialog für den Stundenverlauf und die Heute-Ansicht für den
  Kleidungshinweis. Der Helfer hält die Antwort 15 Minuten, damit nicht beide getrennt
  abfragen.

- **Wetter zum Termin.** Bei Terminen mit Ort das Wetter für diese Zeit anzeigen.

  In zwei Stufen sinnvoll, weil die zweite deutlich teurer ist:
  1. *Wetter zur Terminzeit am Wohnort.* Deckt den häufigen Fall ab ("regnet es während des
     Playdates?"). Nutzt die vorhandene Stundenprognose aus `weather.get_forecasts`, reicht
     aber nur 48 Stunden weit. Wenig Aufwand, da die Daten schon im Wetter-Popup verarbeitet
     werden.
  2. *Wetter am Ort des Termins.* Das kann HA nicht ohne Weiteres: Eine `weather.*`-Entity
     hängt an genau einer Koordinate. Für beliebige Orte bräuchte es je Ort eine eigene
     Entity oder einen externen Dienst samt Geocodierung — also einen zusätzlichen
     API-Schlüssel und Kosten. Nur lohnend, wenn ihr regelmäßig Termine außerhalb habt,
     bei denen das Wetter wirklich abweicht.

- **Countdown an einen Termin hängen.** Die Countdown-Chips gibt es schon, aber nur mit
  festem Datum in `CONFIG.countdowns`. Besser wäre, einen bestehenden Termin als Countdown
  zu markieren — dann wandert das Datum automatisch mit, wenn der Termin verschoben wird,
  und der Titel kommt aus dem Kalender.

  Haken: Wo wird die Markierung gespeichert? Die Termine selbst können wir nicht ändern
  (HA kann kein `update_event`, siehe unten). Es bräuchte also eine eigene Ablage analog
  zur Kita-Karte, die auf die `uid` des Termins verweist.

- **Termine bearbeiten und löschen.** Home Assistants CalDAV-Integration kann bisher nur
  `create_event`; für Ändern/Löschen gibt es kein Service. Bis dahin läuft beides über die
  Apple-Kalender-App.
- **Countdown-Chips** sind gebaut, aber ungenutzt — `CONFIG.countdowns` befüllen, z.B.
  `{ label: "Urlaub", emoji: "🌴", date: "2026-08-15" }`.
- **Echte Fotos statt Platzhalter-Avataren** in `img/avatars/`. Am 05.08.2026 für **Seb und
  Jessi** gemacht, offen sind **Zoe, Romy und „Die Sturms"**.

  Maße: **128 × 128 JPEG**, rund 8 KB je Bild. Größer muss es nicht sein — die App zeichnet
  Avatare in 18, 22, 24, 26 und 32 px, auf dem Retina-iPad also höchstens 64 echte Pixel.

  Zuschnitt mit `sips` (in macOS enthalten, ImageMagick ist nicht installiert). Wichtig ist
  `--cropOffset`, sonst schneidet ein stumpfer Mittelschnitt Gesichter an:

  ```bash
  sips -c 700 700 --cropOffset 200 0 seb.png --out seb-crop.png
  sips -Z 128 seb-crop.png -s format jpeg -s formatOptions 82 --out seb.jpg
  ```

  `-c` ist Höhe/Breite, `--cropOffset` ist **erst Y, dann X**, gemessen von oben links.
  Danach in `config.js` die Endung anpassen — an **zwei** Stellen je Person, `calendars`
  **und** `taskProfiles`. Die alten `.svg` bleiben als Rückfallebene liegen.

## Kita, "Heute" und Abendcheck

### Kita-Karte — gebaut

Umgesetzt am 27.07.2026 in `js/kita-card.js`. Beide Phasen, Auto-Entscheidung bei einer
Möglichkeit, "Niemand kann"-Warnung und Wochenübernahme sind gegen echte Daten getestet.

**Seit 15.08.2026 verschwindet die Karte am Wochenende nicht mehr.** Sie rückt stattdessen
auf den **nächsten Werktag** vor und bringt dessen Wochenleiste mit. Vorher war sie ab
Freitagnachmittag bis Montagfrüh unsichtbar — also genau dann, wenn Zeit gewesen wäre, den
Montag zu klären.

Dazu musste die Tagesleiste mitziehen: `weekStatus` rechnet die Woche jetzt vom **gezeigten
Tag** aus, nicht von heute. Sonst stünde am Samstag eine Leiste voller vergangener Tage
(Mo 10.–Fr 14.) unter einer Karte, die schon den 17. plant.

Offen daran:

- **Kita-Karte für Romy.** Siehe „Kita-Karte für zwei Kinder" direkt unter diesem Block.
  Die frühere Annahme „nur ein Eintrag in der Konfiguration, kein Code" stimmt nicht mehr,
  weil das Abholen bei Romy anders läuft.
- **Kita-Auswahl im Abendblock.** Die Karte für morgen erscheint ab 18:00 bereits, ist aber
  noch nicht gegen einen echten Abend getestet.
- **Eigene Liste für App-Zustand.** `CONFIG.appState.entity` zeigt vorerst auf `todo.kitazoe`,
  Essenseinträge tragen das Präfix `meal:`. Sauberer wäre eine eigene Local-To-do-Liste.

Ursprüngliche Spezifikation, weiterhin gültig:

#### Kita-Karte

Kein Wochenmuster — jeder Tag wird einzeln festgelegt. Ablauf in zwei Phasen:

1. **Verfügbarkeit.** Jeder tippt an, wann er könnte (Mehrfachauswahl aus 12:30 / 13:15 / 14:30).
   Dazu die Auswahl, wer bringt — nur der Name, keine Uhrzeit.
2. **Entscheidung.** Aus den eingetragenen Möglichkeiten wird eine gewählt. Bleibt nach Phase 1
   genau eine übrig, gilt sie automatisch und Phase 2 entfällt.

Weitere Anforderungen:

- Solange nichts entschieden ist, steht "Abholzeit noch nicht abgesprochen" sichtbar oben in
  der Karte — und zwar dort, wo man es direkt erledigen kann, nicht als reine Mahnung.
- Ist die Entscheidung gefallen: Countdown bis zur Abholung.
- **Fall "niemand kann"** (null Möglichkeiten nach Phase 1) braucht einen deutlichen eigenen
  Hinweis, nicht einfach eine leere Karte.
- **Tagesleiste statt Übernahme.** Ursprünglich war ein "gleiche Regelung für weitere Tage
  übernehmen" geplant; das war ein Missverständnis. Gewünscht ist stattdessen, aus dem
  Dashboard heraus jeden Werktag der laufenden Woche einzeln neu zu planen. Umgesetzt als
  Leiste Mo-Fr mit Statuspunkt je Tag (grün entschieden, gelb offen, rot niemand kann).

**Speicher:** eine dedizierte "Local To-do"-Liste in HA (nicht CalDAV, sonst greift der
Schreibbug weiter unten). Ein Eintrag je Tag, Datum als Titel, Zustand als JSON in der
Beschreibung. Bewusst gewählt gegen `input_text`, weil das in HA auf 255 Zeichen begrenzt ist
und für mehrere Tage mit zwei Phasen nicht reicht.

#### Kita-Karte für zwei Kinder (Romy und Zoe) — offen

Gilt für die **jetzige App** und für die spätere **iPhone-Fassung**. Beide nutzen dieselbe
Karte, es wird nichts doppelt gebaut.

**Bringen — bei beiden Kindern gleich.** Die Logik bleibt wie bei Zoe: Verfügbarkeit,
Auswahl, wer bringt, Entscheidung, Tagesleiste.

**Abholen — unterschiedlich:**

| | Zoe | Romy |
|---|---|---|
| Abholung | Zeit aus den Möglichkeiten 12:30 / 13:15 / 14:30, Phase 1 und 2 | **ein Textfeld: „Abholen bis XX:XX Uhr"** |
| Entscheidung | Aus den eingetragenen Möglichkeiten wird eine gewählt | Entfällt. Die Uhrzeit wird direkt eingetragen |
| Countdown | Bis zur gewählten Zeit | Bis zur eingetragenen Uhrzeit |

**Umsetzung (Vorschlag):**

- `CONFIG.kita.children` bekommt Romy mit eigener Local-To-do-Liste `todo.kitaromy`, wie bei
  Zoe (`todo.kitazoe`). Siehe „Wie Daten in HA abgelegt werden".
- Je Kind ein Schalter in der Konfiguration, zum Beispiel `abholung: "auswahl"` (Zoe) oder
  `abholung: "frei"` (Romy). Der Code zeigt je nach Schalter die Auswahl oder das Textfeld.
  Ein weiteres Kind braucht dann nur einen Eintrag.
- Zustand je Tag bei Romy: `{ bring, abholenBis: "HH:MM" }`. Es gibt kein `cand` und kein
  `final`.
- Die Statuspunkte der Tagesleiste müssen für Romy neu gedeutet werden: grün, wenn Bringen
  **und** Uhrzeit eingetragen sind. „Niemand kann" entfällt, weil es keine Auswahl gibt.
- Die Heute-Ansicht (`js/today-view.js`) geht schon über `CONFIG.kita.children`. Prüfen, ob
  zwei Karten untereinander noch auf das Wandtablet passen (1080 × 810).

**iPhone-Fassung:** Die Kita-Karte bleibt dort erhalten (siehe Tabelle unter „iPhone-Fassung").
Mit zwei Kindern gilt: **untereinander statt nebeneinander**, ein Kind pro Karte. Das Textfeld
bei Romy braucht `type="time"` oder eine Uhrzeitauswahl, damit auf dem Telefon die passende
Tastatur erscheint. Tippziele 44 px.

**Offene Fragen:**

1. **Zwei Karten oder eine mit Umschalter?** Zwei Karten sind übersichtlicher und passen am
   Telefon untereinander. Auf dem Wandtablet kostet das Höhe.
2. **Freitext oder Uhrzeitfeld?** Uhrzeitfeld verhindert Tippfehler („16.30", „halb fünf").
   Vorschlag: Uhrzeitfeld.
3. **Hat Romy eigene Betreuungszeiten oder Wochentage**, an denen sie nicht geht?
4. **Gibt es einen Kalender `calendar.romy`?** In `config.example.js` steht für Zoe ein
   Kalender, für Romy bislang nicht (Avatar `img/avatars/romy.svg` ist da).

### Ansicht "Heute" — gebaut

Umgesetzt am 27.07.2026: regelbasierte Tageszusammenfassung, Termine, fällige To-Dos, Anzahl
offener Artikel auf der Einkaufsliste. Ist jetzt der Startbildschirm.

Seit 27.07.2026 zusätzlich: Kita-Karte, sowie die Gerichte der zuletzt gelieferten
HelloFresh-Box als "Mögliches Essen heute" mit Auswahlmöglichkeit.

**Seit 28.07.2026 ohne Kopfzeile.** Auf "Heute" ist `.top-header` ausgeblendet, weil das
Datum sonst doppelt stand; Uhrzeit und Wetter sitzen stattdessen rechtsbündig in der
Datumszeile der Ansicht. `updateClock` und `updateWeather` bedienen beide Orte. Achtung: Das
`hidden`-Attribut allein reicht nicht, `.top-header` hat `display: flex` — es braucht die
Regel `.top-header[hidden] { display: none }`.

**Seit 03.08.2026** fallen abgehakte HelloFresh-Gerichte aus "Mögliches Essen heute" heraus.

Offen daran:

- ~~**Bildschirmfläche besser nutzen.**~~ Erledigt am 03.08.2026: Alle vier Blöcke liegen
  jetzt in einem Raster aus zwei festen Spalten — Kita | Termine, darunter Heute fällig |
  Mögliches Essen. Die Kita-Karte nimmt damit die halbe Breite statt der ganzen, und die
  Ansicht passt auf dem Wandtablet ohne Scrollen auf einen Blick.

  `align-items: start` ist dabei wesentlich: Sonst zöge die hohe Kita-Karte die kurze
  Termin-Kachel auf ihre Höhe. Unter 760 px Breite fällt das Raster auf eine Spalte zurück.

  Betrifft auch die Einkaufen-Ansicht: die ist mit `max-width: 480px` noch schmaler und
  nutzt auf dem Wandtablet nicht einmal ein Drittel der Breite.

- ~~**Regenschwelle zu empfindlich.**~~ Erledigt am 05.08.2026, aber anders als vorgeschlagen:
  Statt die Menge auf 2 mm anzuheben, entscheidet jetzt die **Wahrscheinlichkeit** — ab 60 %
  Matschsachen, ab 30 % „Regenjacke einpacken". Die Menge bleibt als zweite Bedingung
  (ab 2 mm auch bei niedriger Wahrscheinlichkeit) und ist alleiniger Maßstab, wenn
  Open-Meteo nicht erreichbar ist; dann gilt die vorgeschlagene 2-mm-Schwelle.

  Genommen wird der **höchste** Stundenwert im Kita-Fenster (7–17 Uhr), nicht der
  Durchschnitt: Eine Stunde mit 80 % am Nachmittag entscheidet über die Matschhose, auch
  wenn der Vormittag trocken bleibt. Die Zeile im Abendblock nennt beides —
  „70 % Regen, 1,2 mm" statt nur „Regen, 1,2 mm".

- ~~**Sonnenschutz-Hinweis kam zu spät.**~~ Korrigiert am 05.08.2026. Die Regel lautete
  „über 25 Grad **und** UV ab 6" und war doppelt falsch: Zoe gehört als Kind ab **UV 3**
  eingecremt, und UV hängt am Sonnenstand, nicht an der Temperatur.

  In der Woche ab dem 05.08. hätte die alte Regel an **drei von sieben Tagen** geschwiegen —
  am 06.08. bei UV 6,4 und 24,8 Grad, am 07.08. bei UV 6,2 und 24,3 Grad, am 10.08. bei UV 4.
  Zweimal also hoher UV-Wert, verpasst wegen weniger Zehntelgrad. Im Frühjahr wäre es
  deutlicher: klarer Apriltag, 15 Grad, UV 5.

  Jetzt entscheidet allein `UV_SONNENSCHUTZ = 3` (in `js/open-meteo.js`, weil Heute-Ansicht
  und Wetter-Dialog dieselbe Schwelle brauchen). Die Temperatur spielt für den Sonnenschutz
  keine Rolle mehr.

  ~~Offen daran: Der Hinweis erscheint nur im Abendblock, gilt also immer morgen.~~
  Ebenfalls am 05.08.2026 erledigt: Der Hinweis steht jetzt auch **für heute**, direkt unter
  der Tageszusammenfassung. Drei Regeln dabei:

  - **Nur was noch kommt.** Um 14 Uhr zählt die UV-Spitze des Vormittags nicht mehr; die
    laufende Stunde bleibt drin, sie ist ja nicht vorbei. Geprüft mit simulierter Uhrzeit:
    Um 14:00 gehen noch die Stunden 13 bis 17 ein.
  - **Ab 18:00 verschwindet er,** weil dann der Abendblock mit demselben Hinweis für morgen
    übernimmt — zwei fast gleiche Sätze untereinander wären Rauschen.
  - **Der Hinweis spricht von „den Kindern",** nicht von einzelnen Namen: „Für die Kinder
    heute: …" bzw. „Für die Kinder einpacken: …" im Abendblock. Zwischenzeitlich kamen die
    Namen aus `CONFIG.kita.children`; das war zu eng, weil der Hinweis für alle gilt, die
    mitgehen, nicht nur für das Kita-Kind.

  Beide Hinweise teilen sich jetzt einen Baustein (`hinweisZeile`), damit sie nicht
  auseinanderlaufen.
- **„Mögliches Essen heute" fehlt nach einem Kaltstart.** `TodayView.load()` liest den
  HelloFresh-Cache aus dem `localStorage`; ist der leer (neues Gerät, geleerter Speicher,
  frischer Browser), rendert die Ansicht ohne die Kachel. `initBadge()` füllt den Cache
  Sekunden später, aber niemand zeichnet die Ansicht neu — die Kachel erscheint erst beim
  nächsten Wechsel auf „Heute". Aufgefallen am 04.08.2026. Behebbar, indem `refresh()` nach
  dem Schreiben des Caches die Heute-Ansicht anstößt, wenn sie offen ist.

- **LLM-Zusammenfassung als Ausbaustufe.** Aktuell regelbasiert. HA bringt
  `ai_task.generate_data` mit (Service vorhanden, Antwortdaten möglich), es fehlt aber ein
  Anbieter — es gibt keine `ai_task.*`-Entity, weil keine LLM-Integration eingerichtet ist.
  Erst dann sind wertende Sätze möglich ("wird knapp"), die Regeln nicht leisten können.
  Wegen der Kosten nur einmal täglich erzeugen und zwischenspeichern.

### Abendblock "Morgen" — gebaut

Klappt ab 18:00 selbst in der Heute-Ansicht auf, zeigt Wetter für morgen (Kita-Zeitraum 7-17 Uhr)
mit Kleidungshinweis und die Zusammenfassung für morgen.

**Seit 04.08.2026 steht er unten in der rechten Spalte**, unter „Mögliches Essen heute",
statt über die volle Breite darunter. Gemessen bei 1080 × 810:

| | volle Breite unten | in der Spalte |
|---|---|---|
| Rechte Spalte (links 547 px) | 307 px | 561 px |
| Höhe des Blocks | 198 px | 242 px |
| Ansicht gesamt | 907 px — **scrollt** | **810 px, passt** |

Der Block wird schmal 44 px höher, weil Kleidungshinweis und Zusammenfassung öfter
umbrechen; die rechte Spalte war aber so viel leerer als die linke, dass sich das lohnt.
`.evening-block` braucht in der Spalte `margin-top: 0` — das `gap` macht dort die Abstände,
sonst stünde der eigene `--sec`-Abstand zusätzlich davor.

Grenzfall: Bei fünf Gerichten in der Box **und** sechs Terminen scrollt es weiterhin, in der
Spaltenvariante 33 px früher als vorher (301 statt 268 px Überlauf). Bei zwei bis drei
Gerichten — dem Normalfall — tritt das nicht ein.

Offen daran: die Kita-Auswahl für morgen — hängt an der Kita-Karte oben.

**Keine Checkliste** (Kita-Tasche, Brotdose etc.) — bewusst verworfen, der Wetterhinweis reicht.

**Bewusst NICHT umsetzen:** Automatisches Berechnen von Sebs Arbeitsfenster aus Abholzeit und
Fahrtzeit ("Seb arbeitet 08:30-13:00, 3h30 netto"). Der Nutzer hat entschieden, dass Arbeitszeiten
und die Frage, welcher Abholslot dazu passt, ein manuelles Thema bleiben. Es werden nur die
eingetragenen Kita-Angaben angezeigt, nichts hergeleitet.

## Einkaufen

- ~~**Listendesign an die Bring!-App angleichen.**~~ Erledigt am 28.07.2026: Sektionen in
  Brings Ladenreihenfolge, Produktbilder, Menge als zweite Zeile, „zuletzt gekauft" zum
  Wiederaufnehmen.

  Der frühere HACS-Versuch war kein Verbindungsfehler: Aus `costantinoai/bring-shopping-card`
  war nur die **Lovelace-Karte** heruntergeladen worden, nicht die Integration im selben
  Repo. Die liegt jetzt von Hand in `custom_components/bring_shopping/` und liefert über eine
  eigene WebSocket-API Kategorie, Emoji und Bild je Artikel. Details und die drei Eigenheiten
  (Kategorie nur bei selbst angelegten Artikeln, falsche Bild-URLs bei Umlauten, Emoji als
  Rückfall) stehen in `DESIGN.md` und in den Kommentaren von `js/shopping-view.js`.

Offen:

- **Kategorien für vier Artikel** stehen als Ausnahme in `CONFIG.shopping.kategorien`
  (Pesto, Vanille, Natron, Emmer). Neue Artikel ohne Treffer landen sichtbar unter
  „Ohne Kategorie" — das ist der Hinweis, dort eine Zeile zu ergänzen.
- **`bring_shopping` hängt nicht an HACS.** Der Ordner wurde von Hand kopiert, Updates
  kommen nicht automatisch. Bei einer neuen Version den Ordner aus dem Release-Tarball
  ersetzen.
- **Schreibvorgänge sind nicht end-to-end geprüft.** Hinzufügen und Abhaken sind verdrahtet
  und die Kommandos validieren, aber es wurde bewusst nie auf die echte Bring-Liste
  geschrieben.

## HelloFresh

- ~~**Gekochte Gerichte abhaken.**~~ Erledigt am 28.07.2026: Häkchen auf den Kacheln der
  aktuellen Box, Zähler „x von y gekocht" in der Wochenzeile, abgehakte Gerichte fallen aus
  „Mögliches Essen heute" heraus. Gespeichert als ein Eintrag je Woche in
  `CONFIG.appState.entity` (`gekocht:<weekId>` → `{ ids: [...] }`).

  Offen daran: Die Einträge alter Wochen werden nie aufgeräumt — pro Box bleibt einer
  liegen. Stört nicht, wäre aber beim Aufräumen der App-Zustandsliste mitzunehmen.

- **Abgelaufene Anmeldung meldet sich nicht von selbst.** Am 01.08.2026 um 21:22 wurde der
  HelloFresh-Refresh-Token ungültig (`invalid_grant`), seitdem lieferte die Integration null
  Wochen. Die Ansicht zeigte nur „Keine gewählten Gerichte gefunden".

  Das Ärgerliche: Die Integration protokolliert `invalid_grant` als **transient** („will
  retry on next poll") und stößt deshalb keinen Reauth-Dialog in HA an — es gibt also keine
  Reparatur-Meldung, die auffiele. `sensor.hellofresh_de_refresh_token_days_remaining` stand
  weiter auf 56, obwohl der Server den Token ablehnte. Zu erkennen nur im Protokoll oder an
  `binary_sensor.hellofresh_de_write_actions_available = off`.

  **Ursache im Quelltext gefunden:** `token_manager.py` behandelt nur 401/403 als
  Anmeldefehler. HelloFresh antwortet auf einen toten Refresh-Token aber mit **HTTP 400**
  (`invalid_grant`), und alles ab 400 landet im „transient"-Zweig. Also wird nie
  `HelloFreshAuthError` geworfen, der Koordinator meldet nie `ConfigEntryAuthFailed`, und
  HA blendet folglich **keine Schaltfläche „Erneut authentifizieren" ein** — obwohl der
  Config-Flow einen `async_step_reauth` hat. Aktualisieren-Knopf und Neuladen des Eintrags
  laufen in denselben 400 und helfen nicht.

  **Behoben am 02.08.2026:** HA gestoppt, `.storage/core.config_entries` gesichert
  (`core.config_entries.bak-20260802-221219`), im HelloFresh-Eintrag die sieben Token-Felder
  entfernt, HA gestartet. Ohne Token meldet sich die Integration mit den gespeicherten
  `username`/`password` neu an — `_refresh_token_expired()` sieht genau das vor. Entry-ID und
  alle Entitäts-IDs blieben erhalten. Danach: 35 Wochen, `write_actions_available = on`.

  **Sollte upstream gemeldet werden** (`kedube/ha-hellofresh`): 400 + `invalid_grant` ist ein
  Anmeldefehler, kein transienter. Solange das offen ist, wiederholt sich der stille Ausfall.

  App-seitig abgefedert: Eine leere Antwort überschreibt den Cache nicht mehr, stattdessen
  bleibt der letzte bekannte Stand mit Warnbanner stehen. Der Leerzustand nennt jetzt die
  wahrscheinliche Ursache. Ein Melder auf `binary_sensor.hellofresh_de_write_actions_available`
  wäre die saubere Ergänzung, um es früher zu bemerken.

- ~~**Rezept je Gericht der aktuellen Woche anzeigen.**~~ Gebaut am 04.08.2026: Klick auf
  eine Kachel gelieferter Wochen öffnet die PDF-Rezeptkarte im Modal, in „Mögliches Essen
  heute" führt ein Chip „Rezept" dorthin. Neu dazu `js/rezept-modal.js` und eine
  Proxy-Regel in `nginx.conf`.

  Der Befund von damals gilt weiter: Die Integration liefert **kein** Rezept — `ingredients`
  leer, keine Schritte, `cook_time_minutes` ist `None` (am 04.08.2026 gegen Woche 2026-W32
  erneut geprüft). Vorhanden ist nur die `recipe_id`, und daraus lässt sich die Karte bauen:

  ```
  https://www.hellofresh.de/recipecards/card/<recipe_id>-de-DE.pdf
  ```

  **Vier Dinge, die beim Bauen dazukamen:**

  1. **`X-Frame-Options: SAMEORIGIN`.** Die Karte kommt weiterhin ohne Anmeldung, lässt sich
     aber nicht direkt einbetten — im `<iframe>` bliebe sie leer. Deshalb läuft der Abruf
     über den eigenen nginx (`/rezeptkarte/<id>-de-DE.pdf`), der den Kopf entfernt. Die
     Adresse ist auf 24-stellige Rezept-IDs eingegrenzt, damit daraus keine allgemeine
     Weiterleitung auf hellofresh.de wird.
  2. **Karten gibt es erst ab der Lieferung.** Künftige Wochen antworten mit **403** (über
     fünf Wochen geprüft), gelieferte mit 200. Deshalb sind nur die Kacheln gelieferter
     Wochen anklickbar; der Dialog prüft zusätzlich per HEAD und sagt sonst, dass die Karte
     noch nicht bereitsteht.
  3. **Größen schwanken stark** — 0,5 MB beim einen Gericht, 5,2 MB beim anderen. Das
     app-weite `no-store` ist für diese Route deshalb auf eine Woche Zwischenspeicher
     umgestellt. Bereichsanfragen funktionieren durch den Proxy hindurch (206), was Safari
     bei der großen Karte nutzt.
  4. **`Content-Disposition: attachment`** kommt von HelloFresh mit. Beim ersten Versuch auf
     dem iPad wurde die Karte deshalb **heruntergeladen statt angezeigt** — der Kopf wiegt
     schwerer als das `<iframe>`. Der Proxy ersetzt ihn durch `inline`.

     Dazu gehört die Version in der Adresse (`?v=`): Die alte Antwort lag mit einer Woche
     Haltbarkeit im Browser-Cache und wurde weiter ausgeliefert, obwohl der Server längst
     `inline` schickte. **Bei jeder Änderung an den Kopfzeilen der Route `RezeptModal.VERSION`
     hochzählen**, sonst sehen genau die Geräte, die das PDF schon einmal geöffnet haben,
     die Änderung nicht.

  **Offen:** Ob sich das PDF auf dem iPad angenehm lesen lässt, ist weiterhin ungeprüft.
  Der eingebettete Browser hier ist Electron und zeigt PDFs grundsätzlich nicht an, die
  Chrome-Anbindung war nicht verbunden — belegt sind nur die ankommenden Daten (gültiges
  PDF, zwei Seiten) und die Verdrahtung. Die Zubereitung steht auf **Seite 2**; falls Safari
  im `<iframe>` nur die erste Seite zeigt, ist der Knopf „Vollbild" der Weg, der die Karte
  als eigene Seite im nativen Betrachter öffnet.

  Eine eigene Rezeptansicht wäre die Alternative gewesen und ist weiterhin möglich: Die
  öffentliche Rezeptseite (`hellofresh.de/recipes/x-<recipe_id>`, leitet auf die kanonische
  Adresse um) trägt im Seitenquelltext die vollständigen Daten — Schritte mit Schrittfotos,
  Zutaten mit Bildern und Mengen für 2/3/4 Portionen, Utensilien, Gesamtzeit. Über denselben
  Proxy wäre sie erreichbar. Verworfen zugunsten der Originalkarte, weil die Seite immer auf
  das **kanonische** Rezept auflöst und damit gelegentlich eine Variante zeigt (bei der
  Poké Bowl die Aufpreis-Fassung „Doppelt Garnelen") — die PDF-Karte ist exakt die Variante
  der Box.

## Aufgaben

Am 28.07.2026 auf `todo.aufgaben` (Local To-do) umgestellt und nach dem Skylight-Vorbild
neu gebaut: eine Karte je Profil (Familie, Seb, Jessi) plus eine für Aufgaben ohne
Zuweisung, Zähler je Karte, Emoji, Fälligkeitsdatum, Mehrfachzuweisung.

Damit ist auch der CalDAV-Schreibbug umgangen — er betraf `todo.erinnerungen`: Abhaken und
Löschen brachen dort mit HTTP 500 (`TypeError: Calendar.search() got multiple values for
argument 'sort_keys'` in HAs `caldav/todo.py`). Die alte Liste bleibt als Archiv liegen,
migriert wurde bewusst nichts.

Offen:

- ~~**Aufgabentitel sind kaum lesbar, weil sie zu früh abgeschnitten werden.**~~ Erledigt am
  03.08.2026: zwei Spalten à 466 px statt drei à 304, und der Titel bricht über zwei Zeilen
  um statt einzeilig gekürzt zu werden. Alle bestehenden Aufgaben stehen jetzt vollständig.
  Befund, der dahinterstand:

  | | |
  |---|---|
  | Raster | `minmax(260px, 1fr)` → drei Spalten à 304 px |
  | Platz für den Titel | ~151 px, weil sich die Zeile Ankreuzfeld, Emoji, Titel, Datum und Löschknopf teilt |
  | Umbruch | `white-space: nowrap` — der Titel bricht **nie** um, er wird nur gekürzt |

  Ergebnis: „Spülmaschine ausräumen" braucht 173 px und bekommt 151, „Turnbeutel packen"
  braucht 126 und bekommt 116. Schon Titel mit 17 Zeichen enden mit Auslassungspunkten.

  Doppelt ärgerlich, weil gleichzeitig **Platz übrig ist**: Die vier Karten füllen auf dem
  Wandtablet nur das obere Drittel, darunter bleibt der Bildschirm leer. Es wird also
  gekürzt, obwohl Fläche da wäre.

  Umgesetzt wurden die ersten beiden Ansätze: `minmax(420px, 1fr)` statt `minmax(260px, 1fr)`
  im Raster, und `-webkit-line-clamp: 2` statt `white-space: nowrap` beim Titel. Dazu
  `min-width: 0` am Titel, damit der Flex-Eintrag schrumpfen darf, und `align-items:
  flex-start` in der Zeile, damit Ankreuzfeld und Löschknopf bei zwei Zeilen an der ersten
  hängen statt mittig zu schweben.

  **Nicht gemacht und weiterhin denkbar,** falls Titel doch mal länger werden: Fälligkeit und
  Löschknopf aus der Titelzeile nehmen. Der Löschknopf steht dauerhaft da, obwohl er selten
  gebraucht wird, und kostet in jeder Zeile Breite. Schriftgröße bleibt bei 15 px
  (`--t-body`) — kleiner wäre auf einem Wandtablet der falsche Weg.

- **Mobile Web-App als Folgeprojekt**, um dieselben Listen unterwegs zu pflegen. Ausgearbeitet
  im Abschnitt „iPhone-Fassung des Dashboards" weiter unten; setzt den Fernzugriff voraus
  (siehe Tailscale unter Betrieb).
- **Wiederholung nur beim Abhaken.** HA kennt bei `todo.add_item` weder `rrule` noch ein
  Wiederholungsfeld, deshalb legt die App die nächste Instanz selbst an, sobald eine
  wiederkehrende Aufgabe abgehakt wird. Folge: Wird eine Aufgabe nie abgehakt, entsteht auch
  keine neue. Für "jeden Dienstag und Freitag" reicht das Modell nicht — das stand als
  Option zur Wahl und wurde zurückgestellt.
- **Bewusst nicht übernommen** aus dem Skylight-Vorbild: Routinen, Tageszeiten
  (Morning/Afternoon/Evening), Listen-Funktion und das Sterne-/Belohnungssystem.

## Projekte

Gebaut am 03.08.2026, siehe `PROJEKTE-PLAN.md`. Liste `todo.projekte`, Bilder über HAs
`image_upload`.

Offen:

- **Stufe 3: Schritte je Projekt.** Checkliste im Projekt, Fortschritt auf der Karte.
  Bewusst zurückgestellt, bis Stufe 1 und 2 im Alltag stehen.
- **Waisenbilder.** Beim Löschen eines Projekts gehen seine Bilder mit. Bricht der Vorgang
  aber mittendrin ab, bleiben einzelne Bilder in `config/image/` liegen. Ein Abgleich
  „welche Bild-IDs kennt kein Projekt mehr" wäre die saubere Ergänzung.

## Aktivitäten

Konzept vom 03.08.2026 in `AKTIVITAETEN-PLAN.md`, **nichts gebaut**. Ziel ist weniger die
Ideensammlung als die Frage „wer denkt sich diese Woche etwas aus" — ein Planungspate je
Tag, dazu ein Ideenpool als Zuarbeit und Teilnehmer als Zusage.

Zwei Punkte daraus, die auch ohne die Ansicht gelten:

- **Gespeicherte Instagram-Posts sind nicht abrufbar.** Kein offizieller Endpunkt für
  „Saved"/Collections, Basic Display API seit Dezember 2024 abgeschaltet. Übrig bleiben
  Scraper mit Session-Cookie — verworfen (Nutzungsbedingungen, ständig kaputt, Cookie im
  Klartext neben dem HA-Token). Gangbarer Weg ist das Teilen-Menü: Apple-Kurzbefehl schreibt
  Screenshot plus Link in eine Local-To-do-Liste. Gilt dann für jede App, nicht nur Instagram.
- **Teilnehmer brauchen Profile für die Kinder.** Zoe und Romy stehen nur in
  `CONFIG.calendars`, nicht in `CONFIG.taskProfiles` — die Ansicht läuft damit in den
  Backlog-Punkt „Familienprofile" oben. Vor Stufe 2 zu entscheiden.

## iPhone-Fassung des Dashboards

Dieselben Listen unterwegs pflegen: Abholzeit im Bus festlegen, im Laden abhaken, abends
auf dem Sofa die Aufgaben durchgehen. Das Wandtablet bleibt der Hauptbildschirm — die
iPhone-Fassung ist der Zweitzugang, nicht der Ersatz.

**Voraussetzung ist der Fernzugriff** (Tailscale, siehe „Betrieb"). Ohne ihn läuft die App
nur im Heim-WLAN, und damit fällt die Hälfte der Anlässe weg. Der Punkt „Mobile Web-App als
Folgeprojekt" unter „Aufgaben" geht in diesem Abschnitt auf.

### Bestandsaufnahme, gemessen am 04.08.2026 bei 390 × 844

Die Sidebar ist 88 px breit und fest — es bleiben **302 px** für den Inhalt. Was das je
Ansicht bedeutet:

| Ansicht | Seitlicher Überlauf | Höhe zum Scrollen | Schlimmster Brocken |
|---|---|---|---|
| Heute | – | 963 px | passt, weil der 760-px-Umbruch greift |
| Einkaufen | – | 441 px | passt (780-px-Umbruch) |
| Projekte | – | 608 px | passt |
| **To-Dos** | **142 px** | – | `.task-card` mit `minmax(420px, 1fr)` |
| **HelloFresh** | **94 px** | 2711 px | `.hf-week-actions` (153 px Knöpfe) |
| **Kalender** | **147 px** | – | Werkzeugleiste: 388 px Bedienelemente auf 302 px |

Der Kalender ist der klarste Fall: Bei drei Tagesspalten sind die Spalten **63 px** breit.
Termine stehen dort als „Somm", „C &", „E P" — der Bildschirm zeigt Farbe und Uhrzeit, aber
nicht mehr, worum es geht.

Bemerkenswert ist die Gegenprobe: Drei der sechs Ansichten laufen **nicht** über. Die
Umbrüche bei 760 und 780 px, ursprünglich für schmale Tablets gedacht, tragen bis 390 px
durch. Der Umbau ist also kleiner als er aussieht — es sind drei Ansichten, nicht sechs.

### Was strukturell im Weg steht

1. **Die Sidebar.** 88 px sind auf einem iPhone ein Viertel der Breite, und die Bedienung
   liegt oben links statt unter dem Daumen. Auf schmalen Bildschirmen gehört sie als
   Leiste an den unteren Rand — sechs Einträge sind genau das, was dort noch passt.
2. **Feste Mindestbreiten.** `minmax(420px, 1fr)` bei den Aufgaben war die Lösung für das
   Wandtablet (siehe „Aufgaben"). Auf dem iPhone ist genau das der Grund für den Überlauf.
   Solche Werte müssen unter einem Umbruch auf `1fr` fallen.
3. **Das Kalenderraster ist nicht zu retten.** Ein Zeitraster braucht Breite je Tag; unter
   etwa 150 px pro Spalte wird es Dekoration. Der Ersatz steht schon im Backlog unter
   „Kalender": die **Zeitplan-Ansicht** — chronologische Liste über mehrere Tage, ohne
   Raster. Auf dem iPhone ist sie nicht die Alternative, sondern die einzige sinnvolle Form.
4. **iOS-Eigenheiten**, die noch nirgends berücksichtigt sind: `100vh` springt, während die
   Adressleiste ein- und ausfährt (`100dvh` nehmen), die Leiste unten braucht
   `env(safe-area-inset-bottom)`, Tippziele sollten 44 px hoch sein (die `.chip--klein`
   liegen darunter), und es gibt keinen Hover-Zustand — alles, was heute erst beim Überfahren
   erscheint, muss dauerhaft sichtbar sein.
5. **Kein Kiosk mehr.** Auf dem Wandtablet läuft die App als einzige Seite. Am iPhone
   konkurriert sie mit der HA-App, der Bring!-App und der HelloFresh-App, die dieselben Daten
   zeigen. Was sie dort nicht besser kann als die Original-App, muss sie nicht können.

### Was auf dem iPhone bleibt — und was nicht

Leitfrage: *Wozu greift man unterwegs zum Telefon?* Nicht zum Überblick — dafür ist das
Tablet da —, sondern für **eine einzelne Entscheidung oder Eintragung**.

| Funktion | iPhone | Begründung |
|---|---|---|
| Kita-Karte | **bleibt** | Der stärkste Fall überhaupt: „wer holt wann ab" wird unterwegs entschieden, nicht an der Wand. Künftig für zwei Kinder, Romy mit Uhrzeitfeld statt Auswahl (siehe „Kita-Karte für zwei Kinder") |
| Einkaufsliste | **bleibt** | Wird im Laden gebraucht. Kategorien und Bilder tragen auch schmal |
| Aufgaben | **bleibt** | Zeilen statt Karten, Zuweisung über ein Blatt statt vier Spalten |
| Heute | **bleibt, gekürzt** | Termine, Fälliges, Kita. Der Abendblock „Morgen" ist am Telefon der eigentliche Nutzen |
| Termin anlegen | **bleibt** | Kurzes Formular, funktioniert schmal ohnehin |
| Projekte | **bleibt** | Die Fotos entstehen am Handy — Hochladen ist hier sogar besser als am Tablet |
| Kalender | **als Zeitplan** | Raster raus, Liste rein. Umschalter 1/3/5/7 entfällt |
| HelloFresh, Wochen ansehen und pausieren | **bleibt** | Zwei Knöpfe, eine Zeile |
| **HelloFresh, Gerichte auswählen** | **weg** | 252 Rezepte mit Filtern, Suche und Aufpreisrechnung auf 302 px. Die Auswahl ist verbindlich und kostet Geld — ein Fehlgriff auf dem schmalen Bildschirm ist teuer. Die HelloFresh-App kann genau das gut |
| **Rezeptkarte (PDF)** | **weg** | Eine A4-Karte im Querformat auf 390 px, dazu bis 5,2 MB über Mobilfunk. Die Zubereitung steht auf Seite 2 — das liest niemand am Telefon. Falls doch gebraucht: nur der Knopf „Vollbild", kein eingebetteter Rahmen |
| Countdown-Chips, Wetter-Modal | **weg bzw. gekürzt** | Schmuck und Vertiefung. Am Telefon zählt die eine Zahl, nicht die Aufschlüsselung |

Die Regel dahinter, falls später etwas dazukommt: **Alles, was verbindlich Geld ausgibt oder
zum Lesen gedacht ist, bleibt auf dem Tablet. Alles, was ein Häkchen oder eine kurze
Entscheidung ist, kommt aufs Telefon.**

### Wie man es baut

Drei Wege standen zur Wahl:

- **Eine Codebasis, per CSS umgebrochen** — ein zusätzlicher Umbruch bei etwa 500 px, dazu
  ein Schalter in JS für die wenigen Stellen, an denen sich das Markup unterscheiden muss
  (Kalender → Zeitplan, Sidebar → Leiste unten).
- **Zweiter Einstiegspunkt** (`index-mobil.html`) mit eigenen Ansichten, gemeinsamer
  Datenschicht.
- **Erst eine PWA daraus machen** und dann weitersehen.

**Vorschlag: der erste Weg.** Die Datenschicht (`HaApi`, `HaWs`, `DayStore`, `Modal`,
`BildUpload`) ist ohnehin gemeinsam, und ein zweiter Satz Ansichten hieße, jede Änderung
zweimal zu machen — bei sechs Ansichten und einem Ein-Personen-Projekt ist das der sichere
Weg in den Auseinanderlauf. Das Risiko fürs Wandtablet bleibt klein, solange der neue
Umbruch erst unter 500 px greift; dort war bisher nichts.

Ein Symbol für den Startbildschirm (`apple-touch-icon`, `display: standalone`) ist billig
und macht aus der Seite etwas, das sich wie eine App öffnet — ohne echte PWA mit
Servicearbeiter.

### Reihenfolge

| Stufe | Inhalt |
|---|---|
| **1** | Rahmen: Leiste unten statt Sidebar, `100dvh`, Safe Area, Tippziele. Danach ist die App bedienbar, wenn auch unschön |
| **2** | Heute und Kita — der Kern des Nutzens unterwegs |
| **3** | Einkaufen und Aufgaben (Mindestbreiten lösen, Karten zu Zeilen) |
| **4** | Zeitplan-Ansicht als Kalenderersatz |
| **5** | Projekte und HelloFresh lesend, mit den oben gestrichenen Teilen |

Stufe 1 und 2 zusammen sind schon brauchbar. Vorher lohnt sich nichts davon, solange der
Fernzugriff fehlt.

### Offene Fragen

1. **Welches Gerät ist der Maßstab?** 375 px (SE, mini), 390 px (13–16) oder 430 px (Pro Max).
   Gemessen ist gegen 390. Die 375 sind der ehrlichere Prüfwert.
2. **Fernzugriff zuerst?** Ohne Tailscale ist die iPhone-Fassung nur zu Hause nutzbar — dann
   fehlt genau der Anlass, für den sie gebaut wird.
3. **Soll die Gerichtsauswahl wirklich fehlen?** Auf dem Sofa im Menü blättern ist ein
   plausibler Wunsch. Falls ja, wäre eine abgespeckte Fassung nötig: kein Raster, keine
   Filterleiste, Kosten groß und Bestätigung in zwei Schritten.
4. **Homescreen-Symbol** gewünscht, oder reicht ein Lesezeichen?
5. **Wer nutzt es?** Wenn beide Erwachsenen es auf dem Telefon haben, wird die Frage „wer hat
   was zuletzt geändert" wichtiger als am gemeinsamen Wandtablet.

## Mobile Version

> **Stand: offen, nichts gebaut.** Ausgearbeitet ist der Teil „iPhone-Fassung des Dashboards"
> direkt darüber (Messung bei 390 px, Umbau-Plan in fünf Stufen, was auf dem Telefon bleibt).
> Dieser Punkt legt fest, **in welcher Reihenfolge** daraus ein Ziel wird.

**Ziel:** Die jetzige App läuft auch auf dem Handy. Zuerst im Heim-WLAN, danach auch von
unterwegs. Das Wandtablet bleibt der Hauptbildschirm und darf durch den Umbau nicht
schlechter werden.

### Phase 1 — Handy im Heim-WLAN

- Umbau nach „iPhone-Fassung", Stufe 1 und 2: Leiste unten statt Sidebar, `100dvh`,
  Safe Area, Tippziele ab 44 px, dann Heute und Kita.
- Die Seite ist schon erreichbar: `http://<Adresse des Rechners>:8080` im Handy-Browser.
- **Fertig, wenn:** Heute, Kita-Karte und Einkaufsliste auf einem 390-px-Gerät bedienbar sind,
  ohne seitlich zu scrollen. Das Wandtablet sieht unverändert aus.

### Phase 2 — Handy von unterwegs

Das ist **mehr als Tailscale installieren**. Zwei Stolperstellen, die im Plan oben fehlen:

1. **`haUrl` zeigt auf die Heim-Adresse.** `config.js` enthält `http://192.168.178.171:8123`.
   Von außen ist die nicht erreichbar. Entweder das Handy kommt per VPN (Tailscale) ins
   Heimnetz und die Adresse bleibt, oder nginx reicht `/api/` und `/api/websocket` an HA
   durch und `haUrl` wird die eigene Adresse der App. Der zweite Weg braucht eine
   Weiterleitung mit WebSocket-Unterstützung in `nginx.conf`.
2. **Der HA-Token steht in `config.js` und wird an jeden ausgeliefert, der die Seite
   aufruft.** Im Heimnetz ist das hinnehmbar. Bei Zugriff von außen **nur** hinter VPN oder
   Anmeldung freigeben. Die Seite nie ungeschützt ins Internet stellen.

- **Fertig, wenn:** Kita-Karte und Einkaufsliste mit Mobilfunk (WLAN am Handy aus) bedienbar
  sind und die Seite ohne VPN/Anmeldung nicht erreichbar ist.

### Offene Fragen

Gerät als Maßstab, Homescreen-Symbol und Gerichtsauswahl stehen bei „iPhone-Fassung →
Offene Fragen". **Neu:** Gibt es Android-Geräte in der Familie? Dann gilt der Plan nicht nur
für Safari.

## Raspberry-Pi-Migration

> **Stand: offen, nichts gebaut.**

**Ziel:** Die App läuft nicht mehr im Docker auf dem Mac, sondern auf einem Raspberry Pi,
der durchgehend an ist. Der Mac muss nicht mehr laufen, damit das Wandtablet geht.

**Was umzieht:** nur die App (nginx mit den statischen Dateien). Home Assistant läuft schon
getrennt (`192.168.178.171:8123`) und bleibt dort. Eine Datenbank oder ein Backend gibt es
nicht.

### Schritte

1. **Pi vorbereiten:** Raspberry Pi OS Lite (64 Bit), feste IP oder DHCP-Reservierung im
   Router, SSH an, Docker installieren.
2. **Code holen:** `git clone https://github.com/stuermer1987-bit/FamilyPlanner.git`
   (Repo ist privat, daher Token oder Deploy-Key auf dem Pi nötig).
3. **`config.js` von Hand anlegen** (Kopie vom Mac oder aus `config.example.js`). Die Datei
   ist nicht im Repo und muss auf dem Pi extra gepflegt werden.
4. **Container starten** mit denselben zwei Einhängungen wie heute (siehe „Betrieb"), plus
   `--restart unless-stopped`, damit er nach einem Stromausfall wieder hochkommt.
   `nginx:alpine` gibt es für ARM, ein eigenes Image ist nicht nötig.
5. **Tablet umstellen:** Adresse im Tablet-Browser von der Mac-Adresse auf die Pi-Adresse.
6. **Probelauf:** alle Ansichten durchklicken, Konsole auf Fehler ansehen,
   Rezeptkarten-Proxy prüfen (`/rezeptkarte/...`, siehe Fallstrick 10).
7. **Mac-Container abschalten**, wenn es einige Tage stabil lief.

### Zu klären

- **Arbeitsablauf danach.** Heute: Datei auf dem Mac speichern, neu laden. Mit dem Pi
  entscheiden: weiter auf dem Mac entwickeln und per `git pull` auf dem Pi ausrollen
  (Vorschlag), oder auf dem Pi direkt arbeiten. Der Mac-Container bleibt dann als
  Entwicklungsumgebung.
- **Fallstrick 9 gilt auch dort:** `nginx.conf` ist eine einzeln eingehängte Datei und braucht
  nach Änderungen einen Container-Neustart.
- **Sicherung:** Auf dem Pi liegt nur `config.js` außerhalb von Git. Eine Kopie davon
  gehört an einen sicheren Ort (nicht ins Repo).
- **Reihenfolge zur mobilen Version:** Der Pi ist die Grundlage für Phase 2 (Zugriff von
  außen). Er sollte **vor** Phase 2 stehen, weil der Mac nicht rund um die Uhr läuft.
- **Passende Pi-Version:** Pi 4 oder 5 reicht weit; die App ist statisch. Auch ein Pi Zero 2 W
  würde gehen. SD-Karten sterben bei Dauerbetrieb, besser SSD oder eine hochwertige Karte.

## Betrieb

- **Fernzugriff (Tailscale).** Ohne ihn ist die App nur im Heim-WLAN erreichbar; To-Dos oder
  Einkaufsliste unterwegs zu pflegen geht damit nicht.
- **Kiosk-Modus fürs iPad.** Header ausblenden, Sidebar sichtbar lassen. Erster Versuch mit
  der kiosk-mode-Integration scheiterte.

  Randnotiz seit 28.07.2026: Auf "Heute" blendet die App ihre Kopfzeile ohnehin selbst aus.
  Falls es beim Kiosk-Modus nur darum ging, wäre das Thema kleiner als gedacht — vor einem
  neuen Anlauf klären, was genau stören sollte.
- **`Dockerfile` ist tote Doku.** Es kopiert den Ordner ins Image und kennt `nginx.conf` nicht,
  während der Container real mit zwei Volume-Mounts gestartet wird:

  ```
  docker run -d --name familienkalender -p 8080:80 \
    -v <projekt>:/usr/share/nginx/html:ro \
    -v <projekt>/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
    nginx:alpine
  ```

  Entweder angleichen oder löschen.
