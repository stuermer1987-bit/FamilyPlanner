// Bilder in Home Assistants image_upload ablegen.
//
// Nachgemessen am 03.08.2026 gegen HA 2026.7.3:
//   POST /api/image/upload            multipart, Feld "file"  -> { id, ... }
//   GET  /api/image/serve/<id>/<maß>  OHNE Token erreichbar
//   WS   image/list / image/delete    Verwalten
//
// Weil die Auslieferung keinen Authorization-Header verlangt, reicht ein normales
// <img src>. Die ältere Backlog-Notiz, das ginge nicht, war falsch.

const BildUpload = {
  MAX_KANTE: 1600,
  QUALITAET: 0.8,

  // Ein Handyfoto sind 3-5 MB. Ungefiltert hochgeladen läuft config/image/ voll und das
  // Wandtablet lädt zäh - deshalb vorher im Browser herunterrechnen.
  async verkleinern(datei) {
    if (!datei.type.startsWith("image/")) throw new Error("Das ist kein Bild.");

    const bild = await new Promise((res, rej) => {
      const url = URL.createObjectURL(datei);
      const el = new Image();
      el.onload = () => {
        URL.revokeObjectURL(url);
        res(el);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        rej(new Error("Bild konnte nicht gelesen werden."));
      };
      el.src = url;
    });

    const faktor = Math.min(1, this.MAX_KANTE / Math.max(bild.width, bild.height));
    if (faktor === 1 && datei.size < 600 * 1024) return datei; // klein genug, so lassen

    const leinwand = document.createElement("canvas");
    leinwand.width = Math.round(bild.width * faktor);
    leinwand.height = Math.round(bild.height * faktor);
    const ctx = leinwand.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bild, 0, 0, leinwand.width, leinwand.height);

    const blob = await new Promise((res) =>
      leinwand.toBlob(res, "image/jpeg", this.QUALITAET)
    );
    if (!blob) return datei;

    // Wenn das JPEG größer wäre als das Original (kommt bei PNG-Screenshots vor),
    // lieber das Original nehmen.
    return blob.size < datei.size ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : datei;
  },

  async hochladen(datei) {
    const klein = await this.verkleinern(datei);
    const form = new FormData();
    form.append("file", klein, klein.name || "foto.jpg");

    const res = await fetch(`${CONFIG.haUrl}/api/image/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CONFIG.haToken}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Bild konnte nicht hochgeladen werden (${res.status}).`);
    }
    return res.json(); // { id, filesize, content_type, name, uploaded_at }
  },

  url(id, groesse = "512x512") {
    return `${CONFIG.haUrl}/api/image/serve/${id}/${groesse}`;
  },

  async loeschen(id) {
    return HaWs.send({ type: "image/delete", image_id: id });
  },
};
