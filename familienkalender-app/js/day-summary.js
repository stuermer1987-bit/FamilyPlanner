// Baut aus den Kalenderdaten eines Tages ein paar lesbare Sätze.
//
// Bewusst regelbasiert, ohne Sprachmodell: Es wird nur wiedergegeben, was tatsächlich in
// den Terminen steht. Aussagen wie "ist im Büro" entstehen nur, wenn ein Termin das sagt.

const DaySummary = {
  // Termine eines bestimmten Tages, zusammengeführt und nach Beteiligten gruppiert.
  eventsOn(events, date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const onDay = events.filter((ev) => {
      const start = new Date(ev.start.dateTime || ev.start.date);
      const end = new Date(ev.end.dateTime || ev.end.date);
      return start < dayEnd && end > dayStart;
    });

    return mergeDuplicateEvents(onDay);
  },

  participantLabel(calendars) {
    if (calendars.some((c) => c.shared)) return "Alle";
    const names = calendars.map((c) => c.name);
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
  },

  // "um 15:30", bei ganztägigen Terminen leer
  timeLabel(ev) {
    if (!ev.start.dateTime) return "";
    const start = new Date(ev.start.dateTime);
    return `um ${start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  },

  sentenceFor(label, events) {
    const allDay = events.filter((e) => !e.start.dateTime);
    const timed = events
      .filter((e) => e.start.dateTime)
      .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

    const parts = [];

    if (allDay.length) {
      parts.push(allDay.map((e) => e.summary).join(" und "));
    }

    if (timed.length === 1) {
      parts.push(`${this.timeLabel(timed[0])} ${timed[0].summary}`);
    } else if (timed.length === 2) {
      parts.push(timed.map((e) => `${this.timeLabel(e)} ${e.summary}`).join(" und "));
    } else if (timed.length > 2) {
      // Ab drei Terminen wird die Aufzählung unlesbar - dann Spanne statt Details.
      const first = this.timeLabel(timed[0]).replace("um ", "");
      const last = this.timeLabel(timed[timed.length - 1]).replace("um ", "");
      parts.push(`${timed.length} Termine zwischen ${first} und ${last}`);
    }

    if (!parts.length) return null;
    return `${label}: ${parts.join(", ")}`;
  },

  build(events, date) {
    const merged = this.eventsOn(events, date);
    if (!merged.length) return null;

    // Nach Beteiligten-Kombination gruppieren, damit gemeinsame Termine einmal auftauchen.
    const groups = new Map();
    merged.forEach((ev) => {
      const label = this.participantLabel(ev.calendars);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(ev);
    });

    // "Alle" zuerst, danach in der Reihenfolge aus der Konfiguration.
    const order = ["Alle", ...CONFIG.calendars.filter((c) => !c.shared).map((c) => c.name)];
    const sentences = [...groups.entries()]
      .sort((a, b) => {
        const ia = order.indexOf(a[0]);
        const ib = order.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([label, evs]) => this.sentenceFor(label, evs))
      .filter(Boolean);

    return sentences.length ? sentences.join(" · ") : null;
  },
};
