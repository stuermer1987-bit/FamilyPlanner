# Konzept: Ansicht „Aktivitäten"

> **Stand 03.08.2026 — Konzept, nichts gebaut.** Geschrieben auf Wunsch: „Mental Load
> reduzieren, hinterlegen wer für welchen Tag etwas plant, Aktivitäten zur Auswahl, wer
> nimmt teil, Ideen möglicherweise aus gespeicherten Instagram-Posts."

---

## 1. Worum es eigentlich geht

Der Wunsch klingt nach einer Ideensammlung, ist aber keine. Die Arbeit, die den Mental Load
ausmacht, zerfällt in drei Teile — und nur einer davon ist „Ideen haben":

| | Unsichtbare Arbeit | Was die App dagegen tun kann |
|---|---|---|
| 1 | **Daran denken**, dass Samstag noch leer ist | Leere Tage sichtbar machen, bevor sie da sind |
| 2 | **Etwas finden**, das zu Wetter, Alter und Laune passt | Vorrat anlegen und passend vorfiltern |
| 3 | **Entscheiden und organisieren** — wer kommt mit, was muss mit | Zuständigkeit benennen, Packliste anhängen |

Ein reiner Ideenkatalog löst nur Teil 2 — und zwar den, der am wenigsten weh tut. Wer alle
drei Teile trägt, ist danach genauso erschöpft, hat aber jetzt zusätzlich eine Liste zu
pflegen.

**Kernstück ist deshalb nicht der Katalog, sondern der Planungspate:** Für jeden Tag (oder
jedes Wochenende) steht ein Name dran, gut sichtbar am Wandtablet. Der Katalog ist die
Zuarbeit dazu — damit „du bist dran" nicht heißt „fang bei Null an".

Das ist auch die Antwort auf die Frage, warum das nicht einfach eine weitere Aufgabe in
`todo.aufgaben` sein kann: Eine Aufgabe hat einen Erledigungshaken, aber keinen Vorrat, kein
Wetter, keine Teilnehmer und keinen Rückblick.

---

## 2. Drei Bausteine

1. **Ideenpool** — was man mit dieser Familie überhaupt machen kann. Wächst nebenbei, wird
   nicht „gepflegt".
2. **Wochenplan** — je Tag: wer plant, was ist geplant, wer ist dabei, wie fest ist es.
3. **Rückblick** — war es gut, wann zuletzt. Ohne das verrottet der Pool innerhalb weniger
   Monate zu einer Liste, die niemand mehr aufmacht.

---

## 3. Datenmodell

Zwei neue Local-To-do-Listen, dasselbe Muster wie überall sonst (`DayStore`, Titel =
Schlüssel, Beschreibung = JSON). Kein neues Speicherkonzept.

| Liste | Ein Eintrag ist | Titel |
|---|---|---|
| `todo.aktivitaeten` | eine Idee | Name der Aktivität |
| `todo.aktivitaetsplan` | ein Tag | ISO-Datum, wie bei der Kita-Karte |

### Idee — `todo.aktivitaeten`

```json
{
  "ort": "draussen",
  "dauer": 120,
  "kategorie": "natur",
  "saison": ["fruehling", "sommer", "herbst"],
  "alter": [1, 6],
  "fahrt": 15,
  "kosten": "gratis",
  "notiz": "Parkplatz an der Nordseite. Wickeltisch im Café, Bollerwagen lohnt.",
  "bilder": ["<image_id>"],
  "quelle": "https://www.instagram.com/p/…",
  "zuletzt": "2026-05-12",
  "anzahl": 3,
  "daumen": 1
}
```

- **`ort`** — `drinnen` / `draussen` / `egal`. Der wichtigste Filter, weil er direkt am
  Wetter hängt, das die App ohnehin schon hat.
- **`dauer`, `fahrt`** — grobe Minuten. „Zwei Stunden, eine Viertelstunde Fahrt" ist die
  Frage, die am Samstagvormittag wirklich gestellt wird.
- **`alter`** — von/bis. Zoe ist 2, Romy jünger; die Hälfte aller Ausflugsideen aus dem
  Internet passt erst ab 6.
- **`notiz`** — **das wertvollste Feld.** Ein Instagram-Bild sagt nichts über Parkplatz,
  Wickelmöglichkeit oder Öffnungszeiten. Was hier steht, spart beim nächsten Mal die
  Recherche.
- **`zuletzt`, `anzahl`, `daumen`** — Rückblick. `daumen`: `-1` nie wieder, `0` neutral,
  `1` gern wieder.

### Tag — `todo.aktivitaetsplan`, Titel `2026-08-08`

```json
{
  "planer": "jessi",
  "status": "idee",
  "titel": "Waldspielplatz Grünberg",
  "ideeUid": "…",
  "teilnehmer": ["seb", "jessi", "zoe"],
  "zeit": "14:00",
  "notiz": "Bollerwagen mit"
}
```

- **`status`** — `offen` (niemand kümmert sich) / `idee` (Vorschlag steht) / `fix` /
  `gewesen` / `abgesagt`. `offen` ist der eigentliche Signalzustand: Das ist der Mental
  Load, sichtbar gemacht.
- **`ideeUid` ist optional.** „Zu Oma" steht in keinem Pool und muss trotzdem eintragbar
  sein. Freier Text ist der Normalfall, die Pool-Verknüpfung der Komfortfall.
- **`teilnehmer`** — Zusage, nicht Zuweisung. Wer antippt, kommt mit.

### Ein Problem, das dabei auffällt

`CONFIG.taskProfiles` kennt nur Familie, Seb und Jessi — **die Kinder fehlen dort**, sie
stehen nur in `CONFIG.calendars`. Für „wer nimmt teil" braucht es aber genau Zoe und Romy.
Damit läuft dieses Konzept in denselben Punkt, der im `BACKLOG.md` unter
„Familienprofile" schon beschrieben ist.

Zwei Wege: die führende `CONFIG.people`-Liste aus dem Backlog vorziehen (sauber, aber
größer als dieses Feature), oder übergangsweise eine eigene Teilnehmerliste in
`CONFIG.aktivitaeten`. Letzteres wäre die vierte Personendefinition in der App — ich würde
davon abraten und stattdessen die Profile vorziehen, sobald die Ansicht mehr als ein
Experiment sein soll.

---

## 4. Die Ansicht

Eigener Sidebar-Eintrag (dann sieben), Vorschlag `🎈 Aktivitäten`, zwischen Projekte und
HelloFresh.

**Kopfzeile** — ein Satz in Newsreader: „Diese Woche plant **Jessi**." Antippen wechselt.
Daneben die Wochenleiste Mo–So mit Statuspunkt je Tag — dasselbe Bauteil wie die Tagesleiste
der Kita-Karte, das hat sich bewährt.

**Linke Spalte: der Wochenplan.** Je Tag eine Zeile mit Datum, Planungspate als Avatar,
Aktivität, Teilnehmer-Avataren. Leere Tage stehen nicht leer da, sondern tragen den Knopf
„Ich denke mir was aus" — die Zeile ist der Ort, an dem man es direkt erledigen kann, wie
bei „Abholzeit noch nicht abgesprochen".

Bereits eingetragene **Kalendertermine des Tages** werden in der Zeile klein mitgeführt.
Sonst wird der Ausflug auf den Zahnarzttermin geplant.

**Rechte Spalte: der Ideenpool.** Kachelraster wie Projekte, weil Ideen ein Bild tragen.
Karte: Titelbild oder getönte Fläche, Name, Chips für drinnen/draußen, Dauer und Fahrtzeit,
darunter unauffällig „zuletzt vor 3 Monaten". Filter als `.chip --seg` obendrüber.

**Detail-Dialog** über das bestehende `Modal` — wie bei Projekten: Felder bearbeiten, Bilder
hinzufügen, Idee löschen, „für einen Tag einplanen".

**Der Vorschlagsknopf** ist der Teil, der die Arbeit wirklich abnimmt: „Was passt zu
morgen?" wirft drei Karten aus, gefiltert nach Wetterprognose, Saison, Alter und „lange
nicht gemacht". Die Prognose liegt schon vor — `TodayView.tomorrowForecast()` holt sie
bereits für den Kleidungshinweis. Ein leeres Eingabefeld erzeugt Arbeit, drei konkrete
Karten mit „Nimm das" nehmen sie weg.

**Anschluss an „Heute"** — eine schmale Zeile, aber nur wenn sie etwas zu sagen hat: ab
Donnerstag, und nur wenn ein Wochenendtag auf `offen` steht. „Samstag ist noch ohne Plan —
Seb ist dran." Sonst nichts.

**Farben** aus dem bestehenden System, keine neuen Werte: Natur = Minze, Kultur = Himmel,
Drinnen = Flieder, Essen = Aprikose, Bewegung = Rose. **Korall bleibt reserviert** für den
einen Fall „Wochenende ohne Plan, und es ist schon Freitag".

---

## 5. Instagram — was geht und was nicht

**Gespeicherte Posts sind über keine offizielle Schnittstelle erreichbar.** Es gibt kein
Endpunkt für „Saved" oder „Collections" und hat nie eins gegeben; die Basic Display API ist
seit Dezember 2024 abgeschaltet, und die Instagram API mit Instagram-Login liefert nur
eigene Medien von Profi-Konten. Die Sammlung ist ausdrücklich privat.

Es kursieren Scraper, die sich mit dem Session-Cookie des eingeloggten Kontos an die interne
Web-API hängen. Davon rate ich ab: gegen die Nutzungsbedingungen, brechen bei jeder
Layout-Änderung, und der Cookie müsste im Klartext neben dem HA-Token in `config.js` liegen.
Für ein Wandtablet in der Küche ist das die falsche Abwägung.

**Was stattdessen funktioniert — das Teilen-Menü.** Ein Apple-Kurzbefehl, der aus jeder App
heraus in die Ideenliste schreibt. Drei Varianten:

| | Weg | Bewertung |
|---|---|---|
| A | Nur den Link teilen → `todo.add_item` | Ein Tipp, aber die Kachel bleibt bildlos. Instagram liefert Vorschaubilder ohne Anmeldung nicht mehr zuverlässig aus. |
| B | **Screenshot des Posts teilen** → Bild nach `POST /api/image/upload`, Eintrag mit Bild-ID anlegen | **Empfehlung.** Nutzt die vorhandene Bildstrecke aus `js/bild-upload.js`, das Wandtablet redet nie mit Instagram, und die Kachel sieht aus wie gewünscht. |
| C | Instagram-Einbettung (`blockquote` + `embed.js`) im Detail-Dialog | Nur für „Original ansehen". Braucht Internet und lädt fremdes JavaScript aufs Tablet. Niedrige Priorität. |

Der Kurzbefehl selbst ist unspektakulär: `POST /api/services/todo/add_item` mit dem
Long-Lived-Token, bei Variante B ein vorgeschalteter Upload. **Der eigentliche Gewinn ist,
dass das für alles mit Teilen-Menü gilt** — Safari-Artikel, eine Apple-Karten-Adresse, ein
WhatsApp-Tipp von der Kita-Freundin. Instagram ist nur ein Fall davon, und nicht der
häufigste.

**Erfassen ist nicht Einsortieren.** Ein per Kurzbefehl angelegter Eintrag hat keine
Beschreibung — er ist eine rohe Idee. Die Ansicht zeigt solche Einträge oben als
„3 neue Ideen einsortieren"; ein Tipp öffnet den Dialog mit den Filter-Chips. Ohne diesen
Schritt füllt sich der Pool mit Links, die niemand wiederfindet, weil sie in keinem Filter
auftauchen. Der Schritt muss zehn Sekunden dauern, nicht zwei Minuten.

---

## 6. Vorschläge, die über das Bestellte hinausgehen

Nach Nutzen sortiert, alle optional:

1. **Rotation des Planungspaten.** Kalenderwoche gerade → Jessi, ungerade → Seb. Steht von
   allein da, muss nicht ausgehandelt werden. Überschreibbar bleibt es trotzdem.
2. **Mitbringen-Liste je Idee.** „Bollerwagen, Ersatzsachen, Brotdose" am Pool-Eintrag; ein
   Tipp legt daraus Aufgaben in `todo.aufgaben` an oder Artikel auf die Einkaufsliste. Das
   ist die zweite unsichtbare Arbeit, und sie ist bei uns schon verdrahtet.
3. **Rückblick mit Foto.** Nach einer Aktivität ein Bild und ein Satz. Setzt `zuletzt` und
   `anzahl`, füttert den Vorschlagsknopf — und nebenbei entsteht ein Familienarchiv, ohne
   dass es dafür eine eigene Ansicht braucht.
4. **Schlechtwetter-Reserve.** Drei Ideen als „geht immer, drinnen, ohne Vorbereitung"
   markieren. Der Vorschlagsknopf greift darauf zurück, wenn sonst nichts passt.
5. **Wiederkehrendes ohne Planung.** Krabbelgruppe dienstags, Schwimmen samstags — im Plan
   als feste Einträge, damit die Woche nicht leerer aussieht als sie ist.
6. **Bewusst nicht:** Punkte, Sterne, Streaks oder ein Belohnungssystem. Das Skylight-Vorbild
   hat das, und bei den Aufgaben wurde es schon einmal begründet verworfen — kein Grund, es
   hier durch die Hintertür einzuführen.

---

## 7. Verhältnis zum Kalender

**Standardmäßig entstehen keine Kalendereinträge.** Grund ist Fallstrick 1 aus `CLAUDE.md`:
HA kann nur `create_event`, nicht ändern oder löschen. Ein verschobener Ausflug ließe sich
nur in der Apple-Kalender-App wieder aufräumen — bei einer Planung, die sich naturgemäß oft
ändert, wäre das eine Falle.

Der Plan lebt deshalb in seiner eigenen Liste. Wird etwas `fix`, bietet der Dialog einen
Knopf „in ‚Die Sturms' eintragen" — mit dem Hinweis daneben, dass das nur in eine Richtung
geht.

---

## 8. Was bewusst nicht dazugehört

- **Kein Import aus Instagram per Scraping.** Begründung in Abschnitt 5.
- **Keine Automatik, die Aktivitäten selbst einplant.** Vorschlagen ja, eintragen nein.
- **Keine Karte und keine Geodaten.** HA kann ohne zusätzlichen Dienst nicht geocodieren —
  dieselbe Wand, an der im Backlog schon „Wetter am Ort des Termins" hängt. Fahrtzeit bleibt
  eine von Hand geschätzte Zahl.
- **Keine Erinnerungen aufs Handy.** Setzt Fernzugriff voraus (Tailscale, siehe Backlog).
- **Keine Sternebewertung.** Ein Daumen reicht, und selbst der ist optional.
- **Kein Teilen mit anderen Familien.**

---

## 9. Reihenfolge

| Stufe | Inhalt | Aufwand |
|---|---|---|
| **1** | Wochenplan + Planungspate, ohne Pool. Freier Text als Aktivität. | klein — eine Liste, eine Ansicht |
| **2** | Ideenpool: Kacheln, Filter, Detail-Dialog, Bilder. | mittel — nah an `projekte-view.js` |
| **3** | Posteingang + Apple-Kurzbefehl (Variante B). | klein in der App, etwas Fummelei am Kurzbefehl |
| **4** | Vorschlagsknopf mit Wetter/Saison/„lange nicht" + Zeile in „Heute". | klein, Daten liegen vor |
| **5** | Mitbringen-Liste, Rückblick mit Foto. | mittel |

**Stufe 1 allein ist schon der halbe Nutzen.** Sie beantwortet „wer denkt sich diese Woche
was aus" und macht leere Tage sichtbar — beides ohne eine einzige gespeicherte Idee. Ich
würde sie eine Woche im Alltag laufen lassen, bevor Stufe 2 gebaut wird; erst dann weiß man,
ob der Pool wirklich fehlt oder ob die Ideen ohnehin im Kopf sind.

---

## 10. Voraussetzungen in Home Assistant

Zwei Local-To-do-Listen anlegen — Einstellungen → Geräte & Dienste → Integration hinzufügen
→ **Local To-do**, Namen „Aktivitäten" und „Aktivitätsplan". Das ist ein Config-Flow, der
lässt sich nicht von außen anstoßen, genau wie damals bei `todo.aufgaben` und `todo.projekte`.

Für Stufe 3 zusätzlich ein Apple-Kurzbefehl auf dem iPhone mit dem bestehenden
Long-Lived-Token.

---

## 11. Offene Entscheidungen

1. **Planungspate — feste Rotation oder frei antippbar?** Rotation nimmt die Aushandlung
   weg, kann sich aber falsch anfühlen. Mein Vorschlag: Rotation als Vorbelegung,
   überschreibbar.
2. **Jeder Tag oder nur Wochenenden und Feiertage?** Werktags ist selten Luft für einen
   Ausflug; sieben offene Tage je Woche könnten mehr Druck erzeugen als sie abnehmen.
   Vorschlag: Fr–So plus Feiertage, Werktage aufklappbar.
3. **Teilnehmer** — dafür braucht es Profile für Zoe und Romy. Backlog-Punkt
   „Familienprofile" vorziehen oder übergangsweise eine eigene Liste?
4. **Zwei Listen oder eine mit Präfix** (`idee:` / `plan:`)? Zwei sind sauberer, eine spart
   einen Config-Flow.
5. **Eigener Sidebar-Eintrag** (dann sieben) oder als Block in „Heute" plus Reiter im
   Kalender?
6. **Wie groß wird der Pool realistisch?** Bei 15 Ideen ist ein Filter Zierde, ab etwa 40
   trägt er. Das entscheidet, wie viel Aufwand in Stufe 2 gerechtfertigt ist.
