# Testdaten — angelegt am 02.08.2026

Angelegt, um das Designkonzept mit echten Daten sichtbar zu machen (Mehrpersonentermine,
Sektionen in der Einkaufsliste, Personentönung bei den Aufgaben). **Alles hier darf weg.**

> **Wichtig beim Aufräumen:** Auf der Einkaufsliste und im Kalender stehen auch echte
> Einträge. Nur löschen, was unten aufgeführt ist — nicht die Listen leeren.

---

## 1. Kalender — muss in der Apple-Kalender-App gelöscht werden

Home Assistants CalDAV-Integration kennt nur `create_event`, kein Löschen (geprüft am
02.08.2026: die Domain `calendar` bietet nur `create_event` und `get_events`). Die App kann
diese Termine also **nicht** entfernen.

Alle Testtermine tragen im Beschreibungsfeld die Zeile:

```
TESTDATEN – von Claude angelegt, darf gelöscht werden.
```

Danach lässt sich in der Kalender-App suchen.

### Erste Fuhre — versehentlich auf der Vorwoche (28.–31.07.)

Ich hatte mich am Datum vertan; diese Termine liegen in der Vergangenheit und tauchen im
Dashboard nicht mehr auf. Löschen trotzdem nicht vergessen.

| Datum | Zeit | Titel | Kalender |
|---|---|---|---|
| 28.07. | 18:00–19:30 | Sport | Seb |
| 29.07. | 09:00–10:00 | Zahnarzt Zoe | Zoe |
| 29.07. | 09:30–10:30 | Kinderturnen | Romy |
| 30.07. | 16:00–19:00 | Sommerfest Kita | Zoe, Romy, Seb |
| 31.07. | 15:00–18:00 | Oma & Opa Besuch | Zoe, Romy |
| 01.08. | ganztägig | Ferienbeginn | Die Sturms |
| 02.08. | 11:00–14:00 | Brunch bei Kerstin | Die Sturms |

### Zweite Fuhre — die sichtbare Woche (02.–07.08.)

| Datum | Zeit | Titel | Kalender | zeigt |
|---|---|---|---|---|
| 02.08. | 18:00–19:30 | Sport | Seb | Einzeltermin |
| 03.08. | 09:00–10:00 | Zahnarzt Zoe | Zoe | überlappt mit Kinderturnen |
| 03.08. | 09:30–10:30 | Kinderturnen | Romy | Spaltenaufteilung |
| 03.08. | 19:00–20:30 | Elternabend Kita | Seb, **Die Sturms** | geteilt → keine Streifen |
| 04.08. | 16:00–19:00 | Sommerfest Kita | Zoe, Romy, Seb | **drei Personen, gestreift** |
| 05.08. | 15:00–18:00 | Oma & Opa Besuch | Zoe, Romy | **zwei Personen, gestreift** |
| 06.08. | 10:00–13:00 | Schwimmbad | Die Sturms | mit Ort |
| 07.08. | 14:00–15:00 | Friseur Jessi | Seb | Einzeltermin |
| 07.08. | ganztägig | Brückentag | Die Sturms | Ganztagspille |

Mehrpersonentermine entstehen dadurch, dass **derselbe Titel zur selben Zeit in mehreren
Kalendern** steht — die App führt sie zusammen. Beim Löschen also in jedem beteiligten
Kalender entfernen.

### Dritte Fuhre — 15.–22.08.2026, angelegt am 15.08.2026

**Neu: Diese Termine tragen „Test:" im Titel** und sind damit schon im Dashboard als
Testdaten erkennbar — nicht erst beim Öffnen der Beschreibung. Die Suchzeile im
Beschreibungsfeld steht zusätzlich weiterhin drin.

| Datum | Zeit | Titel | Kalender | zeigt |
|---|---|---|---|---|
| Sa 15.08. | 18:00–20:00 | Test: Grillen bei Kerstin | Die Sturms | geteilt → keine Streifen |
| So 16.08. | 10:00–12:00 | Test: Schwimmbad | Die Sturms | mit Ort (Lentpark) |
| Mo 17.08. | 09:00–10:00 | Test: Zahnarzt Zoe | Zoe | überlappt mit Kinderturnen |
| Mo 17.08. | 09:30–10:30 | Test: Kinderturnen | Romy | Spaltenaufteilung |
| Di 18.08. | 16:00–19:00 | Test: Sommerfest Kita | Zoe, Romy, Seb | **drei Personen, gestreift** |
| Mi 19.08. | 19:00–20:30 | Test: Elternabend | Seb | Einzeltermin |
| Do 20.08. | ganztägig | Test: Brückentag | Die Sturms | Ganztagspille |
| Fr 21.08. | 14:00–15:00 | Test: Friseur | Seb | Einzeltermin |
| Sa 22.08. | 15:00–18:00 | Test: Oma & Opa Besuch | Zoe, Romy | **zwei Personen, gestreift** |

Zwölf Einträge in vier Kalendern (die Mehrpersonentermine zählen mehrfach). **Nicht von
mir** und bitte stehen lassen: „Kegeln" (15.08.), „Hello Fresh Box zusammenstellen"
(17.08.), „Power Platform Community Call" und „Ehrenfeld Playdate" (beide 19.08.).

---

## 2. Aufgaben — aus der App löschbar

Liste `todo.aufgaben`. In der To-Do-Ansicht auf das ×.

| Aufgabe | Zuweisung | fällig |
|---|---|---|
| Müll rausbringen | Seb | 28.07. |
| Spülmaschine ausräumen | Seb **und** Jessi | — |
| Turnbeutel packen | Familie | 29.07. |
| Blumen gießen | Jessi | — |
| Fahrradhelm suchen | ohne Zuweisung | — |

„Spülmaschine ausräumen" ist absichtlich doppelt zugewiesen und erscheint deshalb auf zwei
Karten — das ist kein Fehler.

**Nicht von mir:** „Feuchttücher kaufen" stand schon auf der Liste.

---

## 3. Einkaufsliste — in der App abhaken oder in Bring! löschen

Liste `todo.einkaufen` (Bring!, **geteilt** — Jessi sieht diese Artikel ebenfalls).

| Artikel | Menge | landet in |
|---|---|---|
| Bananen | | Obst & Gemüse |
| Brokkoli | | Obst & Gemüse |
| Brot | | Brot & Gebäck |
| Butter | | Milch & Käse |
| Milch | 2-3 Packungen | Milch & Käse |
| Hackfleisch | 500 g | Fleisch & Fisch |
| Spülmaschinentabs | | Ohne Kategorie |

„Spülmaschinentabs" ist bewusst dabei: Der Artikel zeigt, wie ein nicht einsortierbarer
Eintrag aussieht und wo man ihn in `CONFIG.shopping.kategorien` nachträgt.

**Nicht von mir:** „Crème fraîche" und „Joghurt" standen schon auf der Liste.

---

## 4. HelloFresh

Nichts angelegt. Beim Test der Abhak-Funktion ist in `todo.hellofreshgerichte` ein leerer
Eintrag `gekocht:<weekId>` entstanden — harmlos, kann bleiben oder weg.
