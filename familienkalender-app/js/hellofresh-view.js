// HelloFresh: gewählte Gerichte je Lieferwoche, aus der ha-hellofresh-Integration.
//
// Die Daten kommen über den Service hellofresh.get_weeks. Dessen Antwort enthält pro
// Woche das komplette Menü (~250 Rezepte, insgesamt ~2,7 MB) - uns interessieren nur
// die per is_selected markierten. Deshalb wird die Antwort direkt destilliert und das
// Ergebnis zwischengespeichert, damit die Ansicht sofort steht und nicht bei jedem
// Wechsel Megabytes nachlädt.

// Version im Schlüssel: Ändert sich die Struktur von distill(), muss der alte Cache
// verworfen werden - sonst fehlen neuen Feldern die Daten, bis die TTL abläuft.
const HF_CACHE_KEY = "hf-weeks-v2";
const HF_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // entspricht dem Poll-Intervall der Integration
const HF_PAST_WEEKS = 3;

// Welche Gerichte der aktuellen Box schon gekocht sind. Gespeichert als ein Eintrag je
// Woche in CONFIG.appState.entity (Schlüssel "gekocht:<weekId>", Wert { ids: [...] }) -
// ein Eintrag je Gericht würde die Liste über die Wochen zumüllen.
//
// Wird auch von der Heute-Ansicht gelesen: abgehakte Gerichte fallen dort aus
// "Mögliches Essen heute" heraus.
const GekochtStore = {
  _cache: new Map(), // weekId -> Set

  schluessel(weekId) {
    return `gekocht:${weekId}`;
  },

  async lade(weekId) {
    if (!weekId) return new Set();
    if (this._cache.has(weekId)) return this._cache.get(weekId);

    let ids = [];
    try {
      const gespeichert = await DayStore.read(CONFIG.appState.entity, this.schluessel(weekId));
      ids = gespeichert?.ids || [];
    } catch (err) {
      console.warn("Gekochte Gerichte konnten nicht geladen werden:", err);
    }
    const menge = new Set(ids);
    this._cache.set(weekId, menge);
    return menge;
  },

  async umschalten(weekId, mealId) {
    const menge = await this.lade(weekId);
    if (menge.has(mealId)) menge.delete(mealId);
    else menge.add(mealId);
    await DayStore.write(CONFIG.appState.entity, this.schluessel(weekId), { ids: [...menge] });
    return menge;
  },

  // Die Box, die gerade im Kühlschrank steht: die zuletzt gelieferte Woche mit Gerichten.
  // Dieselbe Regel wie in TodayView.currentMeals - beide müssen sich einig sein.
  aktuelleWoche(weeks) {
    const heute = isoDate(new Date());
    return (
      weeks
        .filter((w) => (w.deliveryDate || "") <= heute && !w.skipped && w.meals?.length)
        .sort((a, b) => (a.deliveryDate || "").localeCompare(b.deliveryDate || ""))
        .slice(-1)[0] || null
    );
  },
};

const HelloFreshView = {
  container: null,
  _gekocht: new Set(),
  _aktuelleWocheId: null,

  init(container) {
    this.container = container;

    const cached = this.readCache();
    if (cached) {
      this.render(cached.weeks, cached.ts);
      if (Date.now() - cached.ts > HF_CACHE_TTL_MS) this.refresh({ silent: true });
    } else {
      this.container.innerHTML = `<div class="empty empty--laedt">Lade Gerichte…</div>`;
      this.refresh();
    }
  },

  readCache() {
    try {
      const raw = localStorage.getItem(HF_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  writeCache(weeks) {
    try {
      localStorage.setItem(HF_CACHE_KEY, JSON.stringify({ ts: Date.now(), weeks }));
    } catch (err) {
      console.warn("HelloFresh-Cache konnte nicht geschrieben werden:", err);
    }
  },

  // Aktualisiert Cache und Sidebar-Zähler. Gerendert wird nur, wenn die Ansicht
  // gerade offen ist - so kann das auch beim App-Start im Hintergrund laufen.
  async refresh({ silent = false } = {}) {
    try {
      const response = await HaApi.callServiceWithResponse("hellofresh", "get_weeks");
      const weeks = this.distill(response.weeks || []);

      // Null Wochen heißt in aller Regel nicht "keine Gerichte bestellt", sondern dass die
      // Integration nicht an das Konto kommt (z.B. abgelaufener Refresh-Token). Dann den
      // vorhandenen Cache NICHT überschreiben - sonst ist auch der letzte bekannte Stand
      // weg und der Bildschirm bleibt leer, bis die Anmeldung repariert ist.
      if (!weeks.length) {
        const cached = this.readCache();
        if (cached?.weeks?.length) {
          if (this.container && this.container.isConnected) {
            this.render(cached.weeks, cached.ts, { veraltet: true });
          } else {
            this.updateNavBadge(cached.weeks);
          }
          return;
        }
      }

      this.writeCache(weeks);

      if (this.container && this.container.isConnected) {
        this.render(weeks, Date.now());
      } else {
        this.updateNavBadge(weeks);
      }
    } catch (err) {
      console.error(err);
      if (!silent && this.container && this.container.isConnected) {
        this.container.innerHTML = `<div class="error-banner">Gerichte konnten nicht geladen werden: ${err.message}</div>`;
      }
    }
  },

  // Beim App-Start: Zähler sofort aus dem Cache setzen, bei veralteten Daten
  // im Hintergrund nachladen - ohne die Ansicht zu öffnen.
  initBadge() {
    const cached = this.readCache();
    if (cached) {
      this.updateNavBadge(cached.weeks);
      if (Date.now() - cached.ts <= HF_CACHE_TTL_MS) return;
    }
    this.refresh({ silent: true });
  },

  // Aus der großen Service-Antwort nur behalten, was die Ansicht braucht.
  distill(weeks) {
    return weeks
      .map((week) => ({
        weekId: week.week_id,
        deliveryDate: week.delivery_date,
        status: week.status,
        skipped: !!week.is_skipped,
        // needs_selection heißt nicht "leer": auto_picked markiert eine Vorauswahl von
        // HelloFresh, die noch bis zur Deadline geändert werden kann.
        needsSelection: !!week.needs_selection,
        autoPicked: !!week.auto_picked,
        editable: !!week.is_editable,
        canPause: !!week.allowed_actions?.pause,
        deadline: week.selection_deadline,
        meals: (week.recipes || [])
          .filter((r) => r.is_selected)
          .map((r) => ({
            id: r.recipe_id,
            name: r.name,
            description: r.description,
            image: r.image_url,
            kcal: r.calories_kcal,
            tags: (r.tags || []).filter((t) => ["Vegetarisch", "Vegan", "Family"].includes(t)),
          })),
      }))
      // Pausierte Wochen haben keine Gerichte, müssen aber sichtbar bleiben -
      // sonst gäbe es keinen Weg, sie wieder zu aktivieren.
      .filter((w) => w.meals.length > 0 || w.skipped)
      .sort((a, b) => (a.deliveryDate || "").localeCompare(b.deliveryDate || ""));
  },

  async render(weeks, cachedAt, { veraltet = false } = {}) {
    if (!weeks.length) {
      // "Keine Gerichte" ist fast nie die Wahrheit - viel häufiger kommt die Integration
      // nicht an das HelloFresh-Konto. Deshalb hier den wahrscheinlichen Grund nennen,
      // statt den Nutzer raten zu lassen.
      this.container.innerHTML = `
        <div class="empty empty--gross">
          <div class="empty-icon">🍽️</div>
          <div class="empty-text">HelloFresh liefert gerade keine Wochen.</div>
          <div>Meist ist die Anmeldung der Integration abgelaufen. In Home Assistant unter
            Einstellungen → Geräte &amp; Dienste → HelloFresh neu anmelden; das Protokoll
            zeigt dann <code>invalid_grant</code>.</div>
        </div>`;
      return;
    }

    // Abhaken gibt es nur für die Box, die gerade da ist - was noch nicht geliefert
    // wurde, kann niemand gekocht haben.
    const aktuelle = GekochtStore.aktuelleWoche(weeks);
    this._aktuelleWocheId = aktuelle?.weekId || null;
    this._gekocht = await GekochtStore.lade(this._aktuelleWocheId);
    this._cachedAt = cachedAt;

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = weeks.filter((w) => (w.deliveryDate || "") >= today);
    const past = weeks.filter((w) => (w.deliveryDate || "") < today).slice(-HF_PAST_WEEKS).reverse();

    this.container.innerHTML = `
      <div class="hf-header">
        <button class="chip" id="hf-refresh">Aktualisieren</button>
        ${cachedAt ? `<span class="hf-updated">Stand ${new Date(cachedAt).toLocaleString("de-DE")}</span>` : ""}
      </div>
      ${
        veraltet
          ? `<div class="hf-banner urgent">
               <div class="hf-banner-icon">⚠️</div>
               <div>
                 <div class="hf-banner-title">HelloFresh antwortet nicht mit Wochendaten</div>
                 <div class="hf-banner-text">Unten steht der letzte bekannte Stand. Meist ist
                   die Anmeldung der Integration abgelaufen — in Home Assistant unter
                   Einstellungen → Geräte &amp; Dienste neu anmelden.</div>
               </div>
             </div>`
          : ""
      }
      ${this.selectionBanner(upcoming)}
      ${upcoming.map((w) => this.weekSection(w, true)).join("")}
      ${past.length ? `<h2 class="hf-past-title">Zuletzt geliefert</h2>` : ""}
      ${past.map((w) => this.weekSection(w, false)).join("")}
    `;

    this.bindGekocht(weeks);
    this.bindRezept(weeks);

    document.getElementById("hf-refresh").addEventListener("click", () => {
      this.container.innerHTML = `<div class="empty empty--laedt">Aktualisiere…</div>`;
      this.refresh();
    });

    this.container.querySelectorAll("[data-week]").forEach((btn) => {
      btn.addEventListener("click", () => HelloFreshMenu.open(this.container, btn.dataset.week));
    });
    this.container.querySelectorAll("[data-pause]").forEach((btn) => {
      btn.addEventListener("click", () => this.confirmPause(btn.dataset.pause, weeks, true));
    });
    this.container.querySelectorAll("[data-unpause]").forEach((btn) => {
      btn.addEventListener("click", () => this.confirmPause(btn.dataset.unpause, weeks, false));
    });

    this.updateNavBadge(weeks);
  },

  // Wochen mit unbestätigter Vorauswahl, deren Frist noch läuft.
  openSelections(weeks) {
    const now = Date.now();
    return weeks
      .filter((w) => w.needsSelection && w.editable)
      .filter((w) => !w.deadline || new Date(w.deadline).getTime() > now)
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
  },

  selectionBanner(weeks) {
    const open = this.openSelections(weeks);
    if (!open.length) return "";

    const next = open[0];
    const count = open.length;
    const weekWord = count === 1 ? "Woche" : "Wochen";

    let deadlineText = "";
    if (next.deadline) {
      const deadline = new Date(next.deadline);
      const days = Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000));
      const formatted = deadline.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });
      const soon = days <= 2;
      deadlineText = `Änderbar noch bis <strong>${formatted}</strong>${
        soon ? ` – nur noch ${days} ${days === 1 ? "Tag" : "Tage"}!` : ""
      }`;
    }

    return `
      <div class="hf-banner ${next.deadline && new Date(next.deadline) - Date.now() <= 2 * 86400000 ? "urgent" : ""}">
        <div class="hf-banner-icon">🍽️</div>
        <div>
          <div class="hf-banner-title">${count} ${weekWord} mit Vorauswahl von HelloFresh</div>
          <div class="hf-banner-text">Noch nicht von euch bestätigt. ${deadlineText}</div>
        </div>
      </div>`;
  },

  // Zähler am Sidebar-Eintrag, damit der Hinweis auch ohne offene Ansicht sichtbar ist.
  updateNavBadge(weeks) {
    const today = new Date().toISOString().slice(0, 10);
    const offen = this.openSelections(weeks.filter((w) => (w.deliveryDate || "") >= today));
    setNavBadge("hellofresh", offen.length);
  },

  weekSection(week, isUpcoming) {
    const unconfirmed = week.needsSelection && week.editable;

    const badge = week.skipped
      ? `<span class="hf-status paused">Pausiert</span>`
      : unconfirmed
        ? `<span class="hf-status unconfirmed">Vorauswahl</span>`
        : isUpcoming && week.status
          ? `<span class="hf-status">${this.statusLabel(week.status)}</span>`
          : "";

    const actions = [];
    if (!week.skipped && week.editable) {
      actions.push(
        `<button class="chip chip--klein" data-week="${week.weekId}">${
          unconfirmed ? "Gerichte wählen" : "Ändern"
        }</button>`
      );
    }
    if (week.skipped) {
      actions.push(`<button class="chip chip--klein resume" data-unpause="${week.weekId}">Wieder aktivieren</button>`);
    } else if (week.canPause && isUpcoming) {
      actions.push(`<button class="chip chip--klein pause" data-pause="${week.weekId}">Pausieren</button>`);
    }

    const istAktuell = week.weekId === this._aktuelleWocheId;

    const body = week.skipped
      ? `<div class="hf-paused-note">Diese Lieferung ist pausiert – es wird nichts geliefert und nichts berechnet.</div>`
      : `<div class="hf-grid">${week.meals
          .map((m) => this.mealCard(m, istAktuell, !isUpcoming))
          .join("")}</div>`;

    // Zähler nur bei der aktuellen Box, und erst wenn wirklich etwas abgehakt ist.
    const gekochtAnzahl = istAktuell
      ? week.meals.filter((m) => this._gekocht.has(m.id)).length
      : 0;
    const zaehler = gekochtAnzahl
      ? `<span class="hf-status">${gekochtAnzahl} von ${week.meals.length} gekocht</span>`
      : "";

    return `
      <section class="hf-week ${isUpcoming ? "upcoming" : ""} ${week.skipped ? "skipped" : ""}">
        <h3 class="hf-week-title">
          ${this.dateLabel(week.deliveryDate)}
          ${badge}
          ${zaehler}
          <span class="hf-week-actions">${actions.join("")}</span>
        </h3>
        ${body}
      </section>`;
  },

  // Abhaken schreibt in HA und zeichnet danach neu, damit Zähler und Heute-Ansicht
  // zusammenpassen.
  bindGekocht(weeks) {
    this.container.querySelectorAll("[data-gekocht]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.gekocht;
        btn.disabled = true;
        try {
          this._gekocht = await GekochtStore.umschalten(this._aktuelleWocheId, id);
          this.render(weeks, this._cachedAt);
        } catch (err) {
          console.error("Konnte nicht als gekocht gespeichert werden:", err);
          btn.disabled = false;
        }
      });
    });
  },

  // Klick auf die Kachel öffnet die Rezeptkarte. Der Haken "gekocht" liegt darüber und
  // hält sein Klick-Ereignis selbst auf (stopPropagation), sonst ginge beim Abhaken
  // gleichzeitig das Rezept auf.
  bindRezept(weeks) {
    const gerichte = new Map(weeks.flatMap((w) => w.meals.map((m) => [m.id, m])));
    this.container.querySelectorAll("[data-rezept]").forEach((karte) => {
      karte.addEventListener("click", () => {
        const gericht = gerichte.get(karte.dataset.rezept);
        if (gericht) RezeptModal.open(gericht);
      });
    });
  },

  // Pausieren/Reaktivieren betrifft eine echte, kostenpflichtige Lieferung -
  // deshalb immer erst ein Bestätigungsdialog.
  confirmPause(weekId, weeks, pause) {
    const week = weeks.find((w) => w.weekId === weekId);
    const label = week ? this.dateLabel(week.deliveryDate) : weekId;

    Modal.open(`
      <div class="modal-header">
        <h2>${pause ? "Lieferung pausieren?" : "Lieferung wieder aktivieren?"}</h2>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-row"><strong>Lieferung:</strong> ${label}</div>
        <div class="modal-row">${
          pause
            ? "Für diese Woche wird nichts geliefert und nichts berechnet. Rückgängig machen könnt ihr das bis zur Auswahlfrist."
            : "Die Woche wird wieder normal geliefert und berechnet."
        }</div>
        <div id="hf-pause-error"></div>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <button class="chip" id="hf-pause-cancel">Abbrechen</button>
        <button class="btn-primary" id="hf-pause-ok">${pause ? "Pausieren" : "Aktivieren"}</button>
      </div>
    `);

    document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());
    document.getElementById("hf-pause-cancel").addEventListener("click", () => Modal.close());
    document.getElementById("hf-pause-ok").addEventListener("click", async (e) => {
      const button = e.target;
      button.disabled = true;
      button.textContent = "Moment…";
      try {
        await HaApi.callService("hellofresh", pause ? "skip_week" : "unskip_week", {
          week_id: weekId,
        });
        Modal.close();
        localStorage.removeItem(HF_CACHE_KEY);
        this.container.innerHTML = `<div class="empty empty--laedt">Aktualisiere…</div>`;
        this.refresh();
      } catch (err) {
        console.error(err);
        document.getElementById("hf-pause-error").innerHTML =
          `<div class="error-banner">${err.message}</div>`;
        button.disabled = false;
        button.textContent = pause ? "Pausieren" : "Aktivieren";
      }
    });
  },

  dateLabel(isoDate) {
    if (!isoDate) return "Lieferung";
    const date = new Date(`${isoDate}T00:00:00`);
    if (isNaN(date)) return isoDate;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((date - today) / (24 * 60 * 60 * 1000));

    const formatted = date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    if (diffDays === 0) return `Heute · ${formatted}`;
    if (diffDays === 1) return `Morgen · ${formatted}`;
    return formatted;
  },

  statusLabel(status) {
    const labels = {
      PREPARING: "wird gepackt",
      RUNNING: "geplant",
      DELIVERED: "geliefert",
    };
    return labels[status] || status.toLowerCase();
  },

  // mitRezept: Die Rezeptkarte stellt HelloFresh erst zur Lieferung bereit - für künftige
  // Wochen antwortet der Server mit 403 (am 04.08.2026 über mehrere Wochen geprüft).
  // Deshalb sind nur die Kacheln gelieferter Wochen anklickbar, sonst führte der Klick
  // regelmäßig in eine Sackgasse.
  mealCard(meal, abhakbar = false, mitRezept = false) {
    const image = meal.image
      ? `<img class="hf-image" src="${meal.image}" alt="" />`
      : `<div class="hf-image hf-image-fallback">🍽️</div>`;

    const tags = meal.tags.map((t) => `<span class="hf-tag">${t}</span>`).join("");
    const gekocht = abhakbar && this._gekocht.has(meal.id);

    const haken = abhakbar
      ? `<button class="check check--auf-bild ${gekocht ? "is-done" : ""}"
                 data-gekocht="${meal.id}"
                 aria-pressed="${gekocht}"
                 aria-label="${gekocht ? "Nicht mehr als gekocht markieren" : "Als gekocht markieren"}">✓</button>`
      : "";

    return `
      <article class="hf-card ${mitRezept ? "selectable" : ""} ${gekocht ? "gekocht" : ""}"
               ${mitRezept ? `data-rezept="${meal.id}"` : ""}>
        ${image}
        ${haken}
        <div class="hf-card-body">
          <div class="hf-name">${meal.name || "Unbenanntes Gericht"}</div>
          ${meal.description ? `<div class="hf-headline">${meal.description}</div>` : ""}
          <div class="hf-meta">
            ${tags}
            ${meal.kcal ? `<span class="hf-kcal">${Math.round(meal.kcal)} kcal</span>` : ""}
          </div>
        </div>
      </article>`;
  },
};
