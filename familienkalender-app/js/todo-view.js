// Aufgaben, nach Profilen gruppiert (Vorbild Skylight): je Profil eine Karte, dazu eine
// Karte für Aufgaben ohne Zuweisung.
//
// Speicher ist eine Local-To-do-Liste. Zuweisung, Emoji und Wiederholung stehen als JSON
// im Beschreibungsfeld, damit der Titel sauber bleibt:
//   {"people":["seb","jessi"],"emoji":"🧹","repeat":"weekly"}
//
// Wiederholungen muss die App selbst umsetzen - HA kennt bei todo.add_item weder rrule
// noch ein Wiederholungsfeld. Beim Abhaken wird deshalb die nächste Instanz angelegt.

const REPEAT_OPTIONS = [
  { id: "", label: "einmalig" },
  { id: "daily", label: "täglich" },
  { id: "weekly", label: "wöchentlich" },
  { id: "monthly", label: "monatlich" },
];

const UNASSIGNED = { id: "__none__", name: "Ohne Zuweisung", color: "#9a9a9a" };

function parseTaskMeta(item) {
  if (!item.description) return { people: [], emoji: "", repeat: "" };
  try {
    const meta = JSON.parse(item.description);
    return {
      people: Array.isArray(meta.people) ? meta.people : [],
      emoji: meta.emoji || "",
      repeat: meta.repeat || "",
    };
  } catch {
    return { people: [], emoji: "", repeat: "" };
  }
}

function nextDueDate(current, repeat) {
  const base = current ? new Date(`${current}T00:00:00`) : new Date();
  if (isNaN(base)) return null;
  if (repeat === "daily") base.setDate(base.getDate() + 1);
  else if (repeat === "weekly") base.setDate(base.getDate() + 7);
  else if (repeat === "monthly") base.setMonth(base.getMonth() + 1);
  else return null;
  return isoDate(base);
}

const TodoView = {
  container: null,
  items: [],

  init(container) {
    this.container = container;
    container.innerHTML = `<div class="empty empty--laedt">Lade Aufgaben…</div>`;
    this.load();
  },

  async load() {
    try {
      this.items = await HaWs.getTodoItems(CONFIG.todoList.entity);
      this.render();
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `
        <div class="error-banner">
          Liste <code>${CONFIG.todoList.entity}</code> nicht erreichbar.
          Lege sie in Home Assistant an: Einstellungen → Geräte &amp; Dienste →
          Integration hinzufügen → „Local To-do", Name „Aufgaben".
        </div>`;
    }
  },

  profiles() {
    return [...CONFIG.taskProfiles, UNASSIGNED];
  },

  tasksFor(profile) {
    return this.items.filter((item) => {
      const { people } = parseTaskMeta(item);
      return profile.id === UNASSIGNED.id ? people.length === 0 : people.includes(profile.id);
    });
  },

  render() {
    const cards = this.profiles()
      .map((profile) => this.card(profile))
      .join("");

    this.container.innerHTML = `
      <div class="task-toolbar">
        <button class="btn-primary" id="task-add">+ Aufgabe</button>
      </div>
      <div class="task-grid">${cards}</div>
    `;

    document.getElementById("task-add").addEventListener("click", () => this.showForm());
    this.bindRows();
  },

  card(profile) {
    const tasks = this.tasksFor(profile);
    const open = tasks.filter((t) => t.status !== "completed");
    const done = tasks.filter((t) => t.status === "completed");

    // Ohne Zuweisung nur zeigen, wenn es dort tatsächlich etwas gibt.
    if (profile.id === UNASSIGNED.id && tasks.length === 0) return "";

    const sorted = [...open].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

    return `
      <section class="task-card" style="--profile-color:${profile.color}">
        <header class="task-card-head">
          ${
            profile.avatar
              ? `<img class="task-avatar" src="${profile.avatar}" alt="" />`
              : `<span class="task-avatar initial" style="background:color-mix(in srgb, ${profile.color} 45%, var(--c-canvas))">${profile.name[0]}</span>`
          }
          <span class="task-name">${profile.name}</span>
          <span class="task-count">${done.length}/${tasks.length}</span>
        </header>
        ${
          sorted.length
            ? sorted.map((t) => this.row(t)).join("")
            : `<p class="empty">Nichts offen.</p>`
        }
        ${
          done.length
            ? `<details class="task-done">
                 <summary>${done.length} erledigt</summary>
                 ${done.map((t) => this.row(t)).join("")}
               </details>`
            : ""
        }
      </section>`;
  },

  row(item) {
    const meta = parseTaskMeta(item);
    const completed = item.status === "completed";
    const repeatLabel = REPEAT_OPTIONS.find((r) => r.id === meta.repeat)?.label;

    const due = item.due
      ? new Date(`${item.due.slice(0, 10)}T00:00:00`).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })
      : "";

    return `
      <div class="task-row ${completed ? "completed" : ""}" data-uid="${item.uid}">
        <button class="check" data-toggle="${item.uid}" aria-label="abhaken">${completed ? "✓" : ""}</button>
        ${meta.emoji ? `<span class="task-emoji">${meta.emoji}</span>` : ""}
        <span class="task-title">${item.summary}</span>
        <span class="task-meta">
          ${meta.repeat ? `<span class="task-repeat" title="${repeatLabel}">↻</span>` : ""}
          ${due ? `<span class="task-due">${due}</span>` : ""}
        </span>
        <button class="task-delete" data-delete="${item.uid}" aria-label="löschen">&times;</button>
      </div>`;
  },

  bindRows() {
    this.container.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => this.toggle(btn.dataset.toggle));
    });
    this.container.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => this.remove(btn.dataset.delete));
    });
  },

  async toggle(uid) {
    const item = this.items.find((i) => i.uid === uid);
    if (!item) return;

    try {
      await this.umschalten(item);
      this.load();
    } catch (err) {
      console.error(err);
      this.showError(err.message);
    }
  },

  // Nur der Schreibzugriff, ohne Neuzeichnen - die Heute-Ansicht hakt über denselben Weg
  // ab, sonst gäbe es die Wiederholungslogik zweimal.
  async umschalten(item) {
    const meta = parseTaskMeta(item);
    const wasOpen = item.status !== "completed";

    await HaApi.toggleTodoItem(CONFIG.todoList.entity, item);

    // Wiederkehrende Aufgabe: beim Abhaken direkt die nächste Fälligkeit anlegen.
    if (wasOpen && meta.repeat) {
      const due = nextDueDate(item.due?.slice(0, 10), meta.repeat);
      if (due) {
        await HaApi.addTodoItem(CONFIG.todoList.entity, item.summary, {
          dueDate: due,
          description: JSON.stringify(meta),
        });
      }
    }
  },

  async remove(uid) {
    try {
      await HaApi.removeTodoItem(CONFIG.todoList.entity, uid);
      this.load();
    } catch (err) {
      console.error(err);
      this.showError(err.message);
    }
  },

  showError(message) {
    this.container.insertAdjacentHTML(
      "afterbegin",
      `<div class="error-banner">${message}</div>`
    );
  },

  showForm() {
    const profileChips = CONFIG.taskProfiles
      .map(
        (p) => `
        <button type="button" class="chip" data-profile="${p.id}">
          ${p.avatar ? `<img class="chip-avatar" src="${p.avatar}" alt="" />` : ""}${p.name}
        </button>`
      )
      .join("");

    const repeatChips = REPEAT_OPTIONS.map(
      (r) => `<button type="button" class="chip ${r.id === "" ? "on" : ""}" data-repeat="${r.id}">${r.label}</button>`
    ).join("");

    Modal.open(`
      <div class="modal-header">
        <h2>Neue Aufgabe</h2>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <form class="modal-body" id="task-form">
        <label class="form-label">Titel
          <input type="text" name="summary" required class="form-input" autocomplete="off" />
        </label>
        <label class="form-label">Emoji (optional)
          <input type="text" name="emoji" class="form-input" maxlength="4" placeholder="🧹" />
        </label>

        <div class="form-label">Zuweisen an
          <div class="kita-row" id="task-profiles">${profileChips}</div>
          <p class="kita-hint">Mehrfachauswahl möglich. Nichts gewählt = ohne Zuweisung.</p>
        </div>

        <label class="form-label">Fällig am (optional)
          <input type="date" name="due" class="form-input" />
        </label>

        <div class="form-label">Wiederholung
          <div class="kita-row" id="task-repeat">${repeatChips}</div>
        </div>

        <div id="task-form-error"></div>
        <div class="modal-footer">
          <button type="submit" class="btn-primary">Anlegen</button>
        </div>
      </form>
    `);

    document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());

    const selected = new Set();
    document.querySelectorAll("[data-profile]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.profile;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        chip.classList.toggle("on");
      });
    });

    let repeat = "";
    document.querySelectorAll("[data-repeat]").forEach((chip) => {
      chip.addEventListener("click", () => {
        repeat = chip.dataset.repeat;
        document.querySelectorAll("[data-repeat]").forEach((c) => c.classList.remove("on"));
        chip.classList.add("on");
      });
    });

    document.getElementById("task-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const summary = data.get("summary").trim();
      if (!summary) return;

      // Wiederkehrende Aufgaben brauchen ein Startdatum, sonst gibt es keinen Bezugspunkt
      // für die nächste Fälligkeit.
      const due = data.get("due") || (repeat ? isoDate(new Date()) : null);

      try {
        await HaApi.addTodoItem(CONFIG.todoList.entity, summary, {
          dueDate: due,
          description: JSON.stringify({
            people: [...selected],
            emoji: data.get("emoji").trim(),
            repeat,
          }),
        });
        Modal.close();
        this.load();
      } catch (err) {
        document.getElementById("task-form-error").innerHTML =
          `<div class="error-banner">${err.message}</div>`;
      }
    });
  },
};
