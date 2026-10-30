// Sample plans used for the demo. In a real system these come from the
// document repository of the host application; the viewer only needs a URL or
// an ArrayBuffer. See public/documents/CREDITS.md for the source of the files.
// Reference numbers, dates and reviewer names are fictitious.
export const DOCUMENTS = [
  {
    id: "plan-levels",
    name: "Level plans, foundation to roof",
    ref: "PR-2026-0471 · Rev. C",
    file: "documents/plan-levels.pdf",
    meta: "Construction plan · 4 sheets · submitted 22 Sep 2026",
    // Drawing scale printed on the sheets: 1/4 inch on the plan equals 1 foot.
    scaleName: "Sheet scale 1/4\" = 1'-0\"",
    scale: { unitFrom: "in", unitTo: "ft", fromValue: 1, toValue: 4 },
    workflow: [
      { who: "J. Carter", role: "Technical check", state: "Approved", status: "done" },
      { who: "R. Singh", role: "Structural", state: "Approved", status: "done" },
      { who: "S. Taylor", role: "Building services", state: "In review", status: "current" },
      { who: "L. Moreau", role: "Final approval", state: "Waiting", status: "pending" },
    ],
  },
  {
    id: "plan-elevations",
    name: "Elevations and sections",
    ref: "PR-2026-0518 · Rev. A",
    file: "documents/plan-elevations.pdf",
    meta: "Construction plan · 5 sheets · submitted 24 Sep 2026",
    scaleName: "Sheet scale 1/4\" = 1'-0\"",
    scale: { unitFrom: "in", unitTo: "ft", fromValue: 1, toValue: 4 },
    workflow: [
      { who: "J. Carter", role: "Technical check", state: "Approved", status: "done" },
      { who: "S. Taylor", role: "Building services", state: "In review", status: "current" },
      { who: "K. Novak", role: "Fire safety", state: "Waiting", status: "pending" },
      { who: "L. Moreau", role: "Final approval", state: "Waiting", status: "pending" },
    ],
  },
];
