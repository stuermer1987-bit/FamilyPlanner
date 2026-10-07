# FamiliyPlanner (Familienkalender)

Familien-Dashboard als eigene Web-App für ein Wandtablet (iPad, quer, ca. 1080 × 810).
Home Assistant liefert nur die Daten. Es gibt kein Lovelace.

## Start

1. `familienkalender-app/js/config.example.js` nach `config.js` kopieren und Werte eintragen
   (HA-Adresse, Token, Kalender). `config.js` wird nicht eingecheckt.
2. App mit nginx ausliefern (siehe `familienkalender-app/Dockerfile` und `nginx.conf`), Port 8080.
3. Es gibt keinen Build. Datei speichern, Seite neu laden.

## Dateien

| Datei | Inhalt |
|---|---|
| `AGENTS.md` | Anweisungen für Coding-Agenten: Einrichtung, Aufbau, Datenhaltung in HA, Fallstricke (`CLAUDE.md` verweist darauf) |
| `familienkalender-app/DESIGN.md` | Farben, Schriften, Bauteile |
| `familienkalender-app/BACKLOG.md` | Offene Punkte und verworfene Ideen |
| `familienkalender-app/PROJEKTE-PLAN.md` | Projekte-Ansicht |
| `familienkalender-app/AKTIVITAETEN-PLAN.md` | Konzept Aktivitäten-Ansicht |
| `familienkalender-app/TESTDATEN.md` | Testeinträge in HA und ihr Aufräumen |
