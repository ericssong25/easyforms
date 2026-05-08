import { carriers, plans } from "./insurance-data";

export interface SearchResult {
  label: string;
  sublabel?: string;
  type: "carrier" | "plan";
}

// Normalize text: lowercase, remove extra spaces, collapse punctuation
function norm(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Expand known aliases in a query string
function expandAliases(query: string): string[] {
  const terms: string[] = [query];

  // Check carrier aliases
  for (const c of carriers) {
    for (const alias of c.aliases) {
      const aliasNorm = norm(alias);
      const queryNorm = norm(query);
      if (queryNorm === aliasNorm || queryNorm.includes(aliasNorm)) {
        terms.push(c.name);
      }
    }
  }

  // Common abbreviation expansion
  const abbrev: Record<string, string> = {
    uhc: "unitedhealthcare",
    bcbs: "blue cross blue shield",
    kp: "kaiser permanente",
    ma: "medicare advantage",
    pdp: "prescription drug plan",
    hmo: "",
    ppo: "",
    epo: "",
  };

  const words = norm(query).split(" ");
  const expanded = words
    .map((w) => abbrev[w] || w)
    .filter(Boolean)
    .join(" ");
  if (expanded !== norm(query)) {
    terms.push(expanded);
  }

  return Array.from(new Set(terms.map(norm)));
}

// Score: higher = better match
function score(text: string, query: string): number {
  const t = norm(text);
  const q = norm(query);

  if (t === q) return 100;
  if (q && t.startsWith(q)) return 80;
  if (q.length >= 3 && t.startsWith(q.slice(0, 3))) return 60;
  if (t.includes(q) && q.length >= 3) return 50;

  // Word-level matching
  const textWords = t.split(" ");
  const queryWords = q.split(" ");
  let wordScore = 0;
  for (const qw of queryWords) {
    if (qw.length < 2) continue;
    for (const tw of textWords) {
      if (tw === qw) wordScore += 20;
      else if (tw.startsWith(qw) && qw.length >= 3) wordScore += 10;
      else if (tw.includes(qw) && qw.length >= 3) wordScore += 5;
    }
  }
  return wordScore;
}

export function smartSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const results: (SearchResult & { score: number })[] = [];
  const queryTerms = expandAliases(query);
  const seen = new Set<string>();

  // Search carriers
  const filterCarriers = (q: string) => {
    for (const c of carriers) {
      const key = `carrier:${c.name}`;
      if (seen.has(key)) continue;

      let bestScore = 0;
      bestScore = Math.max(bestScore, score(c.name, q));
      for (const alias of c.aliases) {
        bestScore = Math.max(bestScore, score(alias, q));
      }
      // Also search carrier + state for regional carriers
      if (c.states) {
        for (const state of c.states) {
          bestScore = Math.max(bestScore, score(`${c.name} ${state}`, q));
        }
      }

      if (bestScore > 0) {
        seen.add(key);
        const stateInfo = c.states ? ` (${c.states.join(", ")})` : "";
        results.push({
          label: c.name,
          sublabel: `${c.types.join(", ")}${stateInfo}`,
          type: "carrier",
          score: bestScore,
        });
      }
    }
  };

  // Search plans
  const filterPlans = (q: string) => {
    for (const p of plans) {
      const key = `plan:${p.carrier}:${p.name}`;
      if (seen.has(key)) continue;

      let bestScore = 0;
      bestScore = Math.max(bestScore, score(p.name, q));
      for (const alias of p.aliases) {
        bestScore = Math.max(bestScore, score(alias, q));
      }

      if (bestScore > 0) {
        seen.add(key);
        results.push({
          label: p.name,
          sublabel: `${p.carrier} · ${p.type}${p.metalLevel ? ` · ${p.metalLevel}` : ""}`,
          type: "plan",
          score: bestScore,
        });
      }
    }
  };

  // Try each expanded query term
  for (const term of queryTerms) {
    filterCarriers(term);
    filterPlans(term);
  }

  // Sort by score descending, then alphabetically
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.label.localeCompare(b.label);
  });

  // Return top 12
  return results.slice(0, 12);
}

// Extract carrier name from a plan result (for dependency chaining)
export function getCarrierFromPlan(planName: string): string | null {
  const plan = plans.find((p) => p.name.toLowerCase() === planName.toLowerCase());
  return plan?.carrier || null;
}

// Get plans for a carrier (for cascading combobox)
export function getPlansForCarrierSearch(carrierName: string): string[] {
  const names = plans
    .filter((p) => p.carrier.toLowerCase() === carrierName.toLowerCase())
    .map((p) => p.name);
  return Array.from(new Set(names)).sort();
}
