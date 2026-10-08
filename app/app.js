// Replica del foglio "Preventivatore Bando".
// Mapping celle: K2 costoPratica, K3 studioFattibilita, J9 beneficio, G8:G13 preventivi.

const N_PREVENTIVI_DEFAULT = 1;
const BENEFICIO_MIN = 4000;   // sotto questa soglia (stretto) il bando non è fattibile
const BENEFICIO_MAX = 25000;  // massimale ammesso: oltre, il calcolo usa 25.000
const $ = (id) => document.getElementById(id);
const num = (v) => parseFloat(v) || 0;
// Importi: "€ 1.266,80" (migliaia con ".", decimali con ",", sempre 2 decimali)
const eur = (v) => {
  const [intero, dec] = Math.abs(v).toFixed(2).split(".");
  return `${v < 0 && +v.toFixed(2) !== 0 ? "-" : ""}€ ${intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
};
// Legge un importo scritto all'italiana ("€ 1.266,80", "1266,8") o con il punto decimale ("1266.8")
const parseEur = (t) => {
  let x = String(t).replace(/[€\s]/g, "");
  x = x.includes(",") ? x.replace(/\./g, "").replace(",", ".") : x;
  return parseFloat(x) || 0;
};
const pct = (v) => (v * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " %";

function calcola({ costoPratica, studioFattibilita, beneficio, preventivi }) {
  const consulenza = costoPratica - studioFattibilita;                     // K4 / G7
  const imponibile = consulenza + preventivi.reduce((a, p) => a + p.importo, 0); // G4
  const spesa = -imponibile;                                               // K8
  const benefLordo = -spesa * beneficio;                                   // K9 (prima del massimale)
  const massimale = benefLordo > BENEFICIO_MAX;
  const benefEuro = massimale ? BENEFICIO_MAX : benefLordo;
  const residuo = BENEFICIO_MAX - benefEuro;                               // margine fino al massimale
  const spesaResidua = beneficio ? residuo / beneficio : 0;                // spesa ancora ammissibile
  const subtotale = spesa + benefEuro;                                     // L9
  const studio = -studioFattibilita;                                       // K10
  const totale = spesa + benefEuro + studio;                               // K12
  const incidenza = imponibile ? -totale / imponibile : 0;                 // K14
  const scontoBando = imponibile ? benefEuro / imponibile : 0;             // b / a: solo impatto del beneficio
  return { scontoBando, consulenza, imponibile, spesa, benefLordo, massimale, benefEuro, residuo, spesaResidua, subtotale, studio, totale, incidenza, sconto: imponibile ? (benefEuro - studioFattibilita) / imponibile : 0 }; // d / a, con d = b - Pratica (riga "Pratica" del riepilogo)
}

function leggi() {
  return {
    cliente: $("cliente").value.trim(),
    bando: $("bando").value.trim(),
    recuperaIva: $("recuperaIva").value === "si",
    dimensione: $("beneficio").selectedOptions[0].text,
    costoPratica: parseEur($("costoPratica").value),
    studioFattibilita: parseEur($("studioFattibilita").value),
    beneficio: num($("beneficio").value) / 100,
    preventivi: [...document.querySelectorAll(".prev")].map((r, i) => ({
      numero: i + 1,
      descrizione: r.querySelector(".descrizione").value.trim(),
      fornitore: r.querySelector(".fornitore").value.trim(),
      importo: parseEur(r.querySelector(".importo").value),
    })),
  };
}

// Una riga è "compilata" se ha almeno un campo (descrizione, fornitore o importo) valorizzato
const rigaCompilata = (p) => p.descrizione !== "" || p.fornitore !== "" || p.importo !== 0;
const preventiviCompilati = (d) => d.preventivi.filter(rigaCompilata);
const erroreStudio = (d) => d.studioFattibilita > d.costoPratica;
// Segnalato solo con almeno un preventivo compilato (a form vuoto il beneficio è 0 per definizione)
const erroreBeneficio = (d, r) => preventiviCompilati(d).length > 0 && r.benefLordo < BENEFICIO_MIN;
const erroreBloccante = (d) => erroreStudio(d) || erroreBeneficio(d, calcola(d));

function aggiorna() {
  const d = leggi();
  const r = calcola(d);
  const errStudio = erroreStudio(d);
  const errBenef = erroreBeneficio(d, r);
  const errore = errStudio || errBenef;
  $("errore").hidden = !errStudio;
  $("errore").textContent = `Errore: l'importo della pratica non può superare ${eur(d.costoPratica).replace("€ ", "")} €.`;
  $("erroreBeneficio").hidden = !errBenef;
  $("erroreBeneficio").textContent = `Bando non fattibile: il beneficio (${eur(r.benefLordo)}) è inferiore a ${eur(BENEFICIO_MIN)}.`;
  $("avvisoIva").hidden = d.recuperaIva;
  $("studioFattibilita").classList.toggle("invalido", errStudio);
  const senzaPreventivi = preventiviCompilati(d).length === 0;
  document.querySelectorAll(".btn-genera").forEach((b) => {
    b.disabled = errore || senzaPreventivi;
    b.title = senzaPreventivi ? "Compila almeno un preventivo per generare il documento" : "";
  });
  document.querySelector(".hero").classList.toggle("bloccato", errore);
  $("consulenza").textContent = eur(r.consulenza);
  $("rigaConsulenza").hidden = r.consulenza === 0;
  $("imponibile").textContent = eur(r.imponibile);
  $("benefEuro").textContent = eur(r.benefEuro);
  $("benefLabel").textContent = r.massimale ? `Beneficio (massimale ${eur(BENEFICIO_MAX)})` : "Beneficio";
  $("residuo").textContent = eur(r.residuo);
  $("spesaResidua").textContent = eur(r.spesaResidua);
  $("subtotale").textContent = eur(r.subtotale);
  $("studio").textContent = eur(r.studio);
  $("totale").textContent = eur(r.totale);
  $("incidenza").textContent = pct(r.incidenza);
  $("scontoBando").textContent = pct(r.scontoBando);
  $("sconto").textContent = pct(r.sconto);
}

// --- Preventivi dinamici ---
function rinumera() {
  const nums = document.querySelectorAll(".prev .num");
  nums.forEach((n, i) => (n.textContent = i + 1));
  $("numConsulenza").textContent = nums.length + 1;
}

function aggiungiPreventivo(dati = "") {
  const { importo = "", descrizione = "", fornitore = "" } = typeof dati === "object" ? dati : { importo: dati };
  const row = document.createElement("div");
  row.className = "prev";
  row.innerHTML = `<span class="num"></span>
    <input class="descrizione" type="text" placeholder="Descrizione">
    <input class="fornitore" type="text" placeholder="Fornitore">
    <input class="importo money" type="text" inputmode="decimal" placeholder="€ 0,00">
    <button type="button" class="rimuovi" title="Rimuovi" aria-label="Rimuovi preventivo">×</button>`;
  row.querySelector(".rimuovi").addEventListener("click", () => {
    row.remove();
    rinumera();
    aggiorna();
  });
  if (importo !== "") row.querySelector(".importo").value = eur(importo);
  row.querySelector(".descrizione").value = descrizione;
  row.querySelector(".fornitore").value = fornitore;
  $("preventivi").appendChild(row);
  rinumera();
}

// Dati di prova (10 preventivi): si attivano dall'interruttore nelle Impostazioni (impostazioni.html)
const DATI_PROVA = (() => {
  try { return JSON.parse(localStorage.getItem("preventivatore.impostazioni") || "{}").datiSimulati === true; } catch (e) { return false; }
})();
if (DATI_PROVA) {
  $("cliente").value = "Azienda Esempio S.r.l.";
  $("bando").value = "Bando Digitalizzazione PMI";
  [1266.8, 6240, 3600, 2150, 980.5, 4720, 1830.9, 7500, 560, 3290.45].forEach((importo, i) =>
    aggiungiPreventivo({ importo, descrizione: `Voce di spesa ${i + 1}`, fornitore: `Fornitore ${i + 1} S.r.l.` }));
}
// Fine dati di prova

while (document.querySelectorAll(".prev").length < N_PREVENTIVI_DEFAULT) aggiungiPreventivo();

$("aggiungi").addEventListener("click", () => {
  aggiungiPreventivo();
  aggiorna();
});

// --- Note (editor WYSIWYG nel modale) ---
let noteHtml = "";
const noteVuote = (html) => {
  const t = document.createElement("div");
  t.innerHTML = html;
  return t.textContent.trim() === "";
};

function aggiornaPulsanteNote() {
  $("apriNote").textContent = noteHtml ? "✎ Modifica note" : "+ Aggiungi note";
}

// "Niente note" e "Note vuote" si escludono a vicenda
[["noteNiente", "noteVuote"], ["noteVuote", "noteNiente"]].forEach(([a, b]) =>
  $(a).addEventListener("change", () => { if ($(a).checked) $(b).checked = false; }));

$("apriNote").addEventListener("click", () => {
  $("editorNote").innerHTML = noteHtml;
  $("modaleNote").showModal();
  $("editorNote").focus();
});
$("annullaNote").addEventListener("click", () => $("modaleNote").close());
$("svuotaNote").addEventListener("click", () => {
  noteHtml = "";
  aggiornaPulsanteNote();
  $("modaleNote").close();
});
$("salvaNote").addEventListener("click", () => {
  const html = $("editorNote").innerHTML;
  noteHtml = noteVuote(html) ? "" : html;
  aggiornaPulsanteNote();
  $("modaleNote").close();
});
document.querySelectorAll(".toolbar [data-cmd]").forEach((b) => {
  b.addEventListener("mousedown", (e) => e.preventDefault()); // non toglie il focus all'editor
  b.addEventListener("click", () => document.execCommand(b.dataset.cmd, false, null));
});
// Incolla solo testo semplice, senza stili esterni
$("editorNote").addEventListener("paste", (e) => {
  e.preventDefault();
  document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
});

// Converte l'HTML delle note in blocchi di testo con stili inline (grassetto/corsivo) ed elenchi
function noteInBlocchi(html) {
  const radice = document.createElement("div");
  radice.innerHTML = html;
  const blocchi = [];
  let cur = null;
  const nuovo = (prefisso = "", rientro = 0) => (cur = blocchi[blocchi.push({ runs: [], prefisso, rientro }) - 1]);
  const visita = (n, stile, lista, rientro) => {
    if (n.nodeType === 3) {
      const t = n.textContent.replace(/\s+/g, " ");
      if (!t.trim() && !cur) return;
      if (!cur) nuovo("", rientro);
      cur.runs.push({ t, ...stile });
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === "BR") { nuovo("", rientro); return; }
    const st = { ...stile };
    if (tag === "B" || tag === "STRONG") st.b = true;
    if (tag === "I" || tag === "EM") st.i = true;
    if (tag === "UL" || tag === "OL") {
      cur = null;
      const l = { tipo: tag, n: 0 };
      n.childNodes.forEach((c) => visita(c, st, l, rientro + 5));
      cur = null;
      return;
    }
    if (tag === "LI") {
      cur = null;
      lista = lista || { tipo: "UL", n: 0 };
      lista.n++;
      nuovo(lista.tipo === "OL" ? `${lista.n}.` : "•", rientro);
      n.childNodes.forEach((c) => visita(c, st, lista, rientro));
      cur = null;
      return;
    }
    const blocco = tag === "P" || tag === "DIV";
    if (blocco) cur = null;
    n.childNodes.forEach((c) => visita(c, st, lista, rientro));
    if (blocco) cur = null;
  };
  radice.childNodes.forEach((c) => visita(c, {}, null, 0));
  return blocchi;
}

// --- Esportazione Word (.docx generato da zero, senza template) ---
const ARANCIONE = "CF551B";
const GRIGIO = "4F4F57";
const ROSSO = "C62828";   // cifra dell'imponibile nel riepilogo
const VERDE = "2E7D32";   // cifra del beneficio nel riepilogo

// Dati comuni a Word e PDF
function costruisciReport() {
  const d = leggi();
  const preventivi = preventiviCompilati(d);
  if (erroreBloccante(d) || preventivi.length === 0) return null;
  const r = calcola(d);
  return {
    d, r, preventivi,
    data: new Date().toLocaleDateString("it-IT"),
    anagrafica: [
      ["Cliente", d.cliente || "-"],
      ["Bando", d.bando || "-"],
      ["Dimensione azienda", d.dimensione],
      ["Recupera IVA", d.recuperaIva ? "Sì" : "No"],
    ],
    righePreventivi: [
      ...preventivi.map((p, i) => [String(i + 1), p.descrizione, p.fornitore, eur(p.importo)]),
      ...(r.consulenza !== 0 ? [[String(preventivi.length + 1), $("descConsulenza").value.trim() || "Consulenza", $("fornConsulenza").value.trim(), eur(r.consulenza)]] : []),
    ],
    riepilogo: [
      Object.assign(["Imponibile", eur(r.imponibile)], { colore: ROSSO }),
      Object.assign([`Beneficio (${pct(d.beneficio)}${r.massimale ? `, massimale ${eur(BENEFICIO_MAX)}` : ""})`, eur(r.benefEuro)], { colore: VERDE }),
      [`Residuo al massimale (${eur(BENEFICIO_MAX)} − beneficio)`, eur(r.residuo)],
      [`Spesa ancora ammissibile (residuo ÷ ${pct(d.beneficio)})`, eur(r.spesaResidua)],
      ["Pratica", eur(d.studioFattibilita)],
    ],
    includiScontoPratica: $("includiScontoPratica").checked,
    scontoBando: pct(r.scontoBando),
    sconto: pct(r.sconto),
    nomeFile: `Simulazione_${(d.cliente || "bando").replace(/[^\w-]+/g, "_")}`,
  };
}

function scarica(blob, nome) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

function generaWord() {
  if (typeof docx === "undefined" || typeof ASSETS === "undefined") {
    alert("Libreria docx non caricata.");
    return;
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType,
    BorderStyle, ImageRun, Header, Footer, PageNumber, PageBreak, HeightRule, TableLayoutType } = docx;
  const rep = costruisciReport();
  if (!rep) return;

  // Stessa compressione del PDF, così il layout sta in una pagina anche in Word
  let k = 1;
  if (typeof jspdf !== "undefined" && rep.righePreventivi.length <= 11) {
    const s = costruisciPdf(rep).scala;
    if (s < 1) k = Math.max(0.5, s - 0.05); // piccolo margine: Word va a capo in modo un po' diverso
  }

  const mm = (v) => Math.round(v * 56.7);               // mm → twip
  const FONT = "Montserrat";
  const larghezza = mm(210 - 40);                       // area utile tra i margini
  const png = (dataUrl) => Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const LOGO_W = 46, FOOT_W = 100;
  const px = (w) => Math.round(w * 96 / 25.4);          // mm → px per le immagini
  const BORDO_CHIARO = { style: BorderStyle.SINGLE, size: 2, color: "E6E4DC" };
  const BORDO_ARANCIONE = { style: BorderStyle.SINGLE, size: 6, color: ARANCIONE };
  const NESSUN_BORDO = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

  const testo = (t, o = {}) => new TextRun({ text: t, font: FONT, color: GRIGIO, ...o });
  const par = (t, o = {}, p = {}) => new Paragraph({ children: [testo(t, o)], ...p });
  const cella = (t, larg, { bold = false, right = false, head = false, colore = GRIGIO } = {}) =>
    new TableCell({
      width: { size: larg, type: WidthType.DXA },
      shading: head ? { type: ShadingType.CLEAR, fill: "FEF1E7", color: "auto" } : undefined,
      margins: { top: mm(2.5 * k), bottom: mm(2.5 * k), left: mm(2.5), right: mm(2.5) },
      borders: { top: BORDO_CHIARO, bottom: BORDO_CHIARO, left: BORDO_CHIARO, right: BORDO_CHIARO },
      children: [new Paragraph({
        alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [testo(t, { bold: bold || head, size: Math.round(9 * Math.max(k, 0.85) * 2), color: head ? ARANCIONE : colore })],
      })],
    });
  const tabella = (intestazione, righe, destra, pesi) => {
    const tot = pesi.reduce((a, b) => a + b, 0);
    const col = pesi.map((p) => Math.round(larghezza * p / tot));
    return new Table({
      width: { size: larghezza, type: WidthType.DXA },
      columnWidths: col,
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: intestazione.map((h, i) => cella(h, col[i], { head: true, right: destra.includes(i) })) }),
        ...righe.map((riga) => new TableRow({ cantSplit: true, children: riga.map((c, i) => cella(c, col[i], { right: destra.includes(i), ...(i === 1 && riga.colore ? { colore: riga.colore, bold: true } : {}) })) })),
      ],
    });
  };
  const titolo = (t) => new Paragraph({ keepNext: true, spacing: { before: mm(5 * k), after: mm(2.5 * k) }, children: [testo(t, { bold: true, size: 26, color: ARANCIONE })] });

  // Riquadro "Sconto effettivo" con bordo arancione
  const boxSconto = new Table({
    width: { size: larghezza, type: WidthType.DXA },
    columnWidths: [larghezza],
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({
      cantSplit: true,
      height: { value: mm(20), rule: HeightRule.ATLEAST },
      children: [new TableCell({
        width: { size: larghezza, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: "F7F7F5", color: "auto" },
        margins: { top: mm(2), bottom: mm(2), left: mm(5), right: mm(5) },
        borders: { top: BORDO_ARANCIONE, bottom: BORDO_ARANCIONE, left: BORDO_ARANCIONE, right: BORDO_ARANCIONE },
        children: [
          par("Sconto sui beni", { bold: true, size: 18, color: ARANCIONE }),
          par(rep.scontoBando, { bold: true, size: 32 }, { spacing: { before: 40 } }),
          ...(rep.includiScontoPratica ? [
            par("Sconto effettivo con pratica inclusa", { bold: true, size: 18, color: ARANCIONE }, { spacing: { before: 120 } }),
            par(rep.sconto, { bold: true, size: 32 }, { spacing: { before: 40 } }),
          ] : []),
        ],
      })],
    })],
  });

  // Note: stessa logica del PDF, sempre in una pagina a parte
  const noteWord = () => {
    const modo = modalitaNote();
    if (modo === "niente" || (modo === "testo" && !noteHtml)) return [];
    const intro = [
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ spacing: { after: mm(3) }, children: [testo("Note", { bold: true, size: 26, color: ARANCIONE })] }),
    ];
    if (modo === "vuote") {
      return [...intro, new Table({
        width: { size: larghezza, type: WidthType.DXA },
        columnWidths: [larghezza],
        layout: TableLayoutType.FIXED,
        borders: {
          top: BORDO_ARANCIONE, bottom: BORDO_ARANCIONE, left: BORDO_ARANCIONE, right: BORDO_ARANCIONE,
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "C8C6BE" }, insideVertical: NESSUN_BORDO,
        },
        rows: Array.from({ length: 21 }, () => new TableRow({
          cantSplit: true,
          height: { value: mm(9), rule: HeightRule.EXACT },
          children: [new TableCell({ width: { size: larghezza, type: WidthType.DXA }, children: [new Paragraph("")] })],
        })),
      })];
    }
    return [...intro, ...noteInBlocchi(noteHtml).map((bl) => new Paragraph({
      spacing: { after: mm(1.5) },
      indent: { left: mm(bl.rientro + (bl.prefisso ? 5 : 0)), hanging: bl.prefisso ? mm(5) : 0 },
      children: [
        ...(bl.prefisso ? [testo(bl.prefisso + "\t", { size: 19, color: ARANCIONE })] : []),
        ...bl.runs.map((r) => testo(r.t, { size: 19, bold: !!r.b, italics: !!r.i })),
      ],
    }))];
  };

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: {
        page: {
          size: { width: mm(210), height: mm(297) },
          margin: { top: mm(44), bottom: mm(30), left: mm(20), right: mm(20), header: mm(8), footer: mm(6) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ type: "png", data: png(ASSETS.logo), transformation: { width: px(LOGO_W), height: px(LOGO_W * 600 / 1550) } })],
            }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [testo("1NNOVATEAM.IT", { size: 15, color: ARANCIONE, characterSpacing: 12 })] }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ type: "png", data: png(ASSETS.footer), transformation: { width: px(FOOT_W), height: px(FOOT_W * 34 / 645) } })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                testo("Pagina ", { size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GRIGIO }),
                testo(" di ", { size: 16 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GRIGIO }),
              ],
            }),
          ],
        }),
      },
      children: [
        par("Simulazione bando", { bold: true, size: 40, color: ARANCIONE }, { alignment: AlignmentType.CENTER }),
        par(`Data: ${rep.data}`, { italics: true, size: 18, color: "86868F" }, {
          alignment: AlignmentType.CENTER,
          spacing: { after: mm(2 * k) },
          border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: ARANCIONE, space: 6 } },
        }),

        titolo("Anagrafica cliente"),
        tabella(["Dato", "Valore"], rep.anagrafica, [], [1, 1]),

        titolo("Preventivi fornitori"),
        tabella(["N.", "Descrizione", "Fornitore", "Importo"], rep.righePreventivi, [3], [1, 6, 4, 2.5]),

        titolo("Riepilogo"),
        tabella(["Voce", "Valore"], rep.riepilogo, [1], [3, 1]),

        new Paragraph({ spacing: { before: mm(5 * k) }, children: [] }),
        boxSconto,
        ...noteWord(),
      ],
    }],
  });

  Packer.toBlob(doc).then((blob) => scarica(blob, `${rep.nomeFile}.docx`));
}

// Modalità note scelta dall'utente: "niente" | "vuote" | "testo" (note scritte, se presenti)
const modalitaNote = () => ($("noteNiente").checked ? "niente" : $("noteVuote").checked ? "vuote" : "testo");

// Costruisce il PDF; restituisce anche la scala di compressione usata per stare in una pagina
function costruisciPdf(rep) {
  let doc, y;
  const nuovoDoc = () => {
    doc = new jspdf.jsPDF({ unit: "mm", format: "a4" });
    // Font Montserrat incorporati
    [["Montserrat", "normal", "regular", "Regular"], ["Montserrat", "italic", "italic", "Italic"],
     ["Montserrat", "bold", "bold", "Bold"], ["MontserratSB", "normal", "semibold", "SemiBold"]].forEach(([fam, stile, key, nome]) => {
      doc.addFileToVFS(`Montserrat-${nome}.ttf`, ASSETS.fonts[key]);
      doc.addFont(`Montserrat-${nome}.ttf`, fam, stile);
    });
  };

  const W = 210, H = 297, M = 20;           // pagina e margini (mm)
  const TOP = 44, BOTTOM = 30;              // area del corpo
  const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4), 16)];
  const arancione = hex(ARANCIONE), grigio = hex(GRIGIO);
  const font = (fam, stile, size, colore) => doc.setFont(fam, stile).setFontSize(size).setTextColor(...colore);

  const nuovaPaginaSe = (spazio) => { if (y + spazio > H - BOTTOM) { doc.addPage(); y = TOP; } };

  // Disegna titolo, tabelle e riquadro sconto; k < 1 comprime font e spaziature
  const disegna = (k) => {
    nuovoDoc();
    y = TOP;

    // Titolo centrato con linea arancione, come nella guida
    font("Montserrat", "bold", 20, arancione);
    doc.text("Simulazione bando", W / 2, y, { align: "center" });
    y += 7 * k;
    font("Montserrat", "italic", 9, [134, 134, 143]);
    doc.text(`Data: ${rep.data}`, W / 2, y, { align: "center" });
    y += 4 * k;
    doc.setDrawColor(...arancione).setLineWidth(0.6).line(M, y, W - M, y);
    y += 4 * k;

    const tabella = (titolo, head, body, destra) => {
      nuovaPaginaSe(30 * k);
      font("MontserratSB", "normal", 13, arancione);
      doc.text(titolo, M, y + 8 * k);
      doc.autoTable({
        startY: y + 11 * k,
        margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
        head: [head],
        body,
        styles: { font: "Montserrat", fontSize: 9 * Math.max(k, 0.85), textColor: grigio, cellPadding: 2.5 * k, lineColor: [230, 228, 220], lineWidth: 0.1 },
        headStyles: { fillColor: hex("FEF1E7"), textColor: arancione, fontStyle: "bold" },
        columnStyles: Object.fromEntries(destra.map((i) => [i, { halign: "right" }])),
        didParseCell: (h) => {
          if (h.section === "head" && destra.includes(h.column.index)) h.cell.styles.halign = "right";
          if (h.section === "body" && h.column.index === 1 && h.row.raw && h.row.raw.colore) { h.cell.styles.textColor = hex(h.row.raw.colore); h.cell.styles.fontStyle = "bold"; }
        },
      });
      y = doc.lastAutoTable.finalY;
    };
    tabella("Anagrafica cliente", ["Dato", "Valore"], rep.anagrafica, []);
    tabella("Preventivi fornitori", ["N.", "Descrizione", "Fornitore", "Importo"], rep.righePreventivi, [3]);
    tabella("Riepilogo", ["Voce", "Valore"], rep.riepilogo, [1]);

    // Riquadro "Sconto effettivo" con bordo arancione, come il box "In breve"
    y += 10 * k;
    nuovaPaginaSe(24);
    doc.setFillColor(247, 247, 245).setDrawColor(...arancione).setLineWidth(0.7).rect(M, y, W - 2 * M, 20, "FD");
    const meta = (W - 2 * M) / 2;
    [["Sconto sui beni", rep.scontoBando, M + 5], ...(rep.includiScontoPratica ? [["Sconto effettivo con pratica inclusa", rep.sconto, M + meta + 5]] : [])].forEach(([et, val, x]) => {
      font("Montserrat", "bold", 9, arancione);
      doc.text(et, x, y + 7);
      font("Montserrat", "bold", 16, grigio);
      doc.text(val, x, y + 15);
    });
  };

  // Fino a 10 preventivi (+ consulenza) il layout deve stare sempre in una sola pagina:
  // si riduce gradualmente la scala finché il corpo non entra.
  let scala = 1;
  disegna(1);
  if (doc.getNumberOfPages() > 1 && rep.righePreventivi.length <= 11) {
    for (let k = 0.95; k >= 0.5 && doc.getNumberOfPages() > 1; k -= 0.05) { scala = k; disegna(k); }
  }

  // Note: "niente note" non stampa nulla, "note vuote" stampa un riquadro da compilare a mano
  const modoNote = modalitaNote();
  if (modoNote === "vuote") {
    doc.addPage();
    y = TOP + 8;
    font("MontserratSB", "normal", 13, arancione);
    doc.text("Note", M, y);
    const top = y + 5, bottom = H - BOTTOM - 4;
    doc.setDrawColor(...arancione).setLineWidth(0.7).rect(M, top, W - 2 * M, bottom - top);
    doc.setDrawColor(200, 198, 190).setLineWidth(0.15);
    for (let ly = top + 9; ly < bottom - 2; ly += 9) doc.line(M + 4, ly, W - M - 4, ly);
  } else if (modoNote === "testo" && noteHtml) {
    doc.addPage();   // le note stanno sempre in una pagina a parte
    y = TOP + 8;
    font("MontserratSB", "normal", 13, arancione);
    doc.text("Note", M, y);
    y += 7;
    const RIGA = 5, DIM = 9.5, larghezza = W - 2 * M;
    noteInBlocchi(noteHtml).forEach((bl) => {
      const x0 = M + bl.rientro;
      const xTesto = x0 + (bl.prefisso ? 5 : 0);
      // spezza in parole con il relativo stile
      const parole = [];
      bl.runs.forEach((r) => r.t.split(/(\s+)/).forEach((t) => { if (t !== "") parole.push({ t, b: r.b, i: r.i }); }));
      const stile = (p) => (p.b ? ["Montserrat", "bold"] : p.i ? ["Montserrat", "italic"] : ["Montserrat", "normal"]);
      const larg = (p) => { doc.setFont(...stile(p)).setFontSize(DIM); return doc.getTextWidth(p.t); };
      const righe = [[]];
      let x = xTesto;
      parole.forEach((p) => {
        const w = larg(p);
        if (!/^\s+$/.test(p.t) && x + w > W - M && righe[righe.length - 1].length) { righe.push([]); x = xTesto; }
        if (/^\s+$/.test(p.t) && !righe[righe.length - 1].length) return; // niente spazi a inizio riga
        righe[righe.length - 1].push({ ...p, w });
        x += w;
      });
      righe.forEach((riga, idx) => {
        nuovaPaginaSe(RIGA);
        if (idx === 0 && bl.prefisso) { font("Montserrat", "normal", DIM, arancione); doc.text(bl.prefisso, x0, y); }
        let px = xTesto;
        riga.forEach((p) => {
          font(...stile(p), DIM, grigio);
          doc.text(p.t, px, y);
          px += p.w;
        });
        y += RIGA;
      });
      y += 1.5;
    });
  }

  // Header e footer su ogni pagina
  const pagine = doc.getNumberOfPages();
  const LOGO_W = 46, LOGO_H = LOGO_W * 600 / 1550;
  const FOOT_W = 100, FOOT_H = FOOT_W * 34 / 645;
  for (let i = 1; i <= pagine; i++) {
    doc.setPage(i);
    doc.addImage(ASSETS.logo, "PNG", (W - LOGO_W) / 2, 8, LOGO_W, LOGO_H);
    font("Montserrat", "normal", 7.5, arancione);
    doc.text("1NNOVATEAM.IT", W - M, 8 + LOGO_H + 4, { align: "right", charSpace: 0.6 });
    doc.addImage(ASSETS.footer, "PNG", (W - FOOT_W) / 2, H - 22, FOOT_W, FOOT_H);
    font("Montserrat", "normal", 8, grigio);
    doc.text(`Pagina ${i} di ${pagine}`, W / 2, H - 10, { align: "center" });
  }

  return { doc, scala };
}

function generaPdf() {
  if (typeof jspdf === "undefined" || typeof ASSETS === "undefined") {
    alert("Librerie PDF non caricate.");
    return;
  }
  const rep = costruisciReport();
  if (!rep) return;
  scarica(costruisciPdf(rep).doc.output("blob"), `${rep.nomeFile}.pdf`);
}

// Guida in una nuova finestra
$("apriGuida").addEventListener("click", (e) => e.preventDefault() || window.open("guida.html", "guidaPreventivatore", "width=900,height=800,resizable=yes,scrollbars=yes"));
$("genera").addEventListener("click", generaWord);
$("generaPdf").addEventListener("click", generaPdf);
// Campi importo: in modifica numero semplice, a campo lasciato formattato "€ 1.234,56"
// Default costo pratica dalle Impostazioni (localStorage del browser, vedi impostazioni.html)
try {
  const salvato = JSON.parse(localStorage.getItem("preventivatore.impostazioni") || "{}").costoPratica;
  if (salvato > 0) $("costoPratica").value = $("studioFattibilita").value = String(salvato);
} catch (e) { /* storage non disponibile: resta il default del markup */ }
document.querySelectorAll("#costoPratica, #studioFattibilita").forEach((i) => (i.value = eur(parseEur(i.value))));
document.addEventListener("focusin", (e) => {
  if (!e.target.classList.contains("money") || e.target.value === "") return;
  e.target.value = String(parseEur(e.target.value)).replace(".", ",");
  e.target.select();
});
document.addEventListener("focusout", (e) => {
  if (e.target.classList.contains("money") && e.target.value.trim() !== "") e.target.value = eur(parseEur(e.target.value));
});
document.addEventListener("input", aggiorna);
aggiorna();
