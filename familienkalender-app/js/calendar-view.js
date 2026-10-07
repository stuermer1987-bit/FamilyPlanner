// Wochenraster: Tage als Spalten, Stunden als Zeilen, Termine als positionierte Blöcke.
//
// Wichtige Eigenschaften:
// - Das Fenster beginnt immer bei HEUTE (nicht am Montag), sonst zeigt das Wand-Display
//   am Wochenende eine abgelaufene Woche.
// - Die Zeitachse wächst automatisch, wenn Termine vor/nach dem Wunschfenster liegen -
//   sonst würden sie außerhalb des Containers landen und wären unsichtbar.
// - Termine über Mitternacht werden in Tagessegmente zerlegt.
// - Gleichzeitige Termine werden nebeneinander in Spalten gelegt statt übereinander.
// - Die Stundenhöhe passt sich der verfügbaren Höhe an, damit der Tag ohne Scrollen
//   auf den Schirm passt. Auf einem Wand-Display wäre ein Termin unterhalb des
//   Bildrands praktisch unsichtbar - gerade der Abendtermin, der die Achse aufzieht.

const HOUR_HEIGHT_MAX = 72;
const HOUR_HEIGHT_MIN = 34; // darunter sind 30-Minuten-Termine nicht mehr lesbar

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeTitle(title) {
  return (title || "").trim().toLowerCase();
}

function hhmm(date) {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Minuten seit Tagesbeginn -> "09:30"
function minutesToLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Führt Events mit gleichem Titel + gleicher Zeit + gleichem Ort zusammen. Ein
// zusammengeführtes Event gehört zu mehreren Personen (calendars: []).
function mergeDuplicateEvents(events) {
  const groups = new Map();

  events.forEach((ev) => {
    const start = new Date(ev.start.dateTime || ev.start.date).getTime();
    const end = new Date(ev.end.dateTime || ev.end.date).getTime();
    const key = `${normalizeTitle(ev.summary)}|${start}|${end}|${ev.location || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group[0],
    calendars: group.map((e) => e.calendar),
  }));
}

// Termine sind Pastellflächen mit dunkler Schrift, nicht kräftige Flächen mit weißer
// (DESIGN.md, Abschnitt 6). Aus der einen Personenfarbe leitet sich der helle Ton ab.
function softTone(color) {
  return `color-mix(in srgb, ${color} 16%, var(--c-canvas))`;
}

function stripedBackground(calendars) {
  const stripeWidth = 16;
  const stops = calendars.map(
    (cal, i) => `${softTone(cal.color)} ${i * stripeWidth}px ${(i + 1) * stripeWidth}px`
  );
  return `repeating-linear-gradient(45deg, ${stops.join(", ")})`;
}

// Termine im geteilten Kalender betreffen per Definition alle - sie bekommen immer nur
// ihre eigene Farbe, nie Streifen.
function resolveBackground(calendars) {
  const shared = calendars.find((cal) => cal.shared);
  if (shared) return softTone(shared.color);
  if (calendars.length === 1) return softTone(calendars[0].color);
  return stripedBackground(calendars);
}

// Ab wie vielen gleichzeitigen Terminen nicht mehr nebeneinander gelegt, sondern
// zu einem Stapel zusammengefasst wird. Drei Spalten sind schon so schmal, dass
// jeder Titel abbricht.
const STACK_THRESHOLD = 3;

// Gruppiert Segmente in Cluster: alles, was sich zeitlich berührt, gehört zusammen.
function buildClusters(segments) {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const clusters = [];
  let current = [];
  let clusterEnd = -Infinity;

  sorted.forEach((seg) => {
    if (seg.startMin >= clusterEnd) {
      if (current.length) clusters.push(current);
      current = [];
      clusterEnd = seg.endMin;
    } else {
      clusterEnd = Math.max(clusterEnd, seg.endMin);
    }
    current.push(seg);
  });
  if (current.length) clusters.push(current);

  return clusters;
}

// Weist innerhalb eines Clusters Spalten zu, damit sich nichts verdeckt.
function assignColumns(cluster) {
  const columns = [];
  cluster.forEach((seg) => {
    let col = columns.findIndex((endMin) => endMin <= seg.startMin);
    if (col === -1) {
      col = columns.length;
      columns.push(seg.endMin);
    } else {
      columns[col] = seg.endMin;
    }
    seg.column = col;
  });
  cluster.forEach((seg) => (seg.columnCount = columns.length));
  return cluster;
}

// Spaltenzahl bewusst pro Gerät, nicht in HA: Wandtablet, Handy und Rechner haben
// unterschiedlich viel Platz und würden sich eine gemeinsame Einstellung gegenseitig
// überschreiben. CONFIG.daysToShow ist damit nur noch der Startwert.
const DAYS_KEY = "cal-days";
const DAY_CHOICES = [1, 3, 5, 7];

const CalendarView = {
  container: null,
  days: [],
  offsetDays: 0,
  hiddenEntities: new Set(),
  lastEvents: [],
  startHour: 7,
  endHour: 22,
  hourHeight: 64,
  _fitting: false,

  init(container) {
    this.container = container;
    this.buildDays();
    this.render();
    this.load();
    clearInterval(this._nowTimer);
    this._nowTimer = setInterval(() => this.updateNowLine(), 60 * 1000);

    if (!this._resizeBound) {
      window.addEventListener("resize", () => {
        if (this.container?.isConnected) this.fitHourHeight();
      });
      this._resizeBound = true;
    }
  },

  // Stundenhöhe so wählen, dass der Tag in die verfügbare Höhe passt. Erst wenn die
  // Untergrenze nicht mehr reicht, wird wieder gescrollt.
  fitHourHeight() {
    if (this._fitting) return;
    if (!this.container.querySelector(".calendar-grid")?.clientHeight) return;

    this._fitting = true;
    try {
      // Das Neuzeichnen verschiebt die verfügbare Höhe leicht (Ganztagszeile, Umbrüche
      // in der Toolbar). Deshalb in wenigen Schritten einschwingen statt einmal messen.
      for (let pass = 0; pass < 3; pass++) {
        const grid = this.container.querySelector(".calendar-grid");
        if (!grid?.clientHeight) break;

        // Die Tagesüberschriften sitzen im selben Container und kosten Höhe, die
        // nicht für Stunden zur Verfügung steht.
        const headerHeight = this.container.querySelector(".day-headers")?.offsetHeight || 0;
        const available = grid.clientHeight - headerHeight;
        if (available <= 0) break;

        const hourCount = this.endHour - this.startHour;
        let next = Math.floor(
          Math.min(HOUR_HEIGHT_MAX, Math.max(HOUR_HEIGHT_MIN, available / hourCount))
        );

        if (next === this.hourHeight) {
          // Rechnerisch passt es, praktisch bleibt ein Rest durch Rahmen und Rundung.
          // Diesen direkt aus dem gemessenen Überstand herausnehmen.
          const overflow = grid.scrollHeight - grid.clientHeight;
          if (overflow <= 1 || this.hourHeight <= HOUR_HEIGHT_MIN) break;
          next = Math.max(HOUR_HEIGHT_MIN, this.hourHeight - Math.ceil(overflow / hourCount));
          if (next === this.hourHeight) break;
        }

        this.hourHeight = next;
        this.render();
        this.renderEvents(this.lastEvents);
      }
    } finally {
      this._fitting = false;
    }
  },

  dayCount() {
    const stored = Number(localStorage.getItem(DAYS_KEY));
    if (DAY_CHOICES.includes(stored)) return stored;
    return CONFIG.daysToShow || 5;
  },

  setDayCount(count) {
    localStorage.setItem(DAYS_KEY, String(count));
    // Zurück auf heute: Nach dem Wechsel der Spaltenzahl wäre ein alter Versatz
    // in Tagen sonst kaum noch nachvollziehbar.
    this.offsetDays = 0;
    this.buildDays();
    this.render();
    this.load();
  },

  buildDays() {
    const first = startOfDay(new Date());
    first.setDate(first.getDate() + this.offsetDays);
    this.days = Array.from({ length: this.dayCount() }, (_, i) => {
      const d = new Date(first);
      d.setDate(d.getDate() + i);
      return d;
    });
  },

  shift(days) {
    this.offsetDays += days;
    this.buildDays();
    this.render();
    this.renderEvents(this.lastEvents);
    this.load();
  },

  async load() {
    const rangeStart = this.days[0];
    const rangeEnd = new Date(this.days[this.days.length - 1]);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    try {
      const events = await HaApi.getAllEvents(rangeStart, rangeEnd);
      this.lastEvents = events;
      this.renderEvents(events);
    } catch (err) {
      console.error(err);
      this.showError(err.message);
    }
  },

  // Zerlegt Termine in Tagessegmente und begrenzt sie auf die sichtbaren Tage.
  // Ein Termin von Fr 22:00 bis Sa 02:00 ergibt so zwei Segmente.
  buildSegments(events) {
    const segments = [];

    events.forEach((ev) => {
      const start = new Date(ev.start.dateTime);
      const end = new Date(ev.end.dateTime);

      this.days.forEach((day, dayIndex) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        if (end <= dayStart || start >= dayEnd) return;

        const segStart = start > dayStart ? start : dayStart;
        const segEnd = end < dayEnd ? end : dayEnd;

        segments.push({
          event: ev,
          dayIndex,
          startMin: (segStart - dayStart) / 60000,
          endMin: (segEnd - dayStart) / 60000,
          continuesBefore: start < dayStart,
          continuesAfter: end > dayEnd,
          realStart: start,
          realEnd: end,
        });
      });
    });

    return segments;
  },

  // Achse so wählen, dass jedes Segment hineinpasst - lieber mehr Stunden zeigen,
  // als Termine unsichtbar zu machen.
  computeHours(segments) {
    let startHour = CONFIG.dayStartHour;
    let endHour = CONFIG.dayEndHour;

    segments.forEach((seg) => {
      startHour = Math.min(startHour, Math.floor(seg.startMin / 60));
      endHour = Math.max(endHour, Math.ceil(seg.endMin / 60));
    });

    return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
  },

  render() {
    const hourCount = this.endHour - this.startHour;

    let hourLabels = "";
    for (let h = this.startHour; h < this.endHour; h++) {
      hourLabels += `<div class="hour-label" style="height:${this.hourHeight}px">${String(h).padStart(2, "0")}:00</div>`;
    }

    const dayColumns = this.days
      .map((day, i) => {
        const today = isSameDay(day, new Date()) ? "today" : "";
        const weekend = [0, 6].includes(day.getDay()) ? "weekend" : "";
        return `
        <div class="day-column ${today} ${weekend}" style="height:${hourCount * this.hourHeight}px">
          <div class="hour-grid-lines">
            ${Array.from({ length: hourCount }, () => `<div class="hour-line" style="height:${this.hourHeight}px"></div>`).join("")}
          </div>
          <div class="events-layer" id="events-day-${i}"></div>
          <div class="now-line" id="now-line-${i}" hidden></div>
        </div>`;
      })
      .join("");

    const dayHeaders = this.days
      .map((day) => {
        const today = isSameDay(day, new Date());
        return `<div class="day-header ${today ? "today" : ""}">
          <span class="day-weekday">${day.toLocaleDateString("de-DE", { weekday: "short" })}</span>
          <span class="day-number">${day.getDate()}</span>
        </div>`;
      })
      .join("");

    this.container.innerHTML = `
      <div class="calendar-toolbar">
        <div class="chip-row" id="filter-chips"></div>
        <div class="toolbar-right">
          <div class="chip-row" id="countdowns"></div>
          <div class="chip-seg">
            ${DAY_CHOICES.map(
              (n) =>
                `<button class="chip chip--seg ${n === this.dayCount() ? "active" : ""}" data-days="${n}">${n}</button>`
            ).join("")}
          </div>
          <div class="chip-row">
            <button class="chip chip--icon" id="cal-prev" aria-label="zurück">‹</button>
            <button class="chip" id="cal-today">Heute</button>
            <button class="chip chip--icon" id="cal-next" aria-label="vor">›</button>
          </div>
          <button class="btn-primary" id="btn-add-event">+ Termin</button>
        </div>
      </div>
      <div class="all-day-row">
        <div class="hour-column-spacer"></div>
        <div class="all-day-grid" id="all-day-grid" style="grid-template-columns: repeat(${this.days.length}, 1fr)"></div>
      </div>
      <div class="calendar-grid">
        <div class="hour-column">
          <div class="hour-column-spacer"></div>
          ${hourLabels}
        </div>
        <div class="days-wrapper">
          <div class="day-headers">${dayHeaders}</div>
          <div class="day-columns">${dayColumns}</div>
        </div>
      </div>
    `;

    this.renderFilterChips();
    this.renderCountdowns();

    document.getElementById("btn-add-event").addEventListener("click", () => showNewEventForm());

    // Blättern immer um die aktuell sichtbare Spannweite, nicht um eine feste Woche.
    document.getElementById("cal-prev").addEventListener("click", () => this.shift(-this.dayCount()));
    document.getElementById("cal-next").addEventListener("click", () => this.shift(this.dayCount()));

    this.container.querySelectorAll("[data-days]").forEach((btn) => {
      btn.addEventListener("click", () => this.setDayCount(Number(btn.dataset.days)));
    });
    document.getElementById("cal-today").addEventListener("click", () => {
      if (this.offsetDays === 0) return;
      this.offsetDays = 0;
      this.buildDays();
      this.render();
      this.load();
    });

    this.updateNowLine();
  },

  renderCountdowns() {
    const el = document.getElementById("countdowns");
    const today = startOfDay(new Date());

    el.innerHTML = (CONFIG.countdowns || [])
      .map((c) => {
        const target = startOfDay(new Date(`${c.date}T00:00:00`));
        const days = Math.round((target - today) / 86400000);
        if (isNaN(days) || days < 0) return "";
        const text = days === 0 ? "heute" : days === 1 ? "morgen" : `${days} Tage`;
        return `<span class="chip chip--count">${c.emoji || "📅"} ${c.label} <strong>${text}</strong></span>`;
      })
      .join("");
  },

  renderFilterChips() {
    const chipsEl = document.getElementById("filter-chips");
    chipsEl.innerHTML = CONFIG.calendars
      .map(
        (cal) => `
        <button class="chip chip--person ${this.hiddenEntities.has(cal.entity) ? "inactive" : ""}"
                data-entity="${cal.entity}" style="--chip-color:${cal.color}">
          ${cal.avatar ? `<img class="chip-avatar" src="${cal.avatar}" alt="" />` : `<span class="chip-dot" style="background:${cal.color}"></span>`}
          ${cal.name}
        </button>`
      )
      .join("");

    chipsEl.querySelectorAll(".chip--person").forEach((chip) => {
      chip.addEventListener("click", () => {
        const entity = chip.dataset.entity;
        if (this.hiddenEntities.has(entity)) this.hiddenEntities.delete(entity);
        else this.hiddenEntities.add(entity);
        chip.classList.toggle("inactive");
        this.renderEvents(this.lastEvents);
      });
    });
  },

  showError(message) {
    const errBar = document.createElement("div");
    errBar.className = "error-banner";
    errBar.textContent = `Fehler beim Laden: ${message}`;
    this.container.prepend(errBar);
  },

  avatarStack(calendars) {
    const shown = calendars.slice(0, 3);
    const rest = calendars.length - shown.length;
    const faces = shown
      .map((cal) =>
        cal.avatar
          ? `<img class="event-avatar" src="${cal.avatar}" alt="${cal.name}" title="${cal.name}" />`
          : `<span class="event-avatar initial" style="background:color-mix(in srgb, ${cal.color} 45%, var(--c-canvas))">${cal.name[0]}</span>`
      )
      .join("");
    const more = rest > 0 ? `<span class="event-avatar more">+${rest}</span>` : "";
    return `<div class="event-avatars">${faces}${more}</div>`;
  },

  renderEvents(events) {
    if (!events) return;

    const visible = events.filter((ev) => !this.hiddenEntities.has(ev.calendar.entity));
    const merged = mergeDuplicateEvents(visible);

    const timed = merged.filter((ev) => ev.start.dateTime);
    const allDay = merged.filter((ev) => !ev.start.dateTime);

    const segments = this.buildSegments(timed);
    const hours = this.computeHours(segments);

    // Achse hat sich geändert -> Gerüst neu bauen, danach erneut zeichnen.
    if (hours.startHour !== this.startHour || hours.endHour !== this.endHour) {
      this.startHour = hours.startHour;
      this.endHour = hours.endHour;
      this.render();
    }

    document.querySelectorAll(".events-layer").forEach((el) => (el.innerHTML = ""));
    const allDayGrid = document.getElementById("all-day-grid");
    allDayGrid.innerHTML = "";

    this.renderAllDay(allDay, allDayGrid);

    // Pro Tag in Cluster gruppieren. Kleine Cluster nebeneinander, große als Stapel.
    this.days.forEach((_, dayIndex) => {
      const layer = document.getElementById(`events-day-${dayIndex}`);
      if (!layer) return;

      buildClusters(segments.filter((s) => s.dayIndex === dayIndex)).forEach((cluster) => {
        if (cluster.length >= STACK_THRESHOLD) {
          layer.appendChild(this.buildStack(cluster));
        } else {
          assignColumns(cluster).forEach((seg) => layer.appendChild(this.buildChip(seg)));
        }
      });
    });

    // Erst jetzt steht die Achse endgültig fest - passende Stundenhöhe wählen.
    this.fitHourHeight();
  },

  // Zusammengefasster Stapel für dicht belegte Zeiträume. Ein Tipp öffnet die Liste.
  buildStack(cluster) {
    const startMin = Math.min(...cluster.map((s) => s.startMin));
    const endMin = Math.max(...cluster.map((s) => s.endMin));
    const top = (startMin / 60 - this.startHour) * this.hourHeight;
    const height = Math.max(((endMin - startMin) / 60) * this.hourHeight, 40);

    const calendars = [];
    cluster.forEach((seg) =>
      seg.event.calendars.forEach((cal) => {
        if (!calendars.some((c) => c.entity === cal.entity)) calendars.push(cal);
      })
    );

    const chip = document.createElement("div");
    chip.className = "event-chip stack";
    chip.style.top = `${top}px`;
    chip.style.left = "0";
    chip.style.width = "calc(100% - 5px)";
    chip.style.height = `${height}px`;
    chip.style.background = stripedBackground(calendars);
    chip.innerHTML = `
      <div class="event-title">${cluster.length} Termine</div>
      <div class="event-time">${minutesToLabel(startMin)} – ${minutesToLabel(endMin)}</div>
      ${this.avatarStack(calendars)}
    `;
    chip.addEventListener("click", () => showClusterDetails(cluster));
    return chip;
  },

  renderAllDay(events, grid) {
    events.forEach((ev) => {
      const start = new Date(ev.start.date);
      // Ende ist bei ganztägigen Terminen exklusiv (iCal-Konvention)
      const inclusiveEnd = new Date(ev.end.date);
      inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);

      const lastDay = this.days[this.days.length - 1];
      let startIndex = this.days.findIndex((d) => isSameDay(d, start));
      let endIndex = this.days.findIndex((d) => isSameDay(d, inclusiveEnd));

      if (startIndex === -1 && start < this.days[0] && inclusiveEnd >= this.days[0]) startIndex = 0;
      if (endIndex === -1 && inclusiveEnd > lastDay && start <= lastDay) endIndex = this.days.length - 1;
      if (startIndex === -1 || endIndex === -1) return;

      const chip = document.createElement("div");
      chip.className = "all-day-chip";
      chip.style.background = resolveBackground(ev.calendars);
      chip.style.gridColumn = `${startIndex + 1} / ${endIndex + 2}`;
      chip.innerHTML = `<span class="all-day-title">${ev.summary}</span>${this.avatarStack(ev.calendars)}`;
      chip.addEventListener("click", () => showEventDetails(ev));
      grid.appendChild(chip);
    });
  },

  buildChip(seg) {
    const ev = seg.event;
    const top = (seg.startMin / 60 - this.startHour) * this.hourHeight;
    const height = Math.max(((seg.endMin - seg.startMin) / 60) * this.hourHeight, 26);

    const width = 100 / (seg.columnCount || 1);
    const chip = document.createElement("div");
    chip.className = `event-chip ${height < 46 ? "compact" : ""}`;
    chip.style.top = `${top}px`;
    chip.style.height = `${height}px`;
    chip.style.left = `${seg.column * width}%`;
    chip.style.width = `calc(${width}% - 5px)`;
    chip.style.background = resolveBackground(ev.calendars);

    // Bei über Mitternacht laufenden Terminen die echte Spanne zeigen, nicht das Segment.
    const timeLabel = seg.continuesBefore
      ? `bis ${hhmm(seg.realEnd)}`
      : `${hhmm(seg.realStart)} – ${hhmm(seg.realEnd)}`;

    const title = ev.summary || "(ohne Titel)";

    // Bei sehr kurzen Terminen passt keine zweite Zeile - Uhrzeit wandert vor den Titel,
    // statt unten abgeschnitten zu werden.
    chip.innerHTML =
      height < 46
        ? `<div class="event-title"><span class="inline-time">${hhmm(seg.realStart)}</span> ${title}</div>`
        : `
      <div class="event-title">${title}</div>
      <div class="event-time">${timeLabel}${seg.continuesAfter ? " ›" : ""}</div>
      ${ev.location ? `<div class="event-location">${ev.location}</div>` : ""}
      ${this.avatarStack(ev.calendars)}
    `;
    chip.addEventListener("click", () => showEventDetails(ev));
    return chip;
  },

  updateNowLine() {
    const now = new Date();
    this.days.forEach((day, i) => {
      const line = document.getElementById(`now-line-${i}`);
      if (!line) return;
      const hour = now.getHours();
      if (!isSameDay(day, now) || hour < this.startHour || hour >= this.endHour) {
        line.hidden = true;
        return;
      }
      const minutes = (hour - this.startHour) * 60 + now.getMinutes();
      line.style.top = `${(minutes / 60) * this.hourHeight}px`;
      line.hidden = false;
    });
  },
};
