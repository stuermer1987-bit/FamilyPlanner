// Dünner Wrapper um die Home Assistant WebSocket-API.
// Nötig, weil das Auslesen einzelner To-Do-Items (todo/item/list) nur per WebSocket geht,
// nicht per REST.

const HaWs = {
  socket: null,
  msgId: 1,
  pending: new Map(),
  ready: null,

  connect() {
    if (this.ready) return this.ready;

    this.ready = new Promise((resolve, reject) => {
      const wsUrl = CONFIG.haUrl.replace(/^http/, "ws") + "/api/websocket";
      this.socket = new WebSocket(wsUrl);

      this.socket.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "auth_required") {
          this.socket.send(JSON.stringify({ type: "auth", access_token: CONFIG.haToken }));
        } else if (msg.type === "auth_ok") {
          resolve();
        } else if (msg.type === "auth_invalid") {
          reject(new Error("HA WebSocket: Token ungültig"));
        } else if (msg.type === "result" && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.success) res(msg.result);
          else rej(new Error(msg.error?.message || "WebSocket-Fehler"));
        }
      });

      this.socket.addEventListener("error", (err) => reject(err));
      this.socket.addEventListener("close", () => {
        this.ready = null;
      });
    });

    return this.ready;
  },

  async send(payload) {
    await this.connect();
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, ...payload }));
    });
  },

  async getTodoItems(entityId) {
    const result = await this.send({ type: "todo/item/list", entity_id: entityId });
    return result.items || [];
  },

  // --- bring_shopping ---------------------------------------------------------
  // Zusatzintegration (custom_components/bring_shopping). Liefert im Gegensatz zur
  // Kern-Integration Kategorie und Bild je Artikel. Fehlt sie, antwortet HA mit
  // "unknown_command" - ShoppingView faellt dann auf die todo.*-Entities zurueck.

  async bringGetLists() {
    const result = await this.send({ type: "bring_shopping/get_lists" });
    return result.lists || [];
  },

  async bringGetItems(listUuid) {
    return this.send({ type: "bring_shopping/get_items", list_uuid: listUuid });
  },

  async bringAddItem(listUuid, itemName, specification = "") {
    return this.send({
      type: "bring_shopping/add_item",
      list_uuid: listUuid,
      item_name: itemName,
      specification,
    });
  },

  async bringCompleteItem(listUuid, originalName) {
    return this.send({
      type: "bring_shopping/complete_item",
      list_uuid: listUuid,
      original_name: originalName,
    });
  },

  async bringUpdateItem(listUuid, originalName, specification) {
    return this.send({
      type: "bring_shopping/update_item",
      list_uuid: listUuid,
      original_name: originalName,
      specification,
    });
  },
};
