// Projekte: die größeren Vorhaben ("Regal hinter Eingangstür"), im Gegensatz zu den
// kleinen Erledigungen unter Aufgaben. Die Einordnung passiert von Hand - es gibt keine
// Automatik und kein Verschieben zwischen den beiden Listen.
//
// Speicher ist eine eigene Local-To-do-Liste (CONFIG.projectList). Ein Eintrag je Projekt,
// alles außer Titel und Zieldatum steht als JSON in der Beschreibung:
//   {"phase":"laeuft","people":["seb"],"notiz":"…","bilder":["<image_id>"]}
//
// Die Phase muss extra mitgeführt werden: Der To-do-Status kennt nur offen/erledigt,
// "wartet auf Lieferung" ist aber weder das eine noch das andere. Phase "fertig" und
// Status "completed" werden zusammen gesetzt, damit die Liste auch in der HA-App stimmt.

const PHASEN = [
  { id: "idee", label: "Idee", farbe: "flieder" },
  { id: "laeuft", label: "Läuft", farbe: "himmel" },
  { id: "wartet", label: "Wartet", farbe: "aprikose" },
  { id: "fertig", label: "Fertig", farbe: "minze" },
];

function phaseVon(id) {
  return PHASEN.find((p) => p.id === id) || PHASEN[0];
}

function parseProjektMeta(item) {
  const leer = { phase: "idee", people: [], notiz: "", bilder: [] };
  if (!item.description) return leer;
  try {
    const m = JSON.parse(item.description);
    return {
      phase: PHASEN.some((p) => p.id === m.phase) ? m.phase : leer.phase,
      people: Array.isArray(m.people) ? m.people : [],
      notiz: typeof m.notiz === "string" ? m.notiz : "",
      bilder: Array.isArray(m.bilder) ? m.bilder : [],
    };
  } catch {
    return leer;
  }
}

const ProjekteView = {
  container: null,
  items: [],
  // Abgeschlossene Projekte stehen von Anfang an offen - das Archiv ist hier kein
  // Abstellraum, sondern zeigt, was die Familie geschafft hat. Zuklappen geht weiterhin.
  archivOffen: true,

  init(container) {
    this.container = container;
    container.innerHTML = `<div class="empty empty--laedt">Lade Projekte…</div>`;
    this.load();
  },

  async load() {
    try {
      this.items = await HaWs.getTodoItems(CONFIG.projectList.entity);
      this.render();
    } catch (err) {
      console.error(err);
      this.container.innerHTML = `
        <div class="error-banner">
          Liste <code>${CONFIG.projectList.entity}</code> nicht erreichbar.
          In Home Assistant anlegen: Einstellungen → Geräte &amp; Dienste →
          Integration hinzufügen → „Local To-do", Name „Projekte".
        </div>`;
    }
  },

  profilVon(id) {
    return CONFIG.taskProfiles.find((p) => p.id === id) || null;
  },

  // --- Speichern --------------------------------------------------------------

  async speichern(uid, { titel, meta, faellig } = {}) {
    const data = { entity_id: CONFIG.projectList.entity, item: uid };
    if (titel) data.rename = titel;
    if (faellig !== undefined) data.due_date = faellig || null;
    if (meta) {
      data.description = JSON.stringify(meta);
      // Phase und To-do-Status zusammenhalten
      data.status = meta.phase === "fertig" ? "completed" : "needs_action";
    }
    await HaApi.callService("todo", "update_item", data);
    await this.load();
  },

  async anlegen(titel, meta, faellig) {
    await HaApi.addTodoItem(CONFIG.projectList.entity, titel, {
      dueDate: faellig || null,
      description: JSON.stringify(meta),
    });
    await this.load();
  },

  // Bilder gehören zum Projekt - beim Löschen müssen sie mit, sonst bleiben Waisen in
  // config/image/ liegen, die niemand mehr zuordnen kann.
  async loeschen(item) {
    const { bilder } = parseProjektMeta(item);
    for (const id of bilder) {
      await BildUpload.loeschen(id).catch((e) =>
        console.warn("Bild konnte nicht gelöscht werden:", id, e.message)
      );
    }
    await HaApi.removeTodoItem(CONFIG.projectList.entity, item.uid);
    await this.load();
  },

  // --- Aufbau ------------------------------------------------------------------

  render() {
    const nachPhase = new Map(PHASEN.map((p) => [p.id, []]));
    for (const item of this.items) {
      const meta = parseProjektMeta(item);
      nachPhase.get(meta.phase).push({ item, meta });
    }

    const offen = ["laeuft", "wartet", "idee"]
      .filter((id) => nachPhase.get(id).length)
      .map((id) => this.abschnitt(phaseVon(id), nachPhase.get(id)))
      .join("");

    const fertig = nachPhase.get("fertig");

    this.container.innerHTML = `
      <header class="pj-kopf">
        <h1 class="pj-titel">Projekte</h1>
        <button class="btn-primary" id="pj-neu">+ Projekt</button>
      </header>
      ${
        offen ||
        `<div class="empty empty--gross">
           <div class="empty-icon">🛠️</div>
           <div class="empty-text">Noch keine Projekte.</div>
           <div>Größere Vorhaben kommen hierher, kleine Erledigungen zu den To-Dos.</div>
         </div>`
      }
      ${this.archiv(fertig)}`;

    document.getElementById("pj-neu").addEventListener("click", () => this.formular());
    this.container.querySelectorAll("[data-projekt]").forEach((el) => {
      el.addEventListener("click", () => {
        const item = this.items.find((i) => i.uid === el.dataset.projekt);
        if (item) this.detail(item);
      });
    });
    const archivKopf = document.getElementById("pj-archiv-kopf");
    if (archivKopf) {
      archivKopf.addEventListener("click", () => {
        this.archivOffen = !this.archivOffen;
        this.render();
      });
    }
  },

  abschnitt(phase, eintraege) {
    return `
      <section class="pj-abschnitt">
        <header class="pj-abschnitt-kopf">
          <span class="pj-punkt pj-punkt--${phase.farbe}"></span>
          <h2>${phase.label}</h2>
          <span class="pj-anzahl">${eintraege.length}</span>
        </header>
        <div class="pj-raster">${eintraege.map((e) => this.karte(e)).join("")}</div>
      </section>`;
  },

  archiv(eintraege) {
    if (!eintraege.length) return "";
    return `
      <section class="pj-archiv">
        <button class="pj-archiv-kopf" id="pj-archiv-kopf" aria-expanded="${this.archivOffen}">
          <b>${eintraege.length} abgeschlossen</b>
          <span class="ek-hinweis">Archiv bleibt erhalten</span>
          <span class="ek-pfeil">${this.archivOffen ? "▾" : "▸"}</span>
        </button>
        ${
          this.archivOffen
            ? `<div class="pj-raster">${eintraege.map((e) => this.karte(e)).join("")}</div>`
            : ""
        }
      </section>`;
  },

  karte({ item, meta }) {
    const phase = phaseVon(meta.phase);
    const titelbild = meta.bilder[0];

    const bild = titelbild
      ? `<img class="pj-bild" src="${BildUpload.url(titelbild, "512x512")}" alt="" />`
      : `<div class="pj-bild pj-bild--leer pj-bild--${phase.farbe}">
           ${this.escape((item.summary || "?").trim().charAt(0).toUpperCase())}
         </div>`;

    const avatare = meta.people
      .map((id) => this.profilVon(id))
      .filter(Boolean)
      .map((p) =>
        p.avatar
          ? `<img class="pj-avatar" src="${p.avatar}" alt="${this.escape(p.name)}" />`
          : `<span class="pj-avatar pj-avatar--initial"
                   style="background:color-mix(in srgb, ${p.color} 45%, var(--c-canvas))"
             >${this.escape(p.name[0])}</span>`
      )
      .join("");

    return `
      <article class="pj-karte ${meta.phase === "fertig" ? "is-fertig" : ""}"
               data-projekt="${this.escape(item.uid)}" tabindex="0">
        ${bild}
        <div class="pj-karte-inhalt">
          <div class="pj-name">${this.escape(item.summary)}</div>
          ${meta.notiz ? `<p class="pj-notiz">${this.escape(meta.notiz)}</p>` : ""}
          <div class="pj-fuss">
            <span class="chip chip--klein pj-phase pj-phase--${phase.farbe}">${phase.label}</span>
            ${item.due ? `<span class="pj-datum">${this.datum(item.due)}</span>` : ""}
            <span class="pj-avatare">${avatare}</span>
          </div>
        </div>
      </article>`;
  },

  datum(iso) {
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  },

  // --- Detail ------------------------------------------------------------------

  detail(item) {
    const meta = parseProjektMeta(item);

    const phasenChips = PHASEN.map(
      (p) =>
        `<button type="button" class="chip ${p.id === meta.phase ? "on" : ""}"
                 data-phase="${p.id}">${p.label}</button>`
    ).join("");

    const profilChips = CONFIG.taskProfiles
      .map(
        (p) => `
        <button type="button" class="chip ${meta.people.includes(p.id) ? "on" : ""}"
                data-profil="${p.id}">
          ${p.avatar ? `<img class="chip-avatar" src="${p.avatar}" alt="" />` : ""}${this.escape(p.name)}
        </button>`
      )
      .join("");

    Modal.open(`
      <div class="modal-header">
        <h2>${this.escape(item.summary)}</h2>
        <button class="modal-close" id="pj-zu">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-label">Phase
          <div class="chip-row" id="pj-phasen">${phasenChips}</div>
        </div>

        <div class="form-label">Zuweisen an
          <div class="chip-row" id="pj-profile">${profilChips}</div>
        </div>

        <label class="form-label">Notiz
          <textarea class="form-input" id="pj-notiz" rows="4"
                    placeholder="Maße, Links, was als Nächstes ansteht …">${this.escape(meta.notiz)}</textarea>
        </label>

        <label class="form-label">Zieldatum (optional)
          <input type="date" class="form-input" id="pj-faellig" value="${item.due || ""}" />
        </label>

        <div class="form-label">Bilder
          <div class="pj-galerie" id="pj-galerie"></div>
          <label class="chip chip--geist pj-zufuegen">
            + Bild hinzufügen
            <input type="file" accept="image/*" multiple hidden id="pj-datei" />
          </label>
          <p class="kita-hint" id="pj-bild-status">Das erste Bild wird zum Titelbild.</p>
        </div>

        <div id="pj-fehler"></div>
      </div>
      <div class="modal-footer pj-fuss-dialog">
        <button class="chip chip--geist" id="pj-loeschen">Projekt löschen</button>
        <button class="btn-primary" id="pj-sichern">Sichern</button>
      </div>
    `);

    const stand = { ...meta, bilder: [...meta.bilder] };

    const galerieZeichnen = () => {
      const el = document.getElementById("pj-galerie");
      el.innerHTML = stand.bilder
        .map(
          (id, i) => `
          <figure class="pj-bild-kachel">
            <img src="${BildUpload.url(id, "256x256")}" alt="" />
            ${i === 0 ? `<figcaption>Titelbild</figcaption>` : ""}
            <button class="pj-bild-weg" data-bild="${id}" aria-label="Bild entfernen">&times;</button>
          </figure>`
        )
        .join("");
      el.querySelectorAll("[data-bild]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.bild;
          stand.bilder = stand.bilder.filter((b) => b !== id);
          galerieZeichnen();
          await BildUpload.loeschen(id).catch(() => {});
        });
      });
    };
    galerieZeichnen();

    document.getElementById("pj-zu").addEventListener("click", () => Modal.close());

    document.querySelectorAll("[data-phase]").forEach((chip) => {
      chip.addEventListener("click", () => {
        stand.phase = chip.dataset.phase;
        document.querySelectorAll("[data-phase]").forEach((c) => c.classList.remove("on"));
        chip.classList.add("on");
      });
    });

    document.querySelectorAll("[data-profil]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.profil;
        if (stand.people.includes(id)) stand.people = stand.people.filter((p) => p !== id);
        else stand.people.push(id);
        chip.classList.toggle("on");
      });
    });

    document.getElementById("pj-datei").addEventListener("change", async (e) => {
      const dateien = [...e.target.files];
      e.target.value = "";
      const status = document.getElementById("pj-bild-status");
      for (const [i, datei] of dateien.entries()) {
        status.textContent = `Lade Bild ${i + 1} von ${dateien.length} …`;
        try {
          const hoch = await BildUpload.hochladen(datei);
          stand.bilder.push(hoch.id);
          galerieZeichnen();
        } catch (err) {
          document.getElementById("pj-fehler").innerHTML =
            `<div class="error-banner">${this.escape(err.message)}</div>`;
        }
      }
      status.textContent = "Das erste Bild wird zum Titelbild.";
    });

    document.getElementById("pj-sichern").addEventListener("click", async () => {
      stand.notiz = document.getElementById("pj-notiz").value.trim();
      try {
        await this.speichern(item.uid, {
          meta: { phase: stand.phase, people: stand.people, notiz: stand.notiz, bilder: stand.bilder },
          faellig: document.getElementById("pj-faellig").value,
        });
        Modal.close();
      } catch (err) {
        document.getElementById("pj-fehler").innerHTML =
          `<div class="error-banner">${this.escape(err.message)}</div>`;
      }
    });

    document.getElementById("pj-loeschen").addEventListener("click", async () => {
      const knopf = document.getElementById("pj-loeschen");
      // Zweistufig: Ein Projekt samt Bildern ist nicht wiederherstellbar.
      if (knopf.dataset.sicher !== "ja") {
        knopf.dataset.sicher = "ja";
        knopf.textContent = "Wirklich löschen? Nochmal tippen";
        knopf.classList.add("chip--stark");
        return;
      }
      try {
        await this.loeschen(item);
        Modal.close();
      } catch (err) {
        document.getElementById("pj-fehler").innerHTML =
          `<div class="error-banner">${this.escape(err.message)}</div>`;
      }
    });
  },

  // --- Neu anlegen --------------------------------------------------------------

  formular() {
    const phasenChips = PHASEN.map(
      (p) =>
        `<button type="button" class="chip ${p.id === "idee" ? "on" : ""}" data-nphase="${p.id}">${p.label}</button>`
    ).join("");

    const profilChips = CONFIG.taskProfiles
      .map(
        (p) => `
        <button type="button" class="chip" data-nprofil="${p.id}">
          ${p.avatar ? `<img class="chip-avatar" src="${p.avatar}" alt="" />` : ""}${this.escape(p.name)}
        </button>`
      )
      .join("");

    Modal.open(`
      <div class="modal-header">
        <h2>Neues Projekt</h2>
        <button class="modal-close" id="pj-neu-zu">&times;</button>
      </div>
      <form class="modal-body" id="pj-neu-form">
        <label class="form-label">Titel
          <input type="text" name="titel" required class="form-input" autocomplete="off"
                 placeholder="Regal hinter Eingangstür" />
        </label>

        <div class="form-label">Phase
          <div class="chip-row" id="pj-neu-phasen">${phasenChips}</div>
        </div>

        <div class="form-label">Zuweisen an
          <div class="chip-row">${profilChips}</div>
          <p class="kita-hint">Mehrfachauswahl möglich. Nichts gewählt = ohne Zuweisung.</p>
        </div>

        <label class="form-label">Notiz (optional)
          <textarea class="form-input" name="notiz" rows="3"></textarea>
        </label>

        <label class="form-label">Zieldatum (optional)
          <input type="date" name="faellig" class="form-input" />
        </label>

        <p class="kita-hint">Bilder kommen nach dem Anlegen dazu — dann öffnet sich die Karte.</p>
        <div id="pj-neu-fehler"></div>
        <div class="modal-footer">
          <button type="submit" class="btn-primary">Anlegen</button>
        </div>
      </form>
    `);

    document.getElementById("pj-neu-zu").addEventListener("click", () => Modal.close());

    let phase = "idee";
    document.querySelectorAll("[data-nphase]").forEach((chip) => {
      chip.addEventListener("click", () => {
        phase = chip.dataset.nphase;
        document.querySelectorAll("[data-nphase]").forEach((c) => c.classList.remove("on"));
        chip.classList.add("on");
      });
    });

    const gewaehlt = new Set();
    document.querySelectorAll("[data-nprofil]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.nprofil;
        if (gewaehlt.has(id)) gewaehlt.delete(id);
        else gewaehlt.add(id);
        chip.classList.toggle("on");
      });
    });

    document.getElementById("pj-neu-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = new FormData(e.target);
      const titel = d.get("titel").trim();
      if (!titel) return;
      try {
        await this.anlegen(
          titel,
          { phase, people: [...gewaehlt], notiz: d.get("notiz").trim(), bilder: [] },
          d.get("faellig")
        );
        Modal.close();
      } catch (err) {
        document.getElementById("pj-neu-fehler").innerHTML =
          `<div class="error-banner">${this.escape(err.message)}</div>`;
      }
    });
  },

  escape(text) {
    const d = document.createElement("div");
    d.textContent = text == null ? "" : String(text);
    return d.innerHTML;
  },
};
