// Detailwetter beim Klick auf die Anzeige in der Kopfzeile.
//
// Aufbau nach der Vorlage vom 04.08.2026: links der aktuelle Zustand groß, rechts die
// Tagesliste, unten der Stundenverlauf als Kurve. Übernommen ist die Anordnung, nicht die
// Farbwelt - die Vorlage ist dunkel, wir bleiben im Pastellsystem aus DESIGN.md.
//
// Zwei Quellen, und zwar mit Absicht:
//
//   /api/states/<entity>          aktueller Zustand, aus HA (met.no)
//   weather.get_forecasts daily   6 Tage, aus HA (met.no)
//   OpenMeteo.stunden()           Stundenverlauf samt Regenwahrscheinlichkeit
//
// Der aktuelle Zustand und die Tagesliste kommen aus derselben Quelle wie die Anzeige in
// der Kopfzeile - sonst widersprächen sich beide. Warum der Stundenverlauf woanders
// herkommt, steht in `js/open-meteo.js`.
//
// Fällt Open-Meteo aus (kein Internet), tritt die Stundenvorhersage aus HA an ihre Stelle -
// dann eben ohne Prozentwerte. Der Dialog darf am Wandtablet nicht leer bleiben.

const WEATHER_LABELS = {
  "clear-night": "Klare Nacht",
  cloudy: "Bewölkt",
  fog: "Nebel",
  hail: "Hagel",
  lightning: "Gewitter",
  "lightning-rainy": "Gewitter mit Regen",
  partlycloudy: "Teils bewölkt",
  pouring: "Starker Regen",
  rainy: "Regen",
  snowy: "Schnee",
  "snowy-rainy": "Schneeregen",
  sunny: "Sonnig",
  windy: "Windig",
  "windy-variant": "Windig",
  exceptional: "Unwetter",
};

// Wie viele Stunden gleichzeitig in der Kurve stehen. Acht passen in die Modalbreite,
// ohne dass sich die Temperaturen berühren.
const WM_STUNDEN_PRO_SEITE = 8;

// Wie viele Stunden der Verlauf insgesamt zeigt - sechs Seiten zu acht.
const WM_STUNDEN_GESAMT = 48;

const WeatherModal = {
  stunden: [],
  seite: 0,
  jetztIndex: 0,
  quelle: "met.no",

  async open() {
    Modal.open(
      `<div class="modal-header">
         <h2>Wetter</h2>
         <button class="modal-close" id="modal-close-btn">&times;</button>
       </div>
       <div class="modal-body"><div class="empty empty--laedt">Lade Vorhersage…</div></div>`,
      { klasse: "modal-box--wetter" }
    );
    document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());

    try {
      const [jetzt, tage, stunden] = await Promise.all([
        this.aktuell(),
        this.vorhersage("daily"),
        this.stundenLaden(),
      ]);

      this.stunden = stunden;
      // Markiert und angesteuert wird die nächste Stunde, nicht die laufende: Die
      // Vorhersage beginnt bei der nächsten vollen Stunde, die aktuelle steht gar nicht
      // darin. Ein Abgleich auf "gleiche Stunde" fände deshalb meistens nichts.
      const naechste = stunden.findIndex((s) => new Date(s.datetime) >= new Date());
      this.jetztIndex = Math.max(naechste, 0);
      this.seite = Math.floor(this.jetztIndex / WM_STUNDEN_PRO_SEITE);

      this.render(jetzt, tage);
    } catch (err) {
      console.error(err);
      const body = document.querySelector(".modal-body");
      if (body) body.innerHTML = `<div class="error-banner">Vorhersage nicht ladbar: ${err.message}</div>`;
    }
  },

  async aktuell() {
    const res = await fetch(`${CONFIG.haUrl}/api/states/${CONFIG.weatherEntity}`, {
      headers: { Authorization: `Bearer ${CONFIG.haToken}` },
    });
    if (!res.ok) throw new Error(`Zustand nicht abrufbar (${res.status})`);
    return res.json();
  },

  async vorhersage(typ) {
    const response = await HaApi.callServiceWithResponse("weather", "get_forecasts", {
      entity_id: CONFIG.weatherEntity,
      type: typ,
    });
    return Object.values(response)[0]?.forecast || [];
  },

  async stundenLaden() {
    try {
      const stunden = await OpenMeteo.stunden();
      if (stunden.length) {
        this.quelle = "Open-Meteo";
        return stunden.slice(0, WM_STUNDEN_GESAMT);
      }
    } catch (err) {
      console.warn("Open-Meteo nicht erreichbar, weiche auf HA aus:", err);
    }

    this.quelle = "met.no";
    return (await this.vorhersage("hourly"))
      .map((s) => ({ ...s, probability: null }))
      .slice(0, WM_STUNDEN_GESAMT);
  },

  render(jetzt, tage) {
    const a = jetzt.attributes || {};
    const zustand = jetzt.state;

    document.querySelector(".modal-body").innerHTML = `
      <div class="wm-oben">
        <div class="wm-jetzt">
          <div class="wm-temp">${Math.round(a.temperature)}<span class="wm-grad">°C</span></div>
          <div class="wm-zustand">${WEATHER_LABELS[zustand] || "Wetter"}</div>
          <div class="wm-werte">
            ${this.wert("Wind", `${this.zahl(a.wind_speed)} ${a.wind_speed_unit || "km/h"}`)}
            ${this.wert("Luftfeuchte", `${Math.round(a.humidity)} %`)}
            ${a.uv_index != null ? this.wert("UV-Index", Math.round(a.uv_index)) : ""}
          </div>
        </div>

        <div class="wm-held" aria-hidden="true">${WEATHER_ICONS[zustand] || "🌡️"}</div>

        <ul class="wm-tage">${tage.slice(0, 6).map((t, i) => this.tag(t, i)).join("")}</ul>
      </div>

      <div class="wm-verlauf" id="wm-verlauf"></div>
      <p class="weather-note" id="wm-quelle"></p>
    `;

    this.renderVerlauf();

    // Woher was kommt, gehört sichtbar hin - sonst wundert sich später jemand, warum
    // Kopfzeile und Verlauf leicht auseinandergehen können.
    document.getElementById("wm-quelle").textContent =
      this.quelle === "Open-Meteo"
        ? "Aktuelles Wetter und Tage von met.no über Home Assistant, Stundenverlauf mit " +
          "Regenwahrscheinlichkeit vom DWD-Modell über Open-Meteo."
        : "Open-Meteo nicht erreichbar – Stundenverlauf von met.no, deshalb ohne " +
          "Regenwahrscheinlichkeit.";
  },

  wert(label, wert) {
    return `<div class="wm-wert">
        <span class="wm-wert-label">${label}</span>
        <span class="wm-wert-zahl">${wert}</span>
      </div>`;
  },

  zahl(n) {
    return Number(n).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  },

  // Erste Zeile ist heute und trägt den Korall-Balken - dieselbe Rolle wie überall sonst
  // in der App: Korall heißt "jetzt/heute", nicht "wichtig".
  tag(t, index) {
    const datum = new Date(t.datetime);
    const name = index === 0 ? "Heute" : datum.toLocaleDateString("de-DE", { weekday: "long" });
    const regen = t.precipitation > 0 ? `<span class="wm-tag-regen">${this.zahl(t.precipitation)} mm</span>` : "";

    return `
      <li class="wm-tag ${index === 0 ? "is-heute" : ""}">
        <span class="wm-tag-icon">${WEATHER_ICONS[t.condition] || "🌡️"}</span>
        <span class="wm-tag-text">
          <span class="wm-tag-name">${name}</span>
          <span class="wm-tag-zustand">${WEATHER_LABELS[t.condition] || ""}${regen}</span>
        </span>
        <span class="wm-tag-temp">
          ${Math.round(t.temperature)}°<span class="wm-tag-tief">${Math.round(t.templow)}°</span>
        </span>
      </li>`;
  },

  // --- Stundenverlauf ---------------------------------------------------------

  renderVerlauf() {
    const host = document.getElementById("wm-verlauf");
    if (!host) return;

    const seiten = Math.ceil(this.stunden.length / WM_STUNDEN_PRO_SEITE);
    const von = this.seite * WM_STUNDEN_PRO_SEITE;
    const punkte = this.stunden.slice(von, von + WM_STUNDEN_PRO_SEITE);
    if (!punkte.length) return;

    host.innerHTML = `
      <div class="wm-kurve">${this.kurve(punkte, von)}</div>
      <div class="wm-achse">${punkte.map((p, i) => this.achse(p, von + i)).join("")}</div>
      <div class="wm-blaettern">
        <button class="chip chip--icon" id="wm-zurueck" ${this.seite === 0 ? "disabled" : ""}
                aria-label="Frühere Stunden">‹</button>
        <button class="chip chip--icon" id="wm-vor" ${this.seite >= seiten - 1 ? "disabled" : ""}
                aria-label="Spätere Stunden">›</button>
      </div>`;

    document.getElementById("wm-zurueck").addEventListener("click", () => {
      this.seite = Math.max(0, this.seite - 1);
      this.renderVerlauf();
    });
    document.getElementById("wm-vor").addEventListener("click", () => {
      this.seite = Math.min(seiten - 1, this.seite + 1);
      this.renderVerlauf();
    });
  },

  // Unter der Uhrzeit steht, was die Vorgängerfassung als eigene Spalte hatte.
  //
  // Der UV-Wert steht bei JEDER Stunde, auch nachts als 0 - so ist die Reihe vollständig
  // und man sieht, wann er steigt, statt nur den Ausschlag zu sehen. Ab Stufe 6 wechselt
  // er auf die Hinweisrolle (Aprikose), sonst bleibt er gedämpft.
  //
  // Die Regenmenge erscheint dagegen nur, wenn es welche gibt: "0,0 mm" acht Mal
  // nebeneinander wäre eine Zeile, die nie etwas sagt.
  achse(p, index) {
    const d = new Date(p.datetime);
    // Schwelle auf den gerundeten Wert, nicht auf den Rohwert: Sonst steht bei 5,6 ein
    // "UV 6" ohne Hervorhebung neben einem hervorgehobenen "UV 6" - für den Betrachter
    // derselbe Wert, verschieden dargestellt.
    const uvHoch = Math.round(p.uv_index) >= UV_SONNENSCHUTZ;

    // Ab 40 Prozent wird aus der Zahl ein Hinweis - darunter ist Regen möglich, aber keine
    // Grundlage für "Matschhose einpacken".
    const regenWahrscheinlich = p.probability >= 40;

    return `<span class="wm-achse-spalte">
        <span class="wm-achse-zeit ${index === this.jetztIndex ? "is-jetzt" : ""}">
          ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        </span>
        ${
          p.probability != null
            ? `<span class="wm-achse-regen ${regenWahrscheinlich ? "is-hoch" : ""}">${Math.round(p.probability)} %</span>`
            : ""
        }
        ${
          p.precipitation > 0
            ? `<span class="wm-achse-menge">${this.zahl(p.precipitation)} mm</span>`
            : ""
        }
        ${
          p.uv_index != null
            ? `<span class="wm-achse-uv ${uvHoch ? "is-hoch" : ""}">UV ${Math.round(p.uv_index)}</span>`
            : ""
        }
      </span>`;
  },

  // Die Skala gilt für alle 48 Stunden, nicht je Seite. Sonst sähe eine gleichmäßige
  // Seite genauso bewegt aus wie ein Temperatursturz, nur weil sich der Maßstab ändert.
  kurve(punkte, von) {
    const alle = this.stunden.map((s) => s.temperature);
    const min = Math.min(...alle);
    const spanne = Math.max(Math.max(...alle) - min, 1);

    const B = 800;
    const H = 150;
    const rand = 48; // Platz für die Temperaturbeschriftung über dem höchsten Punkt
    const schritt = (B - 2 * rand) / Math.max(punkte.length - 1, 1);

    const koord = punkte.map((p, i) => ({
      x: rand + i * schritt,
      y: H - 26 - ((p.temperature - min) / spanne) * (H - rand - 26),
      p,
    }));

    return `
      <svg viewBox="0 0 ${B} ${H}" preserveAspectRatio="none" class="wm-svg" role="img"
           aria-label="Temperaturverlauf der nächsten Stunden">
        <path d="${this.pfad(koord)}" class="wm-linie" />
        ${koord
          .map(
            (k, i) => `
          <text x="${k.x}" y="${k.y - 16}" class="wm-punkt-temp">${Math.round(k.p.temperature)}°</text>
          ${
            von + i === this.jetztIndex
              ? `<circle cx="${k.x}" cy="${k.y}" r="6" class="wm-punkt-jetzt" />`
              : ""
          }`
          )
          .join("")}
      </svg>`;
  },

  // Weiche Linie durch alle Punkte (Catmull-Rom, in Bézier umgerechnet). Eine gerade
  // Verbindung wirkte bei acht Stützstellen hart und technisch.
  pfad(k) {
    if (k.length < 2) return "";
    let d = `M ${k[0].x} ${k[0].y}`;
    for (let i = 0; i < k.length - 1; i++) {
      const p0 = k[i - 1] || k[i];
      const p1 = k[i];
      const p2 = k[i + 1];
      const p3 = k[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  },
};
