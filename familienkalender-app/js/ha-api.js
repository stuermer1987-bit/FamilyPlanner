// Dünner Wrapper um die Home Assistant REST-API.

const HaApi = {
  async callService(domain, service, data) {
    const url = `${CONFIG.haUrl}/api/services/${domain}/${service}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Service ${domain}.${service} fehlgeschlagen: ${res.status} ${text}`);
    }
  },

  // Manche HA-Services liefern Nutzdaten zurück (z.B. hellofresh.get_weeks).
  // Die kommen nur mit ?return_response und landen unter service_response.
  async callServiceWithResponse(domain, service, data = {}) {
    const url = `${CONFIG.haUrl}/api/services/${domain}/${service}?return_response`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Service ${domain}.${service} fehlgeschlagen: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json.service_response ?? json;
  },

  async getState(entityId) {
    const res = await fetch(`${CONFIG.haUrl}/api/states/${entityId}`, {
      headers: { Authorization: `Bearer ${CONFIG.haToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  },

  async addTodoItem(entityId, summary, { dueDate, description } = {}) {
    const data = { entity_id: entityId, item: summary };
    if (dueDate) data.due_date = dueDate;
    if (description) data.description = description;
    return this.callService("todo", "add_item", data);
  },

  async toggleTodoItem(entityId, item) {
    const newStatus = item.status === "completed" ? "needs_action" : "completed";
    return this.callService("todo", "update_item", {
      entity_id: entityId,
      item: item.uid,
      status: newStatus,
    });
  },

  async removeTodoItem(entityId, uid) {
    return this.callService("todo", "remove_item", { entity_id: entityId, item: [uid] });
  },

  async getCalendarEvents(entityId, start, end) {
    const url = `${CONFIG.haUrl}/api/calendars/${entityId}?start=${encodeURIComponent(
      start.toISOString()
    )}&end=${encodeURIComponent(end.toISOString())}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${CONFIG.haToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HA API Fehler (${entityId}): ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async getAllEvents(start, end) {
    // Platzhalter-Profile haben in HA keinen Kalender - sie stehen nur in der
    // Personenleiste. Ein Abruf liefe in einen Fehler und würde die Konsole zumüllen.
    const kalender = CONFIG.calendars.filter((cal) => !cal.platzhalter);

    const results = await Promise.allSettled(
      kalender.map((cal) => this.getCalendarEvents(cal.entity, start, end))
    );

    const events = [];
    results.forEach((result, i) => {
      const cal = kalender[i];
      if (result.status === "fulfilled") {
        result.value.forEach((ev) => events.push({ ...ev, calendar: cal }));
      } else {
        console.error(`Konnte Events für ${cal.entity} nicht laden:`, result.reason);
      }
    });
    return events;
  },

  async createEvent({ entityId, summary, description, location, isAllDay, start, end }) {
    const url = `${CONFIG.haUrl}/api/services/calendar/create_event`;

    const body = {
      entity_id: entityId,
      summary,
    };
    if (description) body.description = description;
    if (location) body.location = location;

    if (isAllDay) {
      body.start_date = start;
      body.end_date = end;
    } else {
      body.start_date_time = start;
      body.end_date_time = end;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Termin konnte nicht erstellt werden: ${res.status} ${text}`);
    }
  },
};
