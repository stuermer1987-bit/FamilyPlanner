// Kita-Karte: wer bringt, wer holt wann. Zwei Phasen, plus Tagesauswahl.
//
// Phase 1 (Verfügbarkeit): Jeder trägt ein, wann er könnte - Mehrfachauswahl. Die Phase
//   endet erst mit "Fertig". Wichtig: Solange sie läuft, wird NICHT automatisch entschieden,
//   sonst könnte man nach dem ersten Tipp nichts mehr hinzufügen.
// Phase 2 (Entscheidung): Eine der Möglichkeiten wird verbindlich. Gibt es nach "Fertig"
//   nur eine einzige, wird sie direkt übernommen und Phase 2 übersprungen.
//
// Über die Tagesleiste lässt sich jeder Werktag der laufenden Woche einzeln planen.
//
// Zustand je Tag in der Local-To-do-Liste des Kindes (siehe DayStore):
//   { bring, cand: {Name: [slots]}, final: {who, slot}|null, availDone: bool }

const KitaCard = {
  _selected: new Map(), // child.entity -> ISO-Datum

  async render(container, child, date) {
    if (date && !this._selected.has(child.entity)) {
      this._selected.set(child.entity, isoDate(date));
    }
    const key = this._selected.get(child.entity) || isoDate(date || new Date());

    let state;
    try {
      state = (await DayStore.read(child.entity, key)) || {};
    } catch (err) {
      container.innerHTML = `<div class="error-banner">Kita-Daten nicht ladbar: ${err.message}</div>`;
      return;
    }

    const [known, week] = await Promise.all([
      this.knownNames(child.entity),
      this.weekStatus(child.entity, key),
    ]);
    const options = this.optionsOf(state);

    container.innerHTML = `
      <section class="kita-card">
        <div class="kita-head">
          <h3 class="kita-title">Kita ${child.name}</h3>
          <span class="kita-date">${this.dayLabel(key)}</span>
        </div>
        <div class="kita-days">${this.dayChips(week, key)}</div>
        ${this.body(state, options, known)}
      </section>`;

    this.bind(container, child, key, state);
  },

  // Werktage der Woche, in der der gezeigte Tag liegt - nicht der heutigen. Sonst stünde
  // am Samstag eine Leiste voller vergangener Tage da, während die Karte schon den Montag
  // der Folgewoche plant.
  async weekStatus(entity, key) {
    const monday = new Date(`${key}T00:00:00`);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    const all = await DayStore.readAll(entity);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const key = isoDate(d);
      const state = all[key];
      const options = this.optionsOf(state || {});

      let status = "empty";
      if (state?.final) status = "done";
      else if (state?.availDone && options.length === 0) status = "alert";
      else if (Object.keys(state?.cand || {}).length) status = "open";

      return { key, date: d, status };
    });
  },

  dayChips(week, activeKey) {
    const todayKey = isoDate(new Date());
    return week
      .map(
        (d) => `
        <button class="kita-day ${d.status} ${d.key === activeKey ? "active" : ""}"
                data-day-select="${d.key}">
          <span class="kita-day-name">${d.date.toLocaleDateString("de-DE", { weekday: "short" })}</span>
          <span class="kita-day-num">${d.date.getDate()}.</span>
          ${d.key === todayKey ? `<span class="kita-day-today"></span>` : ""}
        </button>`
      )
      .join("");
  },

  dayLabel(key) {
    const d = new Date(`${key}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    const full = d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    if (diff === 0) return `heute, ${full}`;
    if (diff === 1) return `morgen, ${full}`;
    return full;
  },

  async knownNames(entity) {
    const all = await DayStore.readAll(entity);
    const names = new Set();
    Object.values(all).forEach((day) => {
      if (day?.bring) names.add(day.bring);
      Object.keys(day?.cand || {}).forEach((n) => names.add(n));
    });
    return [...names].sort();
  },

  optionsOf(state) {
    const out = [];
    Object.entries(state.cand || {}).forEach(([who, slots]) => {
      (slots || []).forEach((slot) => out.push({ who, slot }));
    });
    return out.sort((a, b) => a.slot.localeCompare(b.slot) || a.who.localeCompare(b.who));
  },

  body(state, options, known) {
    if (state.final) return this.decided(state);
    if (!state.availDone) return this.phaseOne(state, options, known);
    if (options.length === 0) return this.nobody(state, known);
    return this.phaseTwo(state, options);
  },

  banner(kind, text) {
    return `<div class="kita-banner ${kind}">${text}</div>`;
  },

  // --- Personen: Avatar und Farbe wie im Kalender ------------------------------
  //
  // Die Karte speichert nur Namen als Text ("Jessi", "Oma"). Farbe und Avatar stehen aber
  // längst in CONFIG - bis es die führende Personenliste gibt (BACKLOG, "Familienprofile"),
  // werden beide hier über den Namen zusammengeführt.
  profilVon(name) {
    const norm = (s) => (s || "").trim().toLowerCase();
    // Geteilte Profile ("Familie", "Die Sturms") sind keine Personen, die jemanden abholen.
    const quellen = [...(CONFIG.taskProfiles || []), ...(CONFIG.calendars || [])].filter(
      (p) => !p.shared
    );
    return quellen.find((p) => norm(p.name) === norm(name)) || null;
  },

  // Oma und die Tagesmutter haben kein Profil - für sie der Anfangsbuchstabe im Kreis,
  // damit die Zeile trotzdem dieselbe Form hat.
  avatarVon(name, profil) {
    if (profil?.avatar) return `<img class="chip-avatar" src="${profil.avatar}" alt="" />`;
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    return `<span class="chip-avatar chip-avatar--initial">${initial}</span>`;
  },

  // Ein Baustein für alle Stellen, an denen ein Name steht: als Knopf zur Auswahl oder als
  // ruhige Anzeige (tag: "span").
  personChip(name, { aktiv = false, attrs = "", klasse = "", tag = "button" } = {}) {
    const profil = this.profilVon(name);
    const farbe = profil?.color || "var(--c-muted)";
    return `<${tag} class="chip chip--person ${aktiv ? "on" : ""} ${klasse}"
              style="--chip-color:${farbe}" ${attrs}>${this.avatarVon(name, profil)}${name}</${tag}>`;
  },

  nameRow(current, known) {
    const chips = known
      .map((n) => this.personChip(n, { aktiv: current === n, attrs: `data-bring="${n}"` }))
      .join("");
    return `
      <div class="kita-row">
        <span class="kita-label">Bringt</span>
        ${chips}
        <button class="chip chip--geist" data-add-bring>+ Name</button>
      </div>`;
  },

  phaseOne(state, options, known) {
    const people = [...new Set([...known, ...Object.keys(state.cand || {})])];

    const rows = people
      .map((name) => {
        const chosen = state.cand?.[name] || [];
        const slots = CONFIG.kita.slots
          .map(
            (s) =>
              `<button class="chip ${chosen.includes(s) ? "on" : ""}" data-cand="${name}" data-slot="${s}">${s}</button>`
          )
          .join("");
        // Die Person steht als ruhiger Chip vor ihren Zeiten - erkennbar an Avatar und
        // Farbe, aber nicht anklickbar; geklickt werden die Zeiten daneben.
        const person = this.personChip(name, { tag: "span", klasse: "kita-person" });
        return `<div class="kita-row">${person}${slots}</div>`;
      })
      .join("");

    return `
      ${this.banner("open", "Abholzeit noch nicht abgesprochen")}
      ${this.nameRow(state.bring, known)}
      <p class="kita-hint">Wer könnte abholen? Mehrfachauswahl möglich – erst danach wird entschieden.</p>
      ${rows || `<p class="kita-hint">Noch niemand eingetragen.</p>`}
      <div class="kita-row">
        <button class="chip chip--geist" data-add-person>+ Person</button>
        <button class="chip chip--stark" data-avail-done>Fertig – ${options.length === 1 ? "übernehmen" : "entscheiden"}</button>
      </div>`;
  },

  phaseTwo(state, options) {
    const buttons = options
      .map((o) => {
        const profil = this.profilVon(o.who);
        return `
        <button class="kita-option" data-final="${o.who}|${o.slot}"
                style="--chip-color:${profil?.color || "var(--c-muted)"}">
          ${this.avatarVon(o.who, profil)}
          <span>${o.who} · ${o.slot}</span>
        </button>`;
      })
      .join("");

    return `
      ${this.banner("open", `${options.length} Möglichkeiten · wer übernimmt?`)}
      <div class="kita-row">
        <span class="kita-label">Bringt</span>
        ${this.bringAnzeige(state.bring)}
      </div>
      <div class="kita-options">${buttons}</div>
      <div class="kita-row"><button class="chip chip--geist" data-back-avail>Zurück zur Verfügbarkeit</button></div>`;
  },

  nobody(state, known) {
    return `
      ${this.banner("alert", "Niemand kann abholen – hier muss eine Lösung her")}
      ${this.nameRow(state.bring, known)}
      <div class="kita-row"><button class="chip chip--geist" data-back-avail>Verfügbarkeit ändern</button></div>`;
  },

  // "offen" ist kein Name und bekommt deshalb auch keinen Avatar.
  bringAnzeige(name) {
    return name
      ? this.personChip(name, { tag: "span", klasse: "kita-person" })
      : `<span class="kita-value muted">offen</span>`;
  },

  decided(state) {
    const countdown = this.countdown(state.final.slot);
    const profil = this.profilVon(state.final.who);
    const wer = `<span class="kita-banner-person">${this.avatarVon(state.final.who, profil)}</span>`;

    return `
      ${this.banner(
        "done",
        `${wer}${state.final.who} holt um ${state.final.slot}${countdown ? ` · ${countdown}` : ""}`
      )}
      <div class="kita-row">
        <span class="kita-label">Bringt</span>
        ${this.bringAnzeige(state.bring)}
      </div>
      <div class="kita-row"><button class="chip chip--geist" data-back-avail>Ändern</button></div>`;
  },

  countdown(slot) {
    const [h, m] = slot.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const diffMin = Math.round((target - Date.now()) / 60000);
    if (diffMin < 0 || diffMin > 240) return null;
    if (diffMin < 60) return `in ${diffMin} Min`;
    return `in ${Math.floor(diffMin / 60)} h ${diffMin % 60} Min`;
  },

  async save(child, key, state, container) {
    try {
      await DayStore.write(child.entity, key, state);
      await this.render(container, child, null);
    } catch (err) {
      console.error(err);
      container.insertAdjacentHTML(
        "afterbegin",
        `<div class="error-banner">Konnte nicht speichern: ${err.message}</div>`
      );
    }
  },

  bind(container, child, key, state) {
    const save = (next) => this.save(child, key, next, container);

    container.querySelectorAll("[data-day-select]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        this._selected.set(child.entity, btn.dataset.daySelect);
        await this.render(container, child, null);
      });
    });

    container.querySelectorAll("[data-bring]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.bring;
        save({ ...state, bring: state.bring === name ? null : name });
      });
    });

    container.querySelector("[data-add-bring]")?.addEventListener("click", () => {
      const name = prompt("Wer bringt?")?.trim();
      if (name) save({ ...state, bring: name });
    });

    container.querySelector("[data-add-person]")?.addEventListener("click", () => {
      const name = prompt("Name der Person, die abholen könnte:")?.trim();
      if (!name) return;
      save({ ...state, cand: { ...(state.cand || {}), [name]: state.cand?.[name] || [] } });
    });

    container.querySelectorAll("[data-cand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const { cand: name, slot } = btn.dataset;
        const current = state.cand?.[name] || [];
        const next = current.includes(slot)
          ? current.filter((s) => s !== slot)
          : [...current, slot].sort();
        save({ ...state, cand: { ...(state.cand || {}), [name]: next } });
      });
    });

    // Erst hier endet Phase 1. Nur eine Möglichkeit? Dann direkt übernehmen.
    container.querySelector("[data-avail-done]")?.addEventListener("click", () => {
      const options = this.optionsOf(state);
      save({
        ...state,
        availDone: true,
        final: options.length === 1 ? options[0] : null,
      });
    });

    container.querySelectorAll("[data-final]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [who, slot] = btn.dataset.final.split("|");
        save({ ...state, final: { who, slot } });
      });
    });

    container.querySelector("[data-back-avail]")?.addEventListener("click", () => {
      save({ ...state, final: null, availDone: false });
    });
  },
};
