// "Heute": Zusammenfassung, Agenda, fällige Aufgaben, Essen, Einkaufsliste.
// Ab 18:00 klappt zusätzlich der Ausblick auf morgen auf.

const EVENING_HOUR = 18;

const TodayView = {
  container: null,

  _chosenMeal: null,

  init(container) {
    this.container = container;
    container.innerHTML = `<div class="empty empty--laedt">Lade…</div>`;
    this.loadChosenMeal().then(() => this.load());
  },

  async load() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 2); // heute + morgen

    const [events, todos, forecast, heuteWetter, meals] = await Promise.all([
      HaApi.getAllEvents(today, rangeEnd).catch((e) => {
        console.error(e);
        return [];
      }),
      HaWs.getTodoItems(CONFIG.todoList.entity).catch(() => []),
      this.tomorrowForecast(),
      this.todayForecast(),
      this.currentMeals(),
    ]);

    this.render({ events, todos, forecast, heuteWetter, meals });
  },

  // Gerichte der zuletzt gelieferten Box - das ist, was gerade im Kühlschrank liegt.
  // Was in der HelloFresh-Ansicht als gekocht abgehakt ist, fällt hier heraus.
  async currentMeals() {
    try {
      const cached = JSON.parse(localStorage.getItem(HF_CACHE_KEY) || "null");
      const weeks = cached?.weeks || [];
      if (!weeks.length) return { meals: [], gekocht: 0 };

      const woche = GekochtStore.aktuelleWoche(weeks);
      if (!woche) return { meals: [], gekocht: 0 };

      const gekocht = await GekochtStore.lade(woche.weekId);
      return {
        meals: woche.meals.filter((m) => !gekocht.has(m.id)),
        gekocht: woche.meals.filter((m) => gekocht.has(m.id)).length,
      };
    } catch {
      return { meals: [], gekocht: 0 };
    }
  },

  // Der Kleidungshinweis lebt von der Regenwahrscheinlichkeit, und die liefert met.no für
  // Deutschland nicht (Begründung in js/open-meteo.js). Deshalb kommen die Stundenwerte
  // von dort; die Wetterlage für den Satz "Morgen" bleibt bei met.no über HA, damit sie
  // zum Rest der Ansicht passt.
  async tomorrowForecast() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.forecastFuer(tomorrow);
  },

  // Für heute zählt nur, was noch kommt: Um 14 Uhr hilft die UV-Spitze des Vormittags
  // niemandem mehr. Die laufende Stunde bleibt drin, sie ist ja noch nicht vorbei.
  async todayForecast() {
    return this.forecastFuer(new Date(), { abJetzt: true });
  },

  async forecastFuer(datum, { abJetzt = false } = {}) {
    if (!CONFIG.weatherEntity) return null;

    const day = isoDate(datum);
    const grenze = Date.now() - 60 * 60 * 1000;

    // Nur der Zeitraum, in dem Zoe unterwegs ist - nachts regnet es oft ohne Belang.
    const imKitaFenster = (eintraege) =>
      eintraege.filter((f) => {
        const d = new Date(f.datetime);
        if (isoDate(d) !== day || d.getHours() < 7 || d.getHours() > 17) return false;
        return !abJetzt || d.getTime() >= grenze;
      });

    try {
      const relevant = imKitaFenster(await OpenMeteo.stunden());
      if (relevant.length) return this.fasseZusammen(relevant, true);
    } catch (err) {
      console.warn("Open-Meteo nicht verfügbar, weiche auf HA aus:", err);
    }

    // Rückfallebene ohne Prozentwerte - besser ein Hinweis nach Menge als gar keiner.
    try {
      const response = await HaApi.callServiceWithResponse("weather", "get_forecasts", {
        entity_id: CONFIG.weatherEntity,
        type: "hourly",
      });
      const relevant = imKitaFenster(Object.values(response)[0]?.forecast || []);
      return relevant.length ? this.fasseZusammen(relevant, false) : null;
    } catch (err) {
      console.warn("Vorhersage nicht verfügbar:", err);
      return null;
    }
  },

  fasseZusammen(stunden, mitWahrscheinlichkeit) {
    return {
      min: Math.min(...stunden.map((f) => f.temperature)),
      max: Math.max(...stunden.map((f) => f.temperature)),
      rain: stunden.reduce((sum, f) => sum + (f.precipitation || 0), 0),
      uv: Math.max(...stunden.map((f) => f.uv_index ?? 0)),
      // Der höchste Stundenwert, nicht der Mittelwert: Eine Stunde mit 80 % am Nachmittag
      // entscheidet über die Matschhose, auch wenn der Vormittag trocken bleibt.
      probability: mitWahrscheinlichkeit
        ? Math.max(...stunden.map((f) => f.probability ?? 0))
        : null,
    };
  },

  // Kleidungshinweis aus der Vorhersage.
  //
  // Seit 05.08.2026 entscheidet die Wahrscheinlichkeit, nicht die Menge. Vorher löste
  // 0,5 mm über elf Stunden verteilt schon die Matschhosen-Empfehlung aus - das ist kaum
  // Nieselregen und stand als "Regenschwelle zu empfindlich" im Backlog. Jetzt:
  //
  //   ab 60 %   Matschsachen - oder wenn trotz niedriger Wahrscheinlichkeit viel fällt
  //   ab 30 %   Regenjacke, aber ohne den ganzen Aufwand
  //
  // Ohne Prozentwerte (Open-Meteo nicht erreichbar) bleibt die Menge maßgeblich, dann aber
  // mit der im Backlog vorgeschlagenen Schwelle von 2 mm statt 0,5.
  //
  // Der Sonnenschutz hing bis zum 05.08.2026 an "über 25 Grad UND UV ab 6" - beides falsch:
  // Zoe gehört ab UV 3 eingecremt, und UV hängt am Sonnenstand, nicht an der Wärme. In der
  // Woche ab dem 05.08. hätte die alte Regel an drei von sieben Tagen geschwiegen, darunter
  // zwei mit UV über 6 bei knapp 25 Grad. Die Temperatur spielt für den Sonnenschutz
  // deshalb keine Rolle mehr.
  clothingHint(forecast) {
    if (!forecast) return null;
    const hints = [];

    if (forecast.probability != null) {
      if (forecast.probability >= 60 || forecast.rain >= 2) {
        hints.push("Matschhose, Regenjacke, Gummistiefel");
      } else if (forecast.probability >= 30) {
        hints.push("Regenjacke einpacken");
      }
    } else if (forecast.rain >= 2) {
      hints.push("Matschhose, Regenjacke, Gummistiefel");
    }

    if (forecast.min < 10) hints.push("dicke Jacke");
    if (forecast.uv >= UV_SONNENSCHUTZ) hints.push("Sonnenhut, eincremen");
    return hints.length ? hints.join(" · ") : null;
  },

  render({ events, todos, forecast, heuteWetter, meals }) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const summary = DaySummary.build(events, now);
    const agenda = DaySummary.eventsOn(events, now)
      .filter((e) => e.start.dateTime)
      .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

    // Heute fällig heißt: Datum gesetzt und nicht in der Zukunft (Überfälliges gehört dazu).
    const today = isoDate(now);
    const dueToday = todos.filter(
      (i) => i.status !== "completed" && i.due && i.due.slice(0, 10) <= today
    );
    const isEvening = now.getHours() >= EVENING_HOUR;

    const morgen = DaySummary.eventsOn(events, tomorrow)
      .filter((e) => e.start.dateTime)
      .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

    // Auf "Heute" ist die Kopfzeile ausgeblendet (siehe app.js) - Datum, Uhrzeit und
    // Wetter stehen stattdessen hier in einer Zeile, sonst stünde das Datum doppelt.
    this.container.innerHTML = `
      <header class="today-kopf">
        <h2 class="today-heading">${now.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}</h2>
        <div class="today-jetzt">
          <span id="today-clock" class="today-uhr"></span>
          <span id="today-weather" class="weather"></span>
        </div>
      </header>

      ${summary ? `<p class="today-summary">${summary}</p>` : `<p class="today-summary muted">Heute steht nichts im Kalender.</p>`}

      <!-- Der Hinweis für heute steht oben, weil er morgens gebraucht wird. Ab 18:00
           verschwindet er: Dann ist der Tag gelaufen und der Abendblock übernimmt mit
           demselben Hinweis für morgen. -->
      ${!isEvening ? this.hinweisZeile(heuteWetter, "heute") : ""}

      <!-- Zwei Spalten: links die hohe Kita-Karte, rechts die flachen Kacheln gestapelt.
           Bewusst kein Raster mit Zeilen - dort würden sich die Höhen aneinander koppeln
           und unter der kurzen Kachel bliebe eine Lücke.

           Der Abendblock steht seit 04.08.2026 unten in der rechten Spalte statt über die
           volle Breite darunter: Rechts war deutlich mehr Luft als links (307 gegen 547 px),
           und über die ganze Breite schob er die Ansicht auf 907 px - das Wandtablet hat
           810 und musste scrollen. In der Spalte wird er zwar 44 px höher, weil der Text
           öfter umbricht, aber die Ansicht passt wieder ohne Scrollen. -->
      <div class="today-spalten">
        <div class="today-spalte">
          <div id="kita-slot"></div>
          <section class="today-card">
            <h3 class="today-card-title">Heute fällig</h3>
            ${
              dueToday.length
                ? dueToday
                    .slice(0, 6)
                    .map((i) => this.aufgabenZeile(i, today))
                    .join("")
                : `<p class="empty">Nichts offen.</p>`
            }
          </section>
        </div>

        <div class="today-spalte">
          <section class="today-card">
            <h3 class="today-card-title">Termine</h3>
            ${
              agenda.length
                ? agenda.map((ev, i) => this.terminBlock(ev, `heute-${i}`, now)).join("")
                : `<p class="empty">Keine Termine mit Uhrzeit.</p>`
            }
          </section>

          ${this.mealsSection(meals)}

          <!-- Tagsüber der Blick auf morgen als Terminblöcke. Ab 18:00 übernimmt der
               Abendblock mit Wetter und Hinweis - beides zusammen stünde doppelt da. -->
          ${
            isEvening
              ? this.eveningBlock(events, tomorrow, forecast)
              : morgen.length
                ? `<section class="today-card">
                     <h3 class="today-card-title">Morgen</h3>
                     ${morgen.map((ev, i) => this.terminBlock(ev, `morgen-${i}`)).join("")}
                   </section>`
                : ""
          }
        </div>
      </div>
    `;

    // Ein Tipp auf den Block öffnet dieselben Details wie im Kalender.
    const termine = { heute: agenda, morgen };
    this.container.querySelectorAll("[data-termin]").forEach((el) => {
      const [tag, index] = el.dataset.termin.split("-");
      el.addEventListener("click", () => showEventDetails(termine[tag][Number(index)]));
    });

    this.container.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const item = todos.find((t) => t.uid === btn.dataset.toggle);
        if (!item) return;
        btn.disabled = true;
        try {
          await TodoView.umschalten(item);
        } catch (err) {
          console.error("Aufgabe nicht abgehakt:", err);
        }
        this.load();
      });
    });

    this.mountKita(now, tomorrow);
    this.bindMeals(meals.meals);

    // Uhrzeit und Wetter sitzen jetzt in dieser Ansicht und sind eben neu entstanden -
    // ohne diesen Aufruf blieben sie bis zum nächsten Intervall leer.
    updateClock();
    updateWeather();
  },

  // Termin als Pastellblock in der Farbe der Beteiligten - dieselbe Fläche wie im Kalender,
  // nur im Fluss statt auf der Zeitachse. Mit "jetzt" verblasst, was schon vorbei ist.
  terminBlock(ev, schluessel, jetzt = null) {
    const start = new Date(ev.start.dateTime);
    const ende = new Date(ev.end.dateTime);
    const vorbei = jetzt && ende < jetzt;

    return `
      <div class="event-chip event-chip--zeile ${vorbei ? "vorbei" : ""}" data-termin="${schluessel}"
           style="background:${resolveBackground(ev.calendars)}">
        <div class="event-title">${ev.summary || "(ohne Titel)"}</div>
        <div class="event-time">${hhmm(start)} – ${hhmm(ende)}</div>
        ${ev.location ? `<div class="event-location">${ev.location}</div>` : ""}
        ${CalendarView.avatarStack(ev.calendars)}
      </div>`;
  },

  // Aufgabenzeile wie in der To-Do-Ansicht: Tönung der zuständigen Person, abhakbar.
  aufgabenZeile(item, heute) {
    const meta = parseTaskMeta(item);
    const profil = CONFIG.taskProfiles.find((p) => meta.people.includes(p.id)) || UNASSIGNED;
    const faellig = item.due.slice(0, 10);
    const ueberfaellig = faellig < heute;

    return `
      <div class="task-row" style="--profile-color:${profil.color}">
        <button class="check" data-toggle="${item.uid}" aria-label="abhaken"></button>
        ${meta.emoji ? `<span class="task-emoji">${meta.emoji}</span>` : ""}
        <span class="task-title">${item.summary}</span>
        ${
          ueberfaellig
            ? `<span class="task-due ueberfaellig">${new Date(`${faellig}T00:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>`
            : ""
        }
      </div>`;
  },

  // Kita-Karten je Kind. Bis zur Umschaltstunde zählt heute, danach ist die Abholung
  // durch und nur noch morgen relevant.
  //
  // Am Wochenende gibt es keine Kita - die Karte verschwand deshalb früher ganz. Das war
  // unpraktisch: Freitagabend und über das Wochenende gab es keinen Weg, den Montag zu
  // klären, obwohl genau dann Zeit dafür ist. Jetzt rückt die Karte auf den nächsten
  // Werktag vor und bringt dessen Wochenleiste mit.
  mountKita(today, tomorrow) {
    const slot = document.getElementById("kita-slot");
    if (!slot) return;

    const switchHour = CONFIG.kita?.switchToTomorrowHour ?? 15;
    const relevant = new Date().getHours() < switchHour ? today : tomorrow;
    const zielTag = nextWeekday(relevant);

    (CONFIG.kita?.children || []).forEach((child) => {
      const host = document.createElement("div");
      slot.appendChild(host);
      KitaCard.render(host, child, zielTag);
    });
  },

  mealsSection({ meals, gekocht }) {
    // Nichts geliefert: Abschnitt ganz weglassen. Alles gekocht: Abschnitt zeigen, aber
    // sagen warum er leer ist - sonst wirkt es, als wäre etwas kaputt.
    if (!meals.length && !gekocht) return "";

    if (!meals.length) {
      return `
        <section class="meals-card">
          <h3 class="today-card-title">Mögliches Essen heute</h3>
          <p class="empty">Alle ${gekocht} Gerichte der Box sind abgehakt.
            Wieder aufmachen geht unter HelloFresh.</p>
        </section>`;
    }

    const chosen = this._chosenMeal;
    const cards = meals
      .map(
        (m) => `
        <button class="meal-option ${chosen === m.id ? "chosen" : ""}" data-meal="${m.id}">
          ${m.image ? `<img class="meal-thumb" src="${m.image}" alt="" />` : ""}
          <span class="meal-name">${m.name}</span>
          <span class="chip chip--klein meal-rezept" data-rezept="${m.id}">Rezept</span>
        </button>`
      )
      .join("");

    return `
      <section class="meals-card">
        <h3 class="today-card-title">Mögliches Essen heute</h3>
        <div class="meals-row">${cards}</div>
      </section>`;
  },

  bindMeals(meals) {
    // Der Chip liegt in der Kachel: ohne stopPropagation würde mit dem Rezept auch die
    // Essensauswahl umgeschaltet.
    document.querySelectorAll(".meal-rezept").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const gericht = meals.find((m) => m.id === chip.dataset.rezept);
        if (gericht) RezeptModal.open(gericht);
      });
    });

    document.querySelectorAll("[data-meal]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.meal;
        this._chosenMeal = this._chosenMeal === id ? null : id;

        document.querySelectorAll("[data-meal]").forEach((b) => {
          b.classList.toggle("chosen", b.dataset.meal === this._chosenMeal);
        });

        const meal = meals.find((m) => m.id === id);
        try {
          const key = `meal:${isoDate(new Date())}`;
          if (this._chosenMeal) {
            await DayStore.write(CONFIG.appState.entity, key, { id, name: meal?.name });
          } else {
            await DayStore.remove(CONFIG.appState.entity, key);
          }
        } catch (err) {
          console.error("Essensauswahl nicht gespeichert:", err);
        }
      });
    });
  },

  async loadChosenMeal() {
    try {
      const saved = await DayStore.read(CONFIG.appState.entity, `meal:${isoDate(new Date())}`);
      this._chosenMeal = saved?.id || null;
    } catch {
      this._chosenMeal = null;
    }
  },

  // Ein Baustein für beide Hinweise: oben für heute, im Abendblock für morgen.
  //
  // Bewusst "die Kinder" statt der Namen aus der Kita-Konfiguration: Der Hinweis gilt für
  // alle, die mitgehen, nicht nur für das Kita-Kind - und er bleibt richtig, ohne dass
  // jemand die Liste pflegt.
  hinweisZeile(forecast, wann) {
    const hint = this.clothingHint(forecast);
    if (!hint) return "";

    const label = wann === "heute" ? "Für die Kinder heute" : "Für die Kinder einpacken";

    return `<div class="evening-hint ${wann === "heute" ? "tages-hinweis" : ""}">
        <strong>${label}:</strong> ${hint}
      </div>`;
  },

  // "70 % Regen, 1,2 mm" sagt mehr als "Regen, 1,2 mm" - die Menge allein verrät nicht,
  // ob sie überhaupt zu erwarten ist. Die Menge bleibt daneben stehen, weil sie den
  // Unterschied zwischen Nieseln und Guss macht.
  regenText(forecast) {
    // Dezimalkomma wie im Wetter-Dialog - toFixed liefert einen Punkt.
    const menge =
      forecast.rain >= 0.1
        ? `${forecast.rain.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm`
        : null;

    if (forecast.probability == null) {
      return menge ? `Regen, ${menge}` : "trocken";
    }
    if (forecast.probability < 20 && !menge) return "trocken";

    const prozent = `${Math.round(forecast.probability)} % Regen`;
    return menge ? `${prozent}, ${menge}` : prozent;
  },

  eveningBlock(events, tomorrow, forecast) {
    const summary = DaySummary.build(events, tomorrow);

    return `
      <section class="evening-block">
        <h3 class="evening-title">Morgen</h3>
        ${
          forecast
            ? `<div class="evening-weather">
                 <span class="evening-temp">${Math.round(forecast.min)}° – ${Math.round(forecast.max)}°</span>
                 <span class="evening-cond">${this.regenText(forecast)}</span>
               </div>`
            : ""
        }
        ${this.hinweisZeile(forecast, "morgen")}
        ${summary ? `<p class="today-summary">${summary}</p>` : `<p class="today-summary muted">Morgen steht nichts im Kalender.</p>`}
      </section>`;
  },
};
