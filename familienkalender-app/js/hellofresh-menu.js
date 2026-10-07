// Menü-Browser: Gerichte einer Lieferwoche auswählen und per hellofresh.select_meals
// an HelloFresh schreiben.
//
// Achtung, echte Kosten: Ein großer Teil des Menüs hat Aufpreise (bis ~4 EUR/Portion).
// Deshalb wird nie direkt geschrieben - erst ein Bestätigungsdialog mit Kostenübersicht.

const HF_FILTERS = [
  { key: "all", label: "Alle" },
  { key: "no-surcharge", label: "Ohne Aufpreis" },
  { key: "Family", label: "Family" },
  { key: "Vegetarisch", label: "Vegetarisch" },
  { key: "Vegan", label: "Vegan" },
];

const HelloFreshMenu = {
  container: null,
  week: null,
  selected: new Set(),
  filter: "all",
  search: "",
  portions: null,

  async open(container, weekId) {
    this.container = container;
    this.filter = "all";
    this.search = "";
    container.innerHTML = `<div class="empty empty--laedt">Lade Menü der Woche…</div>`;

    try {
      const [response, portions] = await Promise.all([
        HaApi.callServiceWithResponse("hellofresh", "get_weeks", { week_id: weekId }),
        this.fetchPortions(),
      ]);

      this.week = (response.weeks || [])[0];
      this.portions = portions;

      if (!this.week) throw new Error(`Woche ${weekId} nicht gefunden`);

      this.selected = new Set(
        (this.week.recipes || []).filter((r) => r.is_selected).map((r) => r.recipe_id)
      );
      this.render();
    } catch (err) {
      console.error(err);
      container.innerHTML = `
        <div class="error-banner">Menü konnte nicht geladen werden: ${err.message}</div>
        <button class="chip" onclick="switchView('hellofresh')">Zurück</button>`;
    }
  },

  async fetchPortions() {
    try {
      const res = await fetch(`${CONFIG.haUrl}/api/states/sensor.hellofresh_de_number_of_people`, {
        headers: { Authorization: `Bearer ${CONFIG.haToken}` },
      });
      if (!res.ok) return null;
      const value = Number((await res.json()).state);
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  },

  required() {
    return this.week?.meals_required || 2;
  },

  visibleRecipes() {
    const search = this.search.trim().toLowerCase();
    return (this.week.recipes || []).filter((r) => {
      if (this.filter === "no-surcharge" && r.surcharge_cents) return false;
      if (this.filter !== "all" && this.filter !== "no-surcharge") {
        if (!(r.tags || []).includes(this.filter)) return false;
      }
      if (search) {
        const haystack = `${r.name || ""} ${r.description || ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  },

  surchargeTotalCents() {
    const perPortion = [...this.selected].reduce((sum, id) => {
      const recipe = this.week.recipes.find((r) => r.recipe_id === id);
      return sum + (recipe?.surcharge_cents || 0);
    }, 0);
    return { perPortion, total: perPortion * (this.portions || 1) };
  },

  euro(cents) {
    return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  },

  render() {
    const recipes = this.visibleRecipes();
    const required = this.required();

    const filterChips = HF_FILTERS.map(
      (f) => `<button class="chip ${this.filter === f.key ? "" : "inactive"}" data-filter="${f.key}">${f.label}</button>`
    ).join("");

    this.container.innerHTML = `
      <div class="hf-menu-head">
        <button class="chip" id="hf-menu-back">← Zurück</button>
        <h2 class="hf-menu-title">Gerichte für ${this.deliveryLabel()}</h2>
      </div>

      <div class="hf-menu-controls">
        <div class="chip-row">${filterChips}</div>
        <input type="search" id="hf-menu-search" class="form-input" placeholder="Suchen…" value="${this.search}" />
      </div>

      <div class="hf-menu-count">${recipes.length} von ${this.week.recipes.length} Gerichten</div>
      <div class="hf-grid" id="hf-menu-grid">${recipes.map((r) => this.card(r)).join("")}</div>

      <div class="hf-menu-bar" id="hf-menu-bar"></div>
    `;

    document.getElementById("hf-menu-back").addEventListener("click", () => switchView("hellofresh"));

    this.container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filter = btn.dataset.filter;
        this.render();
      });
    });

    const searchInput = document.getElementById("hf-menu-search");
    searchInput.addEventListener("input", () => {
      this.search = searchInput.value;
      const grid = document.getElementById("hf-menu-grid");
      const list = this.visibleRecipes();
      grid.innerHTML = list.map((r) => this.card(r)).join("");
      this.container.querySelector(".hf-menu-count").textContent =
        `${list.length} von ${this.week.recipes.length} Gerichten`;
      this.bindCards();
    });

    this.bindCards();
    this.renderBar();
    void required;
  },

  bindCards() {
    this.container.querySelectorAll("[data-recipe]").forEach((card) => {
      card.addEventListener("click", () => this.toggle(card.dataset.recipe));
    });
  },

  toggle(recipeId) {
    if (this.selected.has(recipeId)) {
      this.selected.delete(recipeId);
    } else {
      if (this.selected.size >= this.required()) return; // Limit der Box
      this.selected.add(recipeId);
    }
    // Nur die betroffenen Karten neu zeichnen, damit die Scrollposition erhalten bleibt.
    this.container.querySelectorAll("[data-recipe]").forEach((card) => {
      card.classList.toggle("selected", this.selected.has(card.dataset.recipe));
    });
    this.renderBar();
  },

  renderBar() {
    const bar = document.getElementById("hf-menu-bar");
    const required = this.required();
    const count = this.selected.size;
    const { perPortion, total } = this.surchargeTotalCents();
    const complete = count === required;

    bar.innerHTML = `
      <div class="hf-bar-info">
        <strong>${count} von ${required}</strong> gewählt
        ${
          perPortion > 0
            ? `<span class="hf-bar-surcharge">Aufpreis ${this.euro(perPortion)}/Portion${
                this.portions ? ` · ${this.euro(total)} gesamt` : ""
              }</span>`
            : ""
        }
      </div>
      <button class="btn-primary" id="hf-menu-save" ${complete ? "" : "disabled"}>Speichern</button>
    `;

    if (complete) {
      document.getElementById("hf-menu-save").addEventListener("click", () => this.confirm());
    }
  },

  deliveryLabel() {
    if (!this.week.delivery_date) return this.week.week_id;
    const date = new Date(`${this.week.delivery_date}T00:00:00`);
    return isNaN(date)
      ? this.week.week_id
      : date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
  },

  card(recipe) {
    const selected = this.selected.has(recipe.recipe_id);
    const tags = (recipe.tags || [])
      .filter((t) => ["Vegetarisch", "Vegan", "Family"].includes(t))
      .map((t) => `<span class="hf-tag">${t}</span>`)
      .join("");

    const surcharge = recipe.surcharge_cents
      ? `<span class="hf-surcharge">+${this.euro(recipe.surcharge_cents)}/Portion</span>`
      : "";

    return `
      <article class="hf-card selectable ${selected ? "selected" : ""}" data-recipe="${recipe.recipe_id}">
        ${
          recipe.image_url
            ? `<img class="hf-image" src="${recipe.image_url}" alt="" loading="lazy" />`
            : `<div class="hf-image hf-image-fallback">🍽️</div>`
        }
        <div class="check check--auf-bild">${selected ? "✓" : ""}</div>
        <div class="hf-card-body">
          <div class="hf-name">${recipe.name || ""}</div>
          ${recipe.description ? `<div class="hf-headline">${recipe.description}</div>` : ""}
          <div class="hf-meta">
            ${tags}
            ${recipe.calories_kcal ? `<span class="hf-kcal">${Math.round(recipe.calories_kcal)} kcal</span>` : ""}
            ${surcharge}
          </div>
        </div>
      </article>`;
  },

  confirm() {
    const chosen = [...this.selected].map((id) =>
      this.week.recipes.find((r) => r.recipe_id === id)
    );
    const { perPortion, total } = this.surchargeTotalCents();

    Modal.open(`
      <div class="modal-header">
        <h2>Auswahl bestätigen</h2>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-row"><strong>Lieferung:</strong> ${this.deliveryLabel()}</div>
        <ul class="hf-confirm-list">
          ${chosen
            .map(
              (r) => `<li>
                <span>${r.name}</span>
                ${r.surcharge_cents ? `<span class="hf-surcharge">+${this.euro(r.surcharge_cents)}/Portion</span>` : ""}
              </li>`
            )
            .join("")}
        </ul>
        ${
          perPortion > 0
            ? `<div class="hf-confirm-total">Aufpreis: ${this.euro(perPortion)} pro Portion${
                this.portions ? ` · <strong>${this.euro(total)}</strong> bei ${this.portions} Portionen` : ""
              }</div>`
            : `<div class="hf-confirm-total ok">Kein Aufpreis</div>`
        }
        <div id="hf-confirm-error"></div>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <button class="chip" id="hf-confirm-cancel">Abbrechen</button>
        <button class="btn-primary" id="hf-confirm-ok">Verbindlich speichern</button>
      </div>
    `);

    document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());
    document.getElementById("hf-confirm-cancel").addEventListener("click", () => Modal.close());
    document.getElementById("hf-confirm-ok").addEventListener("click", (e) => this.submit(e.target));
  },

  async submit(button) {
    button.disabled = true;
    button.textContent = "Speichert…";
    const errorBox = document.getElementById("hf-confirm-error");
    errorBox.innerHTML = "";

    const recipeIds = [...this.selected];
    const quantities = Object.fromEntries(recipeIds.map((id) => [id, 1]));

    try {
      const response = await HaApi.callServiceWithResponse("hellofresh", "select_meals", {
        week_id: this.week.week_id,
        recipe_ids: recipeIds,
        quantities,
      });

      Modal.close();
      // downgraded: HelloFresh hat gespeichert, aber die Box stillschweigend verkleinert.
      this.showResult(response?.downgraded === true);
    } catch (err) {
      console.error(err);
      errorBox.innerHTML = `<div class="error-banner">${err.message}</div>`;
      button.disabled = false;
      button.textContent = "Verbindlich speichern";
    }
  },

  showResult(downgraded) {
    Modal.open(`
      <div class="modal-header">
        <h2>${downgraded ? "Gespeichert – mit Änderung" : "Gespeichert"}</h2>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        ${
          downgraded
            ? `<div class="error-banner">HelloFresh hat die Auswahl angenommen, die Box dabei aber verkleinert.
               Bitte in der HelloFresh-App prüfen, was tatsächlich geliefert wird.</div>`
            : `<div class="modal-row">Die Gerichte für ${this.deliveryLabel()} sind gespeichert.</div>`
        }
      </div>
    `);
    document.getElementById("modal-close-btn").addEventListener("click", () => {
      Modal.close();
      localStorage.removeItem(HF_CACHE_KEY);
      switchView("hellofresh");
    });
  },
};
