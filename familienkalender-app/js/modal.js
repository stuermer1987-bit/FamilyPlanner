// Generisches Modal + Termin-Detail- und Neu-Anlegen-Dialoge.

const Modal = {
  overlay: null,

  init() {
    this.overlay = document.createElement("div");
    this.overlay.className = "modal-overlay";
    this.overlay.hidden = true;
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.body.appendChild(this.overlay);
  },

  // klasse: zusätzliche Variante der Box, z.B. "modal-box--breit" für die Rezeptkarte.
  open(contentHtml, { klasse = "" } = {}) {
    this.overlay.innerHTML = `<div class="modal-box ${klasse}">${contentHtml}</div>`;
    this.overlay.hidden = false;
    this.overlay.classList.add("visible");
  },

  close() {
    this.overlay.hidden = true;
    this.overlay.classList.remove("visible");
    this.overlay.innerHTML = "";
  },
};

function fmtDateTime(dt) {
  return dt.toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showEventDetails(ev) {
  const start = new Date(ev.start.dateTime || ev.start.date);
  const end = new Date(ev.end.dateTime || ev.end.date);
  const isAllDay = !ev.start.dateTime;
  const calendars = ev.calendars || [ev.calendar];

  const calendarNames = calendars
    .map((cal) => `<span class="calendar-tag"><span class="chip-dot" style="background:${cal.color}"></span>${cal.name}</span>`)
    .join("");

  Modal.open(`
    <div class="modal-header" style="border-left: 6px solid ${calendars[0].color}">
      <h2>${ev.summary || "(ohne Titel)"}</h2>
      <button class="modal-close" id="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <div class="modal-row"><strong>Betrifft:</strong> <span class="calendar-tags">${calendarNames}</span></div>
      <div class="modal-row"><strong>Zeit:</strong> ${
        isAllDay ? "Ganztägig" : `${fmtDateTime(start)} – ${end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
      }</div>
      ${ev.location ? `<div class="modal-row"><strong>Ort:</strong> ${ev.location}</div>` : ""}
      ${ev.description ? `<div class="modal-row"><strong>Notizen:</strong><br>${ev.description}</div>` : ""}
    </div>
    <div class="modal-footer">
      <span class="modal-hint">Bearbeiten/Löschen aktuell nur in der Apple Kalender-App möglich.</span>
    </div>
  `);
  document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());
}

// Liste hinter einem zusammengefassten Stapel gleichzeitiger Termine.
function showClusterDetails(cluster) {
  const sorted = [...cluster].sort((a, b) => a.startMin - b.startMin);

  const rows = sorted
    .map((seg) => {
      const ev = seg.event;
      const names = ev.calendars.map((c) => c.name).join(", ");
      return `
      <button class="cluster-row" data-index="${cluster.indexOf(seg)}">
        <span class="cluster-time">${fmtHm(seg.realStart)} – ${fmtHm(seg.realEnd)}</span>
        <span class="cluster-body">
          <span class="cluster-title">${ev.summary || "(ohne Titel)"}</span>
          <span class="cluster-meta">${names}${ev.location ? ` · ${ev.location}` : ""}</span>
        </span>
        <span class="cluster-dot" style="background:${ev.calendars[0].color}"></span>
      </button>`;
    })
    .join("");

  Modal.open(`
    <div class="modal-header">
      <h2>${cluster.length} Termine gleichzeitig</h2>
      <button class="modal-close" id="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body cluster-list">${rows}</div>
  `);

  document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());
  document.querySelectorAll(".cluster-row").forEach((row) => {
    row.addEventListener("click", () => showEventDetails(cluster[Number(row.dataset.index)].event));
  });
}

function fmtHm(date) {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function showNewEventForm() {
  // Platzhalter fehlen hier bewusst: Ein create_event auf einen Kalender, den es in HA
  // nicht gibt, endet in einer Fehlermeldung statt in einem Termin.
  const calendarOptions = CONFIG.calendars
    .filter((cal) => !cal.platzhalter)
    .map((cal) => `<option value="${cal.entity}">${cal.name}</option>`)
    .join("");

  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);
  const defaultStartTime = "09:00";
  const defaultEndTime = "10:00";

  Modal.open(`
    <div class="modal-header">
      <h2>Neuer Termin</h2>
      <button class="modal-close" id="modal-close-btn">&times;</button>
    </div>
    <form class="modal-body" id="new-event-form">
      <label class="form-label">Titel
        <input type="text" name="summary" required class="form-input" />
      </label>
      <label class="form-label">Kalender
        <select name="entity_id" class="form-input">${calendarOptions}</select>
      </label>
      <label class="form-checkbox">
        <input type="checkbox" name="all_day" id="all-day-toggle" /> Ganztägig
      </label>
      <div id="time-fields">
        <label class="form-label">Datum
          <input type="date" name="date" value="${defaultDate}" required class="form-input" />
        </label>
        <div class="form-row">
          <label class="form-label">Von
            <input type="time" name="start_time" value="${defaultStartTime}" required class="form-input" />
          </label>
          <label class="form-label">Bis
            <input type="time" name="end_time" value="${defaultEndTime}" required class="form-input" />
          </label>
        </div>
      </div>
      <label class="form-label">Ort (optional)
        <input type="text" name="location" class="form-input" />
      </label>
      <label class="form-label">Notizen (optional)
        <textarea name="description" class="form-input" rows="2"></textarea>
      </label>
      <div id="form-error" class="form-error" hidden></div>
      <div class="modal-footer">
        <button type="submit" class="btn-primary">Termin erstellen</button>
      </div>
    </form>
  `);

  document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());

  const allDayToggle = document.getElementById("all-day-toggle");
  const timeFields = document.getElementById("time-fields");
  allDayToggle.addEventListener("change", () => {
    timeFields.querySelectorAll("input").forEach((input) => {
      if (input.type === "time") input.required = !allDayToggle.checked;
    });
    timeFields.style.opacity = allDayToggle.checked ? "0.4" : "1";
  });

  document.getElementById("new-event-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const errorBox = document.getElementById("form-error");
    errorBox.hidden = true;

    const isAllDay = data.get("all_day") === "on";
    const date = data.get("date");
    let start, end;

    if (isAllDay) {
      start = date;
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      end = endDate.toISOString().slice(0, 10);
    } else {
      start = `${date}T${data.get("start_time")}:00`;
      end = `${date}T${data.get("end_time")}:00`;
    }

    try {
      await HaApi.createEvent({
        entityId: data.get("entity_id"),
        summary: data.get("summary"),
        description: data.get("description"),
        location: data.get("location"),
        isAllDay,
        start,
        end,
      });
      Modal.close();
      if (window.CalendarView) CalendarView.load();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => Modal.init());
