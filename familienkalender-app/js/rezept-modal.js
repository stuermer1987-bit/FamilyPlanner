// Rezeptkarte eines HelloFresh-Gerichts als PDF im Modal.
//
// Die Integration liefert kein Rezept - "ingredients" ist leer, Zubereitungsschritte und
// Zeiten fehlen (am 04.08.2026 erneut gegen Woche 2026-W32 geprüft). Vorhanden ist nur die
// recipe_id, und aus der lässt sich die öffentliche Rezeptkarte bauen:
//
//   https://www.hellofresh.de/recipecards/card/<recipe_id>-de-DE.pdf
//
// Sie kommt ohne Anmeldung, trägt aber X-Frame-Options: SAMEORIGIN - direkt eingebettet
// bliebe das <iframe> leer. Deshalb läuft der Aufruf über unseren eigenen nginx
// (/rezeptkarte/…, siehe nginx.conf), der den Kopf entfernt.
//
// Karten sind 0,5 bis 5 MB groß. Der Proxy erlaubt deshalb eine Woche Zwischenspeicher,
// abweichend vom no-store, das sonst für die ganze App gilt.

const RezeptModal = {
  // Erst fragen, dann einbetten: Für noch nicht gelieferte Wochen gibt es die Karte nicht,
  // der Server antwortet mit 403. Im <iframe> stünde dann eine fremde XML-Fehlermeldung.
  // Die Ansicht bietet solche Gerichte gar nicht erst zum Anklicken an - dies hier ist die
  // Rückfallebene für Einzelfälle.
  async open(gericht) {
    const url = this.url(gericht.id);

    Modal.open(this.rahmen(gericht, `<div class="empty empty--laedt">Lade Rezeptkarte…</div>`), {
      klasse: "modal-box--breit",
    });
    this.bindClose();

    let vorhanden = false;
    try {
      const res = await fetch(url, { method: "HEAD" });
      vorhanden = res.ok && (res.headers.get("content-type") || "").includes("pdf");
    } catch (err) {
      console.warn("Rezeptkarte nicht erreichbar:", err);
    }

    const inhalt = document.getElementById("rezept-inhalt");
    if (!inhalt) return; // Dialog wurde inzwischen geschlossen

    inhalt.innerHTML = vorhanden
      ? `<iframe class="rezept-pdf" src="${url}" title="Rezeptkarte ${gericht.name || ""}"></iframe>`
      : `<div class="empty empty--gross">
           <div class="empty-icon">📄</div>
           <div class="empty-text">Für dieses Gericht gibt es noch keine Rezeptkarte.</div>
           <div>HelloFresh stellt sie erst zur Lieferung bereit.</div>
         </div>`;
  },

  // ?v= ist kein Schmuck: Der Proxy erlaubt eine Woche Zwischenspeicher, und die Antwort
  // wird nicht nur nach Inhalt beurteilt, sondern auch nach ihren Kopfzeilen. Als
  // Content-Disposition von "attachment" auf "inline" wechselte, lieferten Browser weiter
  // die alte, herunterladende Fassung aus. Bei jeder Änderung an der Route in nginx.conf
  // deshalb hochzählen.
  VERSION: 2,

  url(rezeptId) {
    return `/rezeptkarte/${rezeptId}-de-DE.pdf?v=${this.VERSION}`;
  },

  // Auf dem iPad zeigt Safari ein PDF im <iframe> nur eingeschränkt an. Der Knopf
  // "Vollbild" öffnet dieselbe Adresse als eigene Seite - dort greift der native
  // PDF-Betrachter mit Blättern und Zoom.
  rahmen(gericht, inhalt) {
    return `
      <div class="modal-header">
        <h2>${gericht.name || "Rezept"}</h2>
        <div class="rezept-kopf-aktionen">
          <a class="chip chip--klein" href="${this.url(gericht.id)}" target="_blank"
             rel="noopener">Vollbild</a>
          <button class="modal-close" id="modal-close-btn">&times;</button>
        </div>
      </div>
      <div class="modal-body rezept-body" id="rezept-inhalt">${inhalt}</div>`;
  },

  bindClose() {
    document.getElementById("modal-close-btn").addEventListener("click", () => Modal.close());
  },
};
