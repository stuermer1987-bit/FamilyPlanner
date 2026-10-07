// Schlüssel-Wert-Speicher auf einer "Local To-do"-Liste in Home Assistant.
//
// Warum eine To-do-Liste: Die App hat kein eigenes Backend, und HA bietet sonst nichts
// Schreibbares mit ausreichender Länge - input_text ist auf 255 Zeichen begrenzt. Ein
// To-do-Eintrag hat einen freien Titel (= Schlüssel) und eine beliebig lange Beschreibung
// (= JSON-Wert), überlebt Neustarts und ist über die HA-App einsehbar.
//
// Wichtig: eine LOKALE Liste verwenden. Über CalDAV greift der Schreibbug in HA
// (todo.update_item bricht mit HTTP 500), siehe BACKLOG.md.

const DayStore = {
  _cache: new Map(), // entity -> {items, ts}
  CACHE_MS: 5000,

  async items(entity, { fresh = false } = {}) {
    const cached = this._cache.get(entity);
    if (!fresh && cached && Date.now() - cached.ts < this.CACHE_MS) return cached.items;

    const items = await HaWs.getTodoItems(entity);
    this._cache.set(entity, { items, ts: Date.now() });
    return items;
  },

  invalidate(entity) {
    this._cache.delete(entity);
  },

  async read(entity, key) {
    const item = (await this.items(entity)).find((i) => i.summary === key);
    if (!item?.description) return null;
    try {
      return JSON.parse(item.description);
    } catch {
      console.warn(`Ungültiges JSON in ${entity} / ${key}`);
      return null;
    }
  },

  // Alle Einträge mit einem Präfix, als {key: wert}. Für "welche Namen wurden schon benutzt".
  async readAll(entity, prefix = "") {
    const result = {};
    for (const item of await this.items(entity)) {
      if (prefix && !item.summary.startsWith(prefix)) continue;
      if (!item.description) continue;
      try {
        result[item.summary] = JSON.parse(item.description);
      } catch {
        /* defekte Einträge überspringen */
      }
    }
    return result;
  },

  async write(entity, key, value) {
    const json = JSON.stringify(value);
    const existing = (await this.items(entity, { fresh: true })).find((i) => i.summary === key);

    if (existing) {
      await HaApi.callService("todo", "update_item", {
        entity_id: entity,
        item: existing.uid,
        description: json,
      });
    } else {
      await HaApi.addTodoItem(entity, key, { description: json });
    }
    this.invalidate(entity);
  },

  async remove(entity, key) {
    const existing = (await this.items(entity, { fresh: true })).find((i) => i.summary === key);
    if (!existing) return;
    await HaApi.removeTodoItem(entity, existing.uid);
    this.invalidate(entity);
  },
};

// Hilfen, die mehrere Ansichten brauchen
function isoDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isWeekday(date) {
  const day = new Date(date).getDay();
  return day >= 1 && day <= 5;
}

// Nächster Werktag ab dem übergebenen Tag - der Tag selbst, wenn er schon einer ist.
// Am Wochenende landet man damit auf Montag.
function nextWeekday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  while (!isWeekday(d)) d.setDate(d.getDate() + 1);
  return d;
}
