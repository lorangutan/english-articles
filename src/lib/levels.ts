// Four reading bands, each shown on the CEFR, IELTS and TOEFL iBT scales.
// Alignments follow the published IELTS and ETS (TOEFL) CEFR mapping tables.

export type Scale = "cefr" | "ielts" | "toefl";

export type Band = {
  id: 1 | 2 | 3 | 4;
  name: string;
  blurb: string;
  cefr: string;
  ielts: string;
  toefl: string;
};

export const BANDS: Band[] = [
  { id: 1, name: "Foundation", blurb: "Short sentences, everyday words.", cefr: "A1 – A2", ielts: "3.0 – 4.0", toefl: "Under 42" },
  { id: 2, name: "Intermediate", blurb: "Clear ideas on familiar subjects.", cefr: "B1", ielts: "4.5 – 5.0", toefl: "42 – 71" },
  { id: 3, name: "Upper intermediate", blurb: "Real journalism, gently pitched.", cefr: "B2", ielts: "5.5 – 6.5", toefl: "72 – 94" },
  { id: 4, name: "Advanced", blurb: "Dense argument, rich vocabulary.", cefr: "C1 – C2", ielts: "7.0 – 9.0", toefl: "95 – 120" },
];

export const SCALE_LABEL: Record<Scale, string> = { cefr: "CEFR", ielts: "IELTS", toefl: "TOEFL iBT" };

export function bandById(id: number) {
  return BANDS.find((b) => b.id === id) ?? BANDS[1];
}

export function cefrToBand(cefr: string): Band["id"] {
  if (cefr === "A1" || cefr === "A2") return 1;
  if (cefr === "B1") return 2;
  if (cefr === "B2") return 3;
  return 4;
}
