# Umsetzungsplan: Ansicht „Projekte"

> **Stufe 1 und 2 sind am 03.08.2026 gebaut.** Ansicht, Phasen, Zuweisung, Notiz,
> Zieldatum, Bild-Upload und Archiv laufen. Stufe 3 (Schritte je Projekt) steht noch aus.
> Entschieden: Phasen wie vorgeschlagen, Zuweisung wie bei den Aufgaben, fertige Projekte
> bleiben im Archiv.

Projekte sind die größeren Vorhaben („ETF-Plan für die Kinder", „Regal hinter Eingangstür",
„Staubsauger-Garage"), Aufgaben die kleinen Erledigungen. **Die Einordnung passiert von
Hand** — wer etwas anlegt, entscheidet, wo es hingehört. Keine Automatik, keine Logik in
Home Assistant, kein Verschieben zwischen den beiden Listen.

---

## 1. Die Bilderfrage ist geklärt

Im Backlog steht unter „Profil-Dashboard": *HAs `image_upload` geprüft und verworfen, weil
das Ausliefern einen Authorization-Header verlangt, den ein `<img src>` nicht senden kann.*

**Das stimmt nicht mehr.** Am 03.08.2026 gegen HA 2026.7.3 nachgemessen:

| Schritt | Aufruf | Ergebnis |
|---|---|---|
| Hochladen | `POST /api/image/upload`, multipart, Feld `file` | `{id, filesize, content_type, name, uploaded_at}` |
| Ausliefern | `GET /api/image/serve/<id>/512x512` | **HTTP 200 ohne Token** |
| Auflisten | WebSocket `image/list` | Array aller Bilder |
| Löschen | WebSocket `image/delete` `{image_id}` | funktioniert |

Ein `<img src="…/api/image/serve/<id>/512x512">` reicht also. Kein Blob-Laden, keine
signierten Pfade. Größen sind frei wählbar (`512x512`, `original`, …), HA skaliert selbst.
Abgelegt wird unter `config/image/<id>/`, überlebt Neustarts.

> Die Backlog-Notiz „nicht erneut untersuchen" ist damit hinfällig und sollte korrigiert
> werden — sie würde sonst auch das Profil-Dashboard weiter blockieren.

**Trotzdem clientseitig verkleinern.** Ein iPhone-Foto sind 3–5 MB. Vor dem Upload über ein
Canvas auf max. 1600 px längste Kante und JPEG q0.8 rechnen — landet bei 200–400 KB. Sonst
läuft `config/image/` voll und das Wandtablet lädt ewig.

---

## 2. Datenmodell

Eine eigene Local-To-do-Liste `todo.projekte`, ein Eintrag je Projekt — dasselbe Muster wie
bei den Aufgaben, damit nichts Neues dazukommt.

| Feld | Woher | Inhalt |
|---|---|---|
| `summary` | To-do-Titel | Projektname |
| `status` | To-do-Status | `needs_action` / `completed` |
| `due` | To-do-Fälligkeit | optionales Zieldatum |
| `description` | JSON | alles andere |

```json
{
  "phase": "laeuft",
  "people": ["seb"],
  "notiz": "Maße: 82 × 190 cm. Kallax passt nicht, zu tief.",
  "bilder": ["a1b2c3…", "d4e5f6…"],
  "schritte": [{ "text": "Maße nehmen", "done": true },
               { "text": "Holz zuschneiden lassen", "done": false }]
}
```

- **`phase`** — `idee` / `laeuft` / `wartet` / `fertig`. Der To-do-Status allein reicht nicht:
  „wartet auf Lieferung" ist weder offen noch erledigt. `fertig` und `completed` werden
  zusammen gesetzt, damit die Liste auch in der HA-App stimmig aussieht.
- **`bilder`** — nur die IDs. Das erste Bild ist das Titelbild der Karte.
- **`schritte`** — optional, siehe Stufe 3.

Wiederverwendet wird `parseTaskMeta`-Logik aus `todo-view.js` und `DayStore` als Speicher-
muster; die Personen kommen aus `CONFIG.taskProfiles` wie bei den Aufgaben.

**Voraussetzung, die du einmal in HA anlegen musst:** Einstellungen → Geräte & Dienste →
Integration hinzufügen → **Local To-do**, Name „Projekte". Das ist ein Config-Flow, den kann
ich nicht von außen anstoßen — genau wie damals bei `todo.aufgaben`.

---

## 3. Die Ansicht

Kachelraster wie HelloFresh, weil Projekte ein Bild tragen und Aufgaben nicht. Damit
unterscheiden sich die beiden Ansichten auf den ersten Blick, obwohl sie dieselbe Technik
nutzen.

**Karte** — Titelbild (oder getönte Fläche mit Initiale, wenn kein Bild da ist),
Projektname in Newsreader, Phasen-Chip, Avatare der Beteiligten, zwei Zeilen Notiz,
bei Schritten ein „3 von 7" mit Balken.

**Gruppierung** nach Phase, in der Reihenfolge Läuft → Wartet → Idee → Fertig. Fertige
klappen als eine Zeile zusammen, wie „zuletzt gekauft" in der Einkaufsliste.

**Detail-Dialog** (bestehendes `Modal`) — Notiz bearbeiten, Phase umschalten, Personen
zuweisen, Bilder ansehen/hinzufügen/löschen, Projekt löschen.

**Bilder hinzufügen** über `<input type="file" accept="image/*" multiple>`. Auf dem iPad
bietet Safari damit von sich aus Kamera oder Mediathek an — kein Sonderweg nötig.

**Farben** aus dem bestehenden System: Phasen bekommen die Pastellfamilien
(Läuft = Himmel, Wartet = Aprikose, Idee = Flieder, Fertig = Minze). Korall bleibt frei.

---

## 4. Reihenfolge

**Stufe 1 — Grundgerüst** (der eigentliche Wunsch)
`todo.projekte` in `config.js`, neuer Sidebar-Eintrag zwischen To-Dos und HelloFresh,
`js/projekte-view.js` mit Kachelraster und Detail-Dialog, Anlegen/Bearbeiten/Löschen,
Phasen. Noch ohne Bilder.

**Stufe 2 — Bilder**
`js/bild-upload.js` als kleiner Helfer: verkleinern, hochladen, URL bauen, löschen.
Im Dialog eine Bildergalerie, das erste Bild wird Titelbild. Beim Löschen eines Projekts
gehen seine Bilder mit — sonst bleiben Waisen in `config/image/` liegen.

**Stufe 3 — Schritte je Projekt** *(optional, nicht bestellt)*
Eine Checkliste im Projekt, Fortschritt auf der Karte. Sinnvoll bei „Regal hinter
Eingangstür", überflüssig bei „ETF-Plan". Würde ich erst bauen, wenn Stufe 1 und 2 im
Alltag stehen — vorher weiß niemand, ob es fehlt.

---

## 5. Was bewusst nicht dazugehört

- **Kein Verschieben zwischen Aufgaben und Projekten.** Wer sich vertut, legt es neu an.
  Eine Umzugsfunktion wäre Aufwand für einen seltenen Fall.
- **Keine Erinnerungen oder Fristen mit Logik.** Das Zieldatum ist reine Anzeige.
- **Keine Verknüpfung zum Kalender.** Ein Projekt ist kein Termin.
- **Kein Dateianhang außer Bildern.** PDFs bräuchten einen anderen Speicherweg
  (`media_source`), und ein PDF auf dem Wandtablet zu lesen ist ohnehin unangenehm —
  dieselbe Frage steht schon bei den HelloFresh-Rezepten offen.

---

## 6. Offene Entscheidungen

1. **Phasen-Namen** — „Idee / Läuft / Wartet / Fertig" ist mein Vorschlag. Andere Wörter?
   Reichen drei?
2. **Wer sieht was** — Projekte allen Profilen zuweisbar wie Aufgaben, oder braucht es das
   gar nicht? „Staubsauger-Garage" hat vermutlich keinen Besitzer.
3. **Fertige Projekte** — dauerhaft behalten (als Archiv, mit Bildern) oder nach einiger
   Zeit weg? Behalten heißt, `config/image/` wächst langsam mit.
