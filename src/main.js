import NutrientViewer from "@nutrient-sdk/viewer";
import { DOCUMENTS } from "./documents.js";

const LICENSE_KEY = import.meta.env.VITE_NUTRIENT_LICENSE_KEY || "";
// The app is served from "/" in dev and from a sub-path in production, so every
// asset URL (documents and the SDK's WASM bundle) is resolved against the base.
const BASE = new URL(import.meta.env.BASE_URL, window.location.origin).href;
const REVIEWER = "S. Taylor";

const el = (id) => document.getElementById(id);
const viewerContainer = el("viewer");

let instance = null;
let currentDoc = DOCUMENTS[0];
let currentLocale = "en";
let redliningOn = false;
const activity = [];

/* ---------------------------------------------------------------- sidebar */

function renderDocList() {
  el("doc-list").innerHTML = DOCUMENTS.map(
    (d) => `
      <li data-id="${d.id}" class="${d.id === currentDoc.id ? "is-active" : ""}">
        <span class="doc-name">${d.name}</span>
        <span class="doc-ref">${d.ref}</span>
      </li>`
  ).join("");
  el("doc-list")
    .querySelectorAll("li")
    .forEach((li) =>
      li.addEventListener("click", () => {
        const doc = DOCUMENTS.find((d) => d.id === li.dataset.id);
        if (doc.id !== currentDoc.id) openDocument(doc);
      })
    );
}

function renderWorkflow() {
  el("workflow").innerHTML = currentDoc.workflow
    .map(
      (s) => `
      <li class="${s.status}">
        <span class="dot"></span>
        <span class="who">${s.who}<br /><span class="state">${s.role} · ${s.state}</span></span>
      </li>`
    )
    .join("");
}

function renderActivity() {
  el("activity").innerHTML = activity.length
    ? activity.map((a) => `<li><b>${a.what}</b><br />${a.when}</li>`).join("")
    : `<li>No activity yet. Add markup, take a measurement or sign the plan.</li>`;
}

function log(what) {
  activity.unshift({
    what,
    when: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  activity.splice(8);
  renderActivity();
}

/* ----------------------------------------------------------------- viewer */

function toolbarItems() {
  // Curated toolbar: navigation, review markup, measurement and signing.
  return [
    { type: "sidebar-thumbnails" },
    { type: "sidebar-annotations" },
    { type: "sidebar-signatures" },
    { type: "pager" },
    { type: "spacer" },
    { type: "pan" },
    { type: "zoom-out" },
    { type: "zoom-in" },
    { type: "zoom-mode" },
    { type: "marquee-zoom" },
    { type: "spacer" },
    { type: "ink" },
    { type: "highlighter" },
    { type: "text-highlighter" },
    { type: "note" },
    { type: "comment" },
    { type: "text" },
    { type: "callout" },
    { type: "arrow" },
    { type: "rectangle" },
    { type: "cloudy-rectangle" },
    { type: "ellipse" },
    { type: "polyline" },
    { type: "polygon" },
    { type: "stamp" },
    { type: "ink-eraser" },
    { type: "spacer" },
    { type: "measure" },
    { type: "signature" },
    { type: "spacer" },
    { type: "undo" },
    { type: "redo" },
    { type: "search" },
    { type: "print" },
    { type: "export-pdf" },
  ];
}

async function openDocument(doc) {
  currentDoc = doc;
  renderDocList();
  renderWorkflow();
  el("doc-title").textContent = doc.name;
  el("doc-meta").textContent = `${doc.ref} · ${doc.meta}`;

  if (instance) {
    NutrientViewer.unload(viewerContainer);
    instance = null;
  }

  try {
    instance = await loadViewer(doc);
  } catch (error) {
    viewerContainer.innerHTML =
      `<p class="viewer-error">The viewer could not open this document.<br /><code></code></p>`;
    viewerContainer.querySelector("code").textContent = String(error);
    console.error("Nutrient Web SDK failed to load the document", error);
    return;
  }

  instance.addEventListener("annotations.create", (created) => {
    created.forEach((a) => log(`${annotationLabel(a)} added by ${REVIEWER}`));
  });
  instance.addEventListener("annotations.delete", (deleted) => {
    deleted.forEach((a) => log(`${annotationLabel(a)} removed`));
  });

  el("doc-meta").textContent =
    `${doc.ref} · ${doc.meta} · ${instance.totalPageCount} page${instance.totalPageCount > 1 ? "s" : ""}`;
  redliningOn = false;
  el("btn-redline").classList.remove("is-on");
  log(`Opened ${doc.name}`);
}

function loadViewer(doc) {
  return NutrientViewer.load({
    container: viewerContainer,
    document: new URL(doc.file, BASE).href,
    baseUrl: BASE,
    licenseKey: LICENSE_KEY || undefined,
    toolbarItems: toolbarItems(),
    locale: currentLocale,
    // Every markup carries the reviewer identity, so the workflow engine of the
    // host application can filter on it.
    annotationCreatorName: REVIEWER,
    // Drawing scale so distances and areas are reported in feet. The scale is
    // pre-selected for the document, reviewers can still add or calibrate one.
    measurementValueConfiguration: (documentScales) => [
      {
        name: doc.scaleName,
        scale: doc.scale,
        precision: NutrientViewer.MeasurementPrecision.TWO,
        selected: true,
      },
      ...documentScales,
    ],
    measurementSnapping: true,
    electronicSignatures: {
      creationModes: [
        NutrientViewer.ElectronicSignatureCreationMode.DRAW,
        NutrientViewer.ElectronicSignatureCreationMode.TYPE,
        NutrientViewer.ElectronicSignatureCreationMode.IMAGE,
      ],
    },
    initialViewState: new NutrientViewer.ViewState({
      sidebarMode: NutrientViewer.SidebarMode.ANNOTATIONS,
      zoom: NutrientViewer.ZoomMode.FIT_TO_WIDTH,
    }),
  });
}

function annotationLabel(a) {
  const A = NutrientViewer.Annotations;
  if (a instanceof A.LineAnnotation && a.measurementScale) return "Distance measurement";
  if (
    a instanceof A.RectangleAnnotation ||
    a instanceof A.EllipseAnnotation ||
    a instanceof A.PolygonAnnotation
  ) {
    if (a.measurementScale) return "Area measurement";
  }
  if (a instanceof A.PolylineAnnotation && a.measurementScale) return "Perimeter measurement";
  if (a instanceof A.InkAnnotation) return "Redline markup";
  if (a instanceof A.StampAnnotation) return `Review stamp "${a.title}"`;
  if (a instanceof A.NoteAnnotation || a instanceof A.TextAnnotation) return "Review note";
  if (a instanceof A.WidgetAnnotation) return "Signature field";
  if (a instanceof A.HighlightAnnotation) return "Highlight";
  return "Markup";
}

/* ---------------------------------------------------------------- actions */

function setInteractionMode(mode) {
  instance.setViewState((vs) => vs.set("interactionMode", mode));
}

// Redlining: red ink pen preset, the classic "mark it up in red" review tool.
function toggleRedlining() {
  redliningOn = !redliningOn;
  el("btn-redline").classList.toggle("is-on", redliningOn);
  if (!redliningOn) {
    setInteractionMode(null);
    return;
  }
  const presets = instance.annotationPresets;
  presets.ink = {
    ...presets.ink,
    strokeColor: NutrientViewer.Color.RED,
    lineWidth: 4,
    opacity: 1,
  };
  instance.setAnnotationPresets(presets);
  // Make the ink tool use the red preset, not the last ink settings used.
  instance.setCurrentAnnotationPreset("ink");
  setInteractionMode(NutrientViewer.InteractionMode.INK);
  log("Redlining mode enabled");
}

// Electronic signature: places a signature on the plan through the signature
// dialog (draw, type or upload an image).
function signAsReviewer() {
  setInteractionMode(NutrientViewer.InteractionMode.SIGNATURE);
  log("Electronic signature requested");
}

async function stampDecision(approved) {
  const { width, height } = instance.pageInfoForIndex(0);
  const text = approved ? "APPROVED" : "REVISION REQUIRED";
  const stamp = new NutrientViewer.Annotations.StampAnnotation({
    pageIndex: instance.viewState.currentPageIndex,
    stampType: "Custom",
    title: text,
    subtitle: `${REVIEWER} · ${new Date().toLocaleDateString("en-GB")}`,
    color: approved ? new NutrientViewer.Color({ r: 23, g: 128, b: 61 })
                    : new NutrientViewer.Color({ r: 226, g: 0, b: 42 }),
    boundingBox: new NutrientViewer.Geometry.Rect({
      left: width - 280,
      top: height - 140,
      width: 240,
      height: 80,
    }),
    creatorName: REVIEWER,
  });
  await instance.create(stamp);

  const step = currentDoc.workflow.find((s) => s.who === REVIEWER);
  if (step) {
    step.state = approved ? "Approved" : "Changes requested";
    step.status = approved ? "done" : "rejected";
    const next = currentDoc.workflow.find((s) => s.status === "pending");
    if (approved && next) {
      next.status = "current";
      next.state = "In review";
    }
  }
  renderWorkflow();
  log(approved ? "Plan approved, handed to next reviewer" : "Changes requested");
}


function download(blobOrString, filename, type) {
  const blob =
    typeof blobOrString === "string"
      ? new Blob([blobOrString], { type })
      : new Blob([blobOrString], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportXFDF() {
  const xfdf = await instance.exportXFDF();
  download(xfdf, `${currentDoc.id}-markup.xfdf`, "application/vnd.adobe.xfdf");
  log("Markup exported as XFDF (original PDF untouched)");
}

async function exportPDF(flatten) {
  const buffer = await instance.exportPDF(flatten ? { flatten: true } : {});
  download(buffer, `${currentDoc.id}${flatten ? "-flattened" : "-markup"}.pdf`, "application/pdf");
  log(flatten ? "Flattened PDF exported for archiving" : "PDF with embedded markup exported");
}

async function setLocale(locale) {
  currentLocale = locale;
  document.querySelectorAll(".locale-switch button").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.locale === locale)
  );
  await instance.setLocale(locale);
  log(`Viewer language switched to ${locale.toUpperCase()}`);
}

/* -------------------------------------------------------------- bootstrap */

el("btn-redline").addEventListener("click", toggleRedlining);
el("btn-measure").addEventListener("click", () => {
  setInteractionMode(NutrientViewer.InteractionMode.DISTANCE);
  log("Distance measurement tool activated");
});
el("btn-scale").addEventListener("click", () => {
  setInteractionMode(NutrientViewer.InteractionMode.MEASUREMENT_SETTINGS);
});
el("btn-sign").addEventListener("click", signAsReviewer);
el("btn-approve").addEventListener("click", () => stampDecision(true));
el("btn-reject").addEventListener("click", () => stampDecision(false));
el("btn-xfdf").addEventListener("click", exportXFDF);
el("btn-pdf").addEventListener("click", () => exportPDF(false));
el("btn-flatten").addEventListener("click", () => exportPDF(true));
document.querySelectorAll(".locale-switch button").forEach((b) =>
  b.addEventListener("click", () => setLocale(b.dataset.locale))
);

renderActivity();
openDocument(currentDoc);
