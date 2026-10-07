// Stundenvorhersage von Open-Meteo - die einzige Stelle, an der die App an Home Assistant
// vorbei mit einem fremden Dienst spricht.
//
// Grund: met.no liefert für Deutschland keine Regenwahrscheinlichkeit. Die HA-Integration
// könnte sie durchreichen (`FORECAST_MAP` in `met/const.py` kennt das Feld), sie kommt nur
// nie an - die Wahrscheinlichkeit steckt im nordischen Modell. HAs eingebaute
// Open-Meteo-Integration hilft ebenfalls nicht: Ihr Koordinator fragt stündlich nur
// precipitation, temperature_2m und weather_code ab.
//
// Open-Meteo braucht keinen Schlüssel, erlaubt CORS und kennt nur Koordinaten - keine
// Stadt, keine PLZ, keinen Stadtteil. Die Koordinaten kommen aus HA, damit der Ort nur an
// einer Stelle gepflegt wird (Einstellungen → System → Allgemein).
//
// Genutzt vom Wetter-Dialog (Stundenverlauf) und von der Heute-Ansicht (Kleidungshinweis
// für morgen). Deshalb der gemeinsame Zwischenspeicher: Beide fragen dieselben Daten ab.

const OM_URL = "https://api.open-meteo.com/v1/forecast";
const OM_CACHE_MS = 15 * 60 * 1000;

// Ab dieser Stufe gilt Sonnenschutz. Maßstab sind die Kinder, nicht die Erwachsenen -
// deshalb 3 und nicht 6. Steht hier, weil beide Nutzer der Wetterdaten sie brauchen: der
// Kleidungshinweis in der Heute-Ansicht und die Hervorhebung im Wetter-Dialog. Sie sollen
// nie auseinanderlaufen, sonst steht ein Hinweis für eine Stunde, die im Verlauf unauffällig
// aussieht.
const UV_SONNENSCHUTZ = 3;

const OpenMeteo = {
  _ort: null,
  _cache: null, // { stunden, ts }

  async ort() {
    if (CONFIG.wetterOrt) return CONFIG.wetterOrt;
    if (this._ort) return this._ort;

    const res = await fetch(`${CONFIG.haUrl}/api/config`, {
      headers: { Authorization: `Bearer ${CONFIG.haToken}` },
    });
    if (!res.ok) throw new Error(`Standort nicht abrufbar (${res.status})`);
    const cfg = await res.json();
    this._ort = { lat: cfg.latitude, lon: cfg.longitude };
    return this._ort;
  },

  // Zwei Modelle in einem Aufruf, und dafür gibt es einen gemessenen Grund.
  //
  // Ohne Modellangabe mischt Open-Meteo: Die Regenmenge kommt aus einem hochaufgelösten
  // Modell, die Wahrscheinlichkeit aus einem Ensemble. Am 05.08.2026 stand deshalb für
  // 08:00 "2,9 mm" neben "0 %" - für jeden Leser ein Widerspruch.
  //
  // icon_seamless ist die DWD-Kette (ICON-D2, dann ICON-EU/global): Menge UND
  // Wahrscheinlichkeit stammen aus derselben Quelle. Nur der UV-Index fehlt dort
  // vollständig (72 von 72 Stunden leer), den liefert best_match im selben Aufruf mit.
  async stunden() {
    if (this._cache && Date.now() - this._cache.ts < OM_CACHE_MS) return this._cache.stunden;

    const { lat, lon } = await this.ort();
    const felder = "temperature_2m,precipitation,precipitation_probability,uv_index";
    const url =
      `${OM_URL}?latitude=${lat}&longitude=${lon}&hourly=${felder}` +
      `&models=icon_seamless,best_match&timezone=Europe%2FBerlin&forecast_days=3`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo antwortet mit ${res.status}`);
    const d = await res.json();
    const h = d.hourly;
    if (!h?.time?.length) return [];

    // Ohne Zeitzonenangabe im Zeitstempel legt der Browser UTC zugrunde - deshalb hängen
    // wir den Versatz an, den Open-Meteo mitliefert.
    const versatz = this.versatz(d.utc_offset_seconds);
    const grenze = Date.now() - 60 * 60 * 1000;

    const stunden = h.time
      .map((t, i) => ({
        datetime: `${t}:00${versatz}`,
        temperature: h.temperature_2m_icon_seamless[i],
        precipitation: h.precipitation_icon_seamless[i],
        probability: h.precipitation_probability_icon_seamless[i],
        uv_index: h.uv_index_best_match[i],
      }))
      .filter((s) => new Date(s.datetime).getTime() >= grenze);

    this._cache = { stunden, ts: Date.now() };
    return stunden;
  },

  versatz(sekunden) {
    const vorzeichen = sekunden < 0 ? "-" : "+";
    const abs = Math.abs(sekunden);
    const std = String(Math.floor(abs / 3600)).padStart(2, "0");
    const min = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
    return `${vorzeichen}${std}:${min}`;
  },
};
