// Einkaufsliste (Bring!): nach Sektionen gruppiert, mit Artikelbild.
//
// Datenquelle ist bevorzugt die Zusatzintegration bring_shopping - sie liefert im
// Gegensatz zur Kern-Integration Kategorie und Bild je Artikel. Fehlt sie, fällt die
// Ansicht auf die todo.*-Entities zurück; dann gibt es keine Bilder und die Kategorie
// kommt allein aus dem mitgelieferten Bring-Katalog (js/bring-katalog.js).

// Jede Sektion bekommt eine Pastellfamilie. Korall bleibt frei - es ist im System die
// einzige Signalfarbe. Die Tönung sitzt nur im Sektionskopf, die Zeilen bleiben sand.
const SEKTION_FARBE = {
  "Obst & Gemüse": "minze",
  "Brot & Gebäck": "aprikose",
  "Milch & Käse": "himmel",
  "Fleisch & Fisch": "rose",
  "Zutaten & Gewürze": "sandf",
  "Fertig- & Tiefkühlprodukte": "flieder",
  Getreideprodukte: "aprikose",
  "Snacks & Süsswaren": "rose",
  Getränke: "himmel",
  Haushalt: "sandf",
  "Pflege & Gesundheit": "flieder",
  Tierbedarf: "minze",
  "Baumarkt & Garten": "sandf",
};

const OHNE_KATEGORIE = "Ohne Kategorie";

const ShoppingView = {
  container: null,
  quelle: null, // "bring" | "todo"
  listen: [], // [{ id, name }]
  aktiv: null,
  offen: [],
  zuletzt: [],
  zuletztAufgeklappt: false,
  ausnahmen: {},

  async init(container) {
    this.container = container;
    this.ausnahmen = (CONFIG.shopping && CONFIG.shopping.kategorien) || {};
    this.renderGeruest();
    await this.ladeListen();
    await this.lade();
  },

  // --- Daten -----------------------------------------------------------------

  async ladeListen() {
    try {
      const lists = await HaWs.bringGetLists();
      if (lists.length) {
        this.quelle = "bring";
        this.listen = lists.map((l) => ({ id: l.uuid, name: l.name }));
        this.aktiv = this.listen[0].id;
        return;
      }
    } catch (err) {
      console.info("bring_shopping nicht verfügbar, nutze todo.*:", err.message);
    }
    this.quelle = "todo";
    this.listen = (CONFIG.shoppingLists || []).map((l) => ({ id: l.entity, name: l.name }));
    this.aktiv = this.listen.length ? this.listen[0].id : null;
  },

  async lade() {
    if (!this.aktiv) return this.zeigeFehler("Keine Einkaufsliste konfiguriert.");
    try {
      if (this.quelle === "bring") {
        const daten = await HaWs.bringGetItems(this.aktiv);
        this.offen = (daten.purchase || []).map((i) => this.normalisiere(i));
        this.zuletzt = (daten.recently || []).map((i) => this.normalisiere(i));
      } else {
        const items = await HaWs.getTodoItems(this.aktiv);
        const alsArtikel = (i) =>
          this.normalisiere({ name: i.summary, specification: i.description }, i.uid);
        this.offen = items.filter((i) => i.status !== "completed").map(alsArtikel);
        this.zuletzt = items.filter((i) => i.status === "completed").map(alsArtikel);
      }
      this.renderInhalt();
      this.ladeAktivitaet();
      this.updateNavBadge();
    } catch (err) {
      console.error(err);
      this.zeigeFehler(err.message);
    }
  },

  // Roter Zähler an der Seitenleiste, damit man auch von "Heute" aus sieht, wie viel
  // offen ist. Zählt bewusst über die todo.*-Entities statt über bring_shopping: Das
  // funktioniert auch dann, wenn die Zusatzintegration gerade nicht läuft.
  async updateNavBadge() {
    const zahlen = await Promise.all(
      (CONFIG.shoppingLists || []).map(async (liste) => {
        try {
          const items = await HaWs.getTodoItems(liste.entity);
          return items.filter((i) => i.status !== "completed").length;
        } catch {
          return 0;
        }
      })
    );
    setNavBadge("einkaufen", zahlen.reduce((a, b) => a + b, 0));
  },

  // Bring liefert `category` nur bei selbst angelegten Artikeln. Standardartikel wie
  // "Bananen" bleiben leer und kommen aus dem Katalog - die beiden Quellen ergänzen
  // sich fast vollständig.
  // uid gibt es nur auf der Rückfallebene (todo.*). bring_shopping adressiert Artikel
  // über den Namen, deshalb bleibt das Feld dort leer.
  normalisiere(item, uid = null) {
    const name = item.name || "";
    return {
      name,
      uid,
      spec: item.specification || "",
      bild: bringBildUrl(item.imageUrl),
      kategorie: item.category || bringKategorie(name, this.ausnahmen) || OHNE_KATEGORIE,
    };
  },

  gruppiere(artikel) {
    const nachSektion = new Map();
    for (const a of artikel) {
      if (!nachSektion.has(a.kategorie)) nachSektion.set(a.kategorie, []);
      nachSektion.get(a.kategorie).push(a);
    }
    // Reihenfolge wie bei Bring, Unsortiertes ans Ende.
    const reihenfolge = [...BRING_SEKTIONEN, OHNE_KATEGORIE];
    return reihenfolge
      .filter((s) => nachSektion.has(s))
      .map((s) => ({
        name: s,
        farbe: SEKTION_FARBE[s] || null,
        artikel: nachSektion.get(s).sort((a, b) => a.name.localeCompare(b.name, "de")),
      }));
  },

  async ladeAktivitaet() {
    const el = document.getElementById("ek-aktivitaet");
    if (!el || this.quelle !== "bring") return;
    const liste = this.listen.find((l) => l.id === this.aktiv);
    if (!liste) return;
    const slug = bringNorm(liste.name);
    const state = await HaApi.getState(`event.${slug}_aktivitaten`).catch(() => null);
    const wer = state && state.attributes && state.attributes.last_activity_by;
    if (!wer) return;
    el.textContent = `Zuletzt geändert von ${wer}${this.zeitraum(state.state)}`;
  },

  zeitraum(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 60) return `, vor ${Math.max(1, min)} Min.`;
    if (min < 24 * 60) return `, vor ${Math.round(min / 60)} Std.`;
    return `, ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}`;
  },

  // --- Aktionen --------------------------------------------------------------

  async abhaken(artikel) {
    try {
      if (this.quelle === "bring") {
        await HaWs.bringCompleteItem(this.aktiv, artikel.name);
      } else {
        // toggleTodoItem dreht den Status um - "needs_action" hinein heißt abhaken.
        await HaApi.toggleTodoItem(this.aktiv, { uid: artikel.uid, status: "needs_action" });
      }
      await this.lade();
    } catch (err) {
      this.zeigeFehler(err.message);
      await this.lade();
    }
  },

  async hinzufuegen(name, spec = "") {
    if (!name.trim()) return;
    try {
      if (this.quelle === "bring") await HaWs.bringAddItem(this.aktiv, name.trim(), spec);
      else await HaApi.addTodoItem(this.aktiv, name.trim(), { description: spec });
      await this.lade();
    } catch (err) {
      this.zeigeFehler(err.message);
    }
  },

  async wechsle(id) {
    this.aktiv = id;
    this.zuletztAufgeklappt = false;
    await this.lade();
  },

  // --- Aufbau ----------------------------------------------------------------

  renderGeruest() {
    this.container.innerHTML = `
      <header class="ek-kopf">
        <h1 class="ek-titel">Einkaufen</h1>
        <div id="ek-tabs" class="chip-row"></div>
        <div id="ek-aktivitaet" class="ek-aktivitaet"></div>
      </header>
      <form id="ek-form" class="ek-zufuegen">
        <input id="ek-eingabe" class="ek-eingabe" type="text" placeholder="Artikel hinzufügen …"
               autocomplete="off" enterkeyhint="done" />
        <button type="submit" class="btn-primary">Hinzufügen</button>
      </form>
      <div id="ek-fehler"></div>
      <div id="ek-inhalt"></div>`;

    document.getElementById("ek-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const feld = document.getElementById("ek-eingabe");
      const wert = feld.value;
      feld.value = "";
      await this.hinzufuegen(wert);
    });
  },

  renderTabs() {
    const tabs = document.getElementById("ek-tabs");
    if (!tabs || this.listen.length < 2) return;
    tabs.innerHTML = this.listen
      .map(
        (l) => `<button class="chip ${l.id === this.aktiv ? "is-active" : ""}"
                        data-id="${this.escape(l.id)}">${this.escape(l.name)}</button>`
      )
      .join("");
    tabs.querySelectorAll(".chip").forEach((t) => {
      t.addEventListener("click", () => this.wechsle(t.dataset.id));
    });
  },

  renderInhalt() {
    this.renderTabs();
    const ziel = document.getElementById("ek-inhalt");
    document.getElementById("ek-fehler").innerHTML = "";
    ziel.innerHTML = "";

    if (!this.offen.length) {
      const leer = document.createElement("div");
      leer.className = "empty";
      leer.innerHTML = `
        <div class="empty-text">Nichts zu besorgen</div>
        <div class="empty-hinweis">Die Liste ist leer — was fehlt, kommt oben rein.</div>`;
      ziel.appendChild(leer);
    } else {
      const spalten = document.createElement("div");
      spalten.className = "ek-spalten";
      for (const sektion of this.gruppiere(this.offen)) {
        spalten.appendChild(this.baueSektion(sektion));
      }
      ziel.appendChild(spalten);
    }

    ziel.appendChild(this.baueZuletzt());
  },

  baueSektion(sektion) {
    const box = document.createElement("section");
    box.className = "ek-sektion";
    box.innerHTML = `
      <header class="ek-sektion-kopf">
        <span class="ek-punkt ${sektion.farbe ? `ek-punkt--${sektion.farbe}` : ""}"></span>
        <h2>${this.escape(sektion.name)}</h2>
        <span class="ek-anzahl">${sektion.artikel.length}</span>
      </header>`;
    const liste = document.createElement("div");
    liste.className = "ek-zeilen";
    sektion.artikel.forEach((a) => liste.appendChild(this.baueZeile(a)));
    box.appendChild(liste);
    return box;
  },

  baueZeile(artikel) {
    const zeile = document.createElement("div");
    zeile.className = "ek-zeile";
    zeile.innerHTML = `
      ${this.baueBild(artikel)}
      <span class="ek-name">
        <b>${this.escape(artikel.name)}</b>
        ${artikel.spec ? `<i>${this.escape(artikel.spec)}</i>` : ""}
      </span>
      <button class="check" aria-label="${this.escape(artikel.name)} abhaken"></button>`;
    zeile.querySelector(".check").addEventListener("click", () => {
      zeile.classList.add("is-erledigt");
      this.abhaken(artikel);
    });
    return zeile;
  },

  // Nicht jeder Artikel hat ein Bild auf Brings CDN - selbst angelegte Namen wie
  // "Frit Sticks" haben keins. Dann bleibt der Platzhalter stehen, damit die Zeilen
  // ihre gemeinsame Kante behalten.
  //
  // Kein loading="lazy": im Kiosk-Betrieb löst der Lazy-Trigger nicht zuverlässig aus,
  // und bei ~4 KB je Bild ist ohnehin nichts zu sparen.
  baueBild(artikel) {
    if (!artikel.bild) return `<span class="ek-bild ek-bild--leer"></span>`;
    return `<span class="ek-bild"><img src="${this.escape(artikel.bild)}" alt=""
              onerror="this.parentNode.classList.add('ek-bild--leer'); this.remove();" /></span>`;
  },

  baueZuletzt() {
    const box = document.createElement("section");
    box.className = "ek-zuletzt";
    if (!this.zuletzt.length) return box;

    const wiederaufnehmbar = this.quelle === "bring";
    box.innerHTML = `
      <button class="ek-zuletzt-kopf" aria-expanded="${this.zuletztAufgeklappt}">
        <b>${this.zuletzt.length} ${wiederaufnehmbar ? "zuletzt gekauft" : "bereits erledigt"}</b>
        ${wiederaufnehmbar ? `<span class="ek-hinweis">tippen zum Wiederaufnehmen</span>` : ""}
        <span class="ek-pfeil">${this.zuletztAufgeklappt ? "▾" : "▸"}</span>
      </button>`;

    if (this.zuletztAufgeklappt) {
      const raster = document.createElement("div");
      raster.className = "ek-vorschlaege";
      for (const a of this.zuletzt) {
        const knopf = document.createElement("button");
        knopf.className = "ek-vorschlag";
        knopf.innerHTML = `${this.baueBild(a)}<span>${this.escape(a.name)}</span>`;
        if (wiederaufnehmbar) knopf.addEventListener("click", () => this.hinzufuegen(a.name, a.spec));
        else knopf.disabled = true;
        raster.appendChild(knopf);
      }
      box.appendChild(raster);
    }

    box.querySelector(".ek-zuletzt-kopf").addEventListener("click", () => {
      this.zuletztAufgeklappt = !this.zuletztAufgeklappt;
      this.renderInhalt();
    });
    return box;
  },

  zeigeFehler(text) {
    const el = document.getElementById("ek-fehler");
    if (el) el.innerHTML = `<div class="ek-fehler">${this.escape(text)}</div>`;
  },

  escape(text) {
    const d = document.createElement("div");
    d.textContent = text == null ? "" : String(text);
    return d.innerHTML;
  },
};
