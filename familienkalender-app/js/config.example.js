// Kopiere diese Datei zu config.js und trage deine echten Werte ein.
// config.js wird NICHT eingecheckt (siehe .gitignore) - enthält den Zugriffstoken.

const CONFIG = {
  // Basis-URL deiner Home Assistant Instanz, erreichbar vom iPad aus
  // z.B. "http://192.168.1.42:8123" (lokale IP des Mac/Pi)
  haUrl: "http://192.168.1.42:8123",

  // Long-Lived Access Token: HA-Profil -> Sicherheit -> Long-Lived Access Tokens -> erstellen
  haToken: "DEIN_TOKEN_HIER",

  // Familienmitglieder: Kalender-Entity, Anzeigename, Farbe
  calendars: [
    { entity: "calendar.sebastian", name: "Sebastian", color: "#4A90D9" },
    { entity: "calendar.partner", name: "Partner", color: "#E07A5F" },
    { entity: "calendar.kind1", name: "Kind 1", color: "#F4A6A6" },
    { entity: "calendar.kind2", name: "Kind 2", color: "#81B29A" },
    // shared: true = Termin betrifft "alle", bekommt immer diese Farbe (keine Streifen),
    // auch wenn er zusätzlich in einem Personen-Kalender dupliziert ist.
    { entity: "calendar.die_sturms", name: "Die Sturms", color: "#B0A8C9", shared: true },
    // platzhalter: true = die Person steht in der Personenleiste des Kalenders, hat aber
    // (noch) keinen Kalender in HA. Sie wird nicht abgefragt und ist beim Anlegen von
    // Terminen nicht wählbar - sonst liefe beides in einen Fehler.
    // { entity: "calendar.kind3", name: "Kind 3", color: "#F2A357", platzhalter: true },
  ],

  // Bevorzugtes Zeitfenster. Liegen Termine davor/dahinter, wächst die Achse
  // automatisch mit - sonst wären sie unsichtbar.
  dayStartHour: 7,
  dayEndHour: 22,

  // Startwert für die Anzahl der Tagesspalten. Umschaltbar in der Kalender-Toolbar (1/3/5/7);
  // die Wahl wird pro Gerät gemerkt und überschreibt diesen Wert dann.
  // Die Ansicht beginnt immer bei heute.
  daysToShow: 3,

  weatherEntity: "weather.forecast_home",

  // Optional. Der Stundenverlauf im Wetter-Dialog kommt von Open-Meteo, weil met.no für
  // Deutschland keine Regenwahrscheinlichkeit liefert. Open-Meteo kennt nur Koordinaten -
  // keine Stadt, keine PLZ, keinen Stadtteil. Ohne diesen Eintrag werden die Koordinaten
  // von Home Assistant übernommen (Einstellungen → System → Allgemein), was in aller Regel
  // richtig ist. Hier eintragen nur, wenn der Verlauf für einen anderen Ort gelten soll:
  // wetterOrt: { lat: 50.9384, lon: 6.9600 },

  // Optionale Countdown-Chips in der Kopfzeile, z.B.:
  // { label: "Urlaub", emoji: "🌴", date: "2026-08-15" }
  countdowns: [],

  // Bring!-Listen: todo.*-Entities, siehe Einstellungen -> Entitäten -> Filter "todo."
  // Wird von der Heute-Ansicht genutzt und als Rückfallebene der Einkaufsansicht,
  // falls die Zusatzintegration bring_shopping nicht läuft.
  shoppingLists: [
    { entity: "todo.einkaufen", name: "Einkaufen" },
    { entity: "todo.dm", name: "dm" },
  ],

  shopping: {
    // Artikel, die weder Bring noch der mitgelieferte Katalog einsortieren kann.
    // Sie stehen sonst sichtbar unter "Ohne Kategorie" - das ist der Hinweis, hier
    // eine Zeile zu ergänzen. Gültige Sektionsnamen: siehe BRING_SEKTIONEN in
    // js/bring-katalog.js.
    kategorien: {
      // "Natron": "Zutaten & Gewürze",
    },
  },

  // Kita: je Kind eine eigene "Local To-do"-Liste als Speicher für den Tageszustand.
  // Weitere Kinder brauchen nur einen Eintrag hier, keinen Code.
  kita: {
    slots: ["12:30", "13:15", "14:30"],
    // Ab dieser Stunde ist die Abholung durch: Die Karte für heute verschwindet,
    // stattdessen erscheint die für morgen.
    switchToTomorrowHour: 15,
    children: [{ name: "Zoe", entity: "todo.kitazoe", calendar: "calendar.zoe" }],
  },

  // Aufgaben: eine "Local To-do"-Liste, NICHT CalDAV. Über CalDAV schlagen Abhaken und
  // Löschen mit HTTP 500 fehl (Bug in HA, siehe BACKLOG.md).
  todoList: {
    entity: "todo.aufgaben",
  },

  // Profile für die Aufgaben-Zuweisung. shared: true = "kann jeder erledigen".
  // Aufgaben ohne Zuweisung bekommen automatisch eine eigene Karte.
  taskProfiles: [
    {
      id: "family",
      name: "Familie",
      color: "#B0A8C9",
      shared: true,
      avatar: "img/avatars/die_sturms.svg",
    },
    { id: "seb", name: "Seb", color: "#4A90D9", avatar: "img/avatars/seb.svg" },
    { id: "jessi", name: "Jessi", color: "#F2C14E", avatar: "img/avatars/jessi.svg" },
  ],

  // Projekte: größere Vorhaben mit Notiz, Phase und Bildern.
  // Liste in HA anlegen: Integration "Local To-do", Name "Projekte".
  projectList: {
    entity: "todo.projekte",
  },

  // Speicher für sonstigen App-Zustand (z.B. "was kochen wir heute").
  appState: {
    entity: "todo.hellofreshgerichte",
  },
};
