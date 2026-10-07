# Familienkalender

> Anweisungen für alle Coding-Agenten (Claude Code, Codex, Cursor, Copilot …).
> Claude Code liest `CLAUDE.md`, das nur hierher verweist.

Eigene Web-App als Familien-Dashboard auf einem Wandtablet (iPad, quer, ~1080 × 810).
Home Assistant ist reine Datenschicht — **kein Lovelace**, das war eine bewusste
Entscheidung.

## Wo was läuft

| | |
|---|---|
| App | `familienkalender-app/`, statische Dateien, nginx im Docker-Container `familienkalender` auf **Port 8080** |
| Änderungen | Bind-Mount, **kein Build** — Datei speichern, Seite neu laden, fertig. Gilt nicht für `nginx.conf`, siehe Fallstrick 9 |
| Home Assistant | Docker-Container `homeassistant`, erreichbar unter `http://192.168.178.171:8123` |
| HA-Konfiguration | Liegt beim Betreiber lokal (dort `~/homeassistant-config`, in HA-Container als `/config`), **nicht im Repo**. Der leere Ordner `homeassistant-config/` im Repo-Stamm ist ein Überrest und wird ignoriert |
| Zugangsdaten | `familienkalender-app/js/config.js` (nicht eingecheckt), Vorlage in `config.example.js` |

## Einrichtung auf einem neuen Rechner

1. **Zugangsdaten:** `familienkalender-app/js/config.example.js` nach `config.js` kopieren,
   HA-Adresse und Long-Lived Token eintragen. `config.js` steht in `.gitignore` — nie einchecken.
2. **App starten:** Docker-Container `familienkalender` mit nginx, der `familienkalender-app/`
   als Bind-Mount einhängt, Port 8080 (siehe `familienkalender-app/Dockerfile`, `nginx.conf`).
3. **Home Assistant** muss laufen und diese Teile haben (die legt die App **nicht** selbst an):
   - Integration *Local To-do* mit den Listen `todo.aufgaben`, `todo.projekte`, `todo.kitazoe`
     (und `todo.hellofreshgerichte` für App-Zustand)
   - Integration *Bring!* (`todo.einkaufen`, `todo.dm`) plus von Hand installiert `bring_shopping`
   - Integration *HelloFresh* (nur für die Menü-Ansicht)
   - Kalender je Person (iCloud/CalDAV) und ein geteilter Kalender, Wetter-Entity
   - `image_upload` für Projektbilder
4. Entity-Namen stehen in `config.js`. Abweichende Namen dort anpassen, nicht im Code.
5. **Kein Build, keine Tests.** Prüfen heißt: im Browser öffnen, Konsole ansehen.

## Aufbau der App

Kein Modulsystem, kein Bundler. `index.html` lädt alle `js/*.js` der Reihe nach, jede Datei
legt ein globales Objekt an. Reihenfolge in `index.html` beachten, wenn etwas dazukommt.

**Ansichten** — `TodayView`, `CalendarView`, `ShoppingView`, `TodoView`, `ProjekteView`,
`HelloFreshView`. Umschaltung in `app.js` (`VIEWS` + `switchView`).

**Helfer** — `HaApi` (REST), `HaWs` (WebSocket), `DayStore` (Schlüssel-Wert-Speicher),
`Modal`, `BildUpload`, `KitaCard`, `DaySummary`, `WeatherModal`, `OpenMeteo`
(Stundenvorhersage samt Regenwahrscheinlichkeit, siehe Fallstrick 11).

## Gestaltung

`DESIGN.md` ist verbindlich: Pastellsystem 1:1 aus dem Skylight-Kalender, Tokens in
`css/tokens.css`, Schriften Newsreader + Figtree selbst gehostet in `css/fonts/`.

Beim Arbeiten am CSS gilt:

- **Keine neuen Hex-Werte.** Farben kommen aus `--c-*` oder den Rollen
  `--ok-*` / `--warn-*` / `--hinweis-*`.
- **Keine neuen Schriftgrößen.** Skala ist `--t-display` bis `--t-label`.
- **Bauteile wiederverwenden:** `.chip` (mit `--person`, `--stark`, `--geist`, `--klein`,
  `--icon`, `--seg`, `--count`), `.check`, `.empty`, `.card`, `.btn-primary`. Es gab schon
  einmal sieben Klassen für dieselbe Pille — nicht wieder anfangen.
- Korall (`--c-korall`) ist die **einzige** Signalfarbe: heute, dringend, überfällig.
  Nicht für Dekoration verwenden.

## Wie Daten in HA abgelegt werden

Die App hat kein eigenes Backend. Alles, was sie selbst speichert, liegt in
**Local-To-do-Listen**: Titel = Schlüssel, Beschreibung = JSON. Das Muster kapselt
`DayStore`.

| Liste | Inhalt |
|---|---|
| `todo.aufgaben` | Aufgaben, `{"people":[…],"emoji":"…","repeat":"…"}` |
| `todo.projekte` | Projekte, `{"phase":…,"people":[…],"notiz":…,"bilder":[…]}` |
| `todo.kitazoe` | Kita-Tageszustand **und** App-Zustand (`meal:`-Präfix, `gekocht:`-Präfix) |
| `todo.einkaufen`, `todo.dm` | Bring!-Listen (echte Integration, nicht unser Speicher) |

**Bilder** liegen in HAs `image_upload` (`config/image/`). Hochladen über
`POST /api/image/upload`, ausliefern über `GET /api/image/serve/<id>/<maß>` — **ohne Token
erreichbar**, ein normales `<img src>` genügt. Verwalten über WebSocket `image/list` und
`image/delete`. Siehe `js/bild-upload.js`.

## Fallstricke — hier stecken die Stunden drin

1. **Kalender: HA kann nur `create_event`.** Kein Ändern, kein Löschen. Termine, die die App
   anlegt, müssen in der Apple-Kalender-App entfernt werden. Vor dem Anlegen von Testdaten
   bedenken.
2. **CalDAV-To-do-Listen sind kaputt.** Abhaken und Löschen brechen mit HTTP 500
   (`todo.erinnerungen`). Deshalb überall **Local To-do**, nie CalDAV.
3. **`bring_shopping` ist von Hand installiert**, nicht über HACS. Updates kommen nicht
   automatisch; die HACS-Update-Entität gilt nur der gleichnamigen Lovelace-Karte.
4. **Kategorien der Einkaufsliste kommen aus zwei Quellen.** `bring_shopping` füllt
   `category` nur bei selbst angelegten Artikeln, Standardartikel kommen aus dem
   mitgelieferten Katalog (`js/bring-katalog.js`). Beide brauchen, nicht eine.
5. **Bring-Bild-URLs sind bei Umlauten falsch** (`käse.png` statt `kaese.png`). `bringBildUrl()`
   baut den Slug selbst nach.
6. **HelloFresh meldet abgelaufene Anmeldungen nicht.** Ein toter Refresh-Token kommt als
   HTTP 400 `invalid_grant`, die Integration hält das für „transient" und HA zeigt **keine
   Schaltfläche zum Neuanmelden**. Reparatur: HA stoppen, in
   `.storage/core.config_entries` die Token-Felder aus dem HelloFresh-Eintrag löschen,
   HA starten — dann meldet sie sich mit den gespeicherten Zugangsdaten neu an. Erkennbar an
   `binary_sensor.hellofresh_de_write_actions_available = off`.
7. **`loading="lazy"` funktioniert im Kiosk-Betrieb nicht zuverlässig** — Bilder bleiben
   leer. Nicht verwenden.
8. **`color-mix()` wird produktiv genutzt** (Personenfarben, Terminflächen). Setzt
   Safari 16.4+ voraus. Läuft auf dem iPad.
9. **`nginx.conf` braucht einen Container-Neustart.** Sie ist als *einzelne Datei*
   eingehängt. Editoren schreiben beim Speichern eine neue Datei und benennen sie um — der
   Container hält dann weiter die alte. `nginx -t` meldet dann Fehler, die zum Inhalt auf
   der Platte nicht passen. `docker restart familienkalender` hängt den Mount neu ein,
   danach greift `nginx -s reload` wieder wie gewohnt.
10. **Die Rezeptkarten laufen über einen Proxy im eigenen nginx.** `/rezeptkarte/<id>-de-DE.pdf`
   holt die PDF-Karte von hellofresh.de und ersetzt zwei Kopfzeilen: `X-Frame-Options`
   (sonst bliebe das `<iframe>` leer) und `Content-Disposition: attachment` (sonst lädt
   Safari die Karte herunter, statt sie zu zeigen). Nur für gelieferte Wochen — künftige
   antworten mit 403. Die Route hält eine Woche im Cache; ändert sich etwas an ihren
   Kopfzeilen, muss `RezeptModal.VERSION` hoch, sonst bleiben Geräte auf der alten Antwort
   sitzen. Siehe `js/rezept-modal.js`.
11. **Die Regenwahrscheinlichkeit kommt nicht aus HA.** met.no liefert sie für Deutschland
   nicht (das Feld ist in `met/const.py` zugeordnet, kommt aber nie an), und HAs eingebaute
   Open-Meteo-Integration fragt sie gar nicht erst ab. Deshalb holt `js/weather-modal.js`
   den Stundenverlauf direkt bei Open-Meteo — die einzige Stelle, an der die App an HA
   vorbei mit einem fremden Dienst spricht. Ohne Schlüssel, CORS ist erlaubt, Koordinaten
   kommen aus `/api/config`. **Immer `models=icon_seamless` mitgeben:** Ohne Modellangabe
   mischt Open-Meteo Menge und Wahrscheinlichkeit aus verschiedenen Modellen, dann steht
   „2,9 mm" neben „0 %". Der UV-Index fehlt in dieser Modellkette und kommt aus
   `best_match` im selben Aufruf.
12. **Das Datum im Browser kann vom Host abweichen.** Vor datumsabhängiger Arbeit einmal
   `date` prüfen, nicht der Kopfzeile der App glauben — hat schon einen Satz Testtermine in
   die Vergangenheit gelegt. Am 15.08.2026 lag der Vorschau-Browser **zehn Tage zurück**
   (zeigte den 05.08.), während Host, HA-Container und externe Dienste einig waren. Bei
   Zweifeln eine Quelle außerhalb der Maschine fragen:
   ```
   curl -sI https://www.hellofresh.de/ | grep -i ^date
   ```

## Vorgehen

- **Nach Änderungen im Browser prüfen:** `http://localhost:8080` öffnen, Viewport 1080 × 810.
  Konsole auf Fehler ansehen.
- **Schreibzugriffe auf HA sparsam.** Einkaufsliste und Kalender sind mit der Familie
  geteilt — dort landende Testeinträge sehen alle. Was doch angelegt wird, gehört in
  `TESTDATEN.md`.
- **Erst messen, dann behaupten.** Mehrere Annahmen in der Doku waren falsch (siehe
  Punkt 6 und die `image_upload`-Frage). Bei Zweifeln die HA-API direkt fragen.

## Weiterführende Dateien

| Datei | Inhalt |
|---|---|
| `DESIGN.md` | Farbsystem, Schriftskala, Bauteile, Nachtmodus-Entwurf |
| `BACKLOG.md` | Offene Punkte, verworfene Ideen mit Begründung, bekannte Grenzen |
| `PROJEKTE-PLAN.md` | Datenmodell und Stand der Projekte-Ansicht |
| `AKTIVITAETEN-PLAN.md` | Konzept für die Aktivitäten-Ansicht (Planungspate, Ideenpool) — nichts gebaut |
| `TESTDATEN.md` | Was an Testeinträgen in HA liegt und wie es wieder wegkommt |
