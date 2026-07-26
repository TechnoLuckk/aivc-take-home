import type { Classification, EnquiryInput } from "./types";
import { serviceLineSchema } from "./types";

const KEYWORD_MAP: Record<string, string[]> = {
  Strategy: [
    "strategy",
    "growth",
    "market entry",
    "m&a",
    "merger",
    "acquisition",
    "vision",
    "roadmap",
    "competitive",
    "positioning",
  ],
  Operations: [
    "operations",
    "process",
    "efficiency",
    "supply chain",
    "logistics",
    "workflow",
    "cost reduction",
    "lean",
    "procurement",
  ],
  Technology: [
    "technology",
    "software",
    "cloud",
    "migration",
    "api",
    "data platform",
    "ai",
    "machine learning",
    "digital transformation",
    "erp",
    "crm",
  ],
  Compliance: [
    "compliance",
    "regulatory",
    "audit",
    "gdpr",
    "sox",
    "risk",
    "governance",
    "policy",
    "legal",
    "privacy",
  ],
  "HR Advisory": [
    "hr",
    "human resources",
    "talent",
    "hiring",
    "compensation",
    "benefits",
    "culture",
    "retention",
    "workforce",
    "employee",
  ],
};

function scoreServiceLines(text: string): Record<string, number> {
  const normalized = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [serviceLine, keywords] of Object.entries(KEYWORD_MAP)) {
    scores[serviceLine] = keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? 1 : 0),
      0,
    );
  }

  return scores;
}

function inferComplexity(input: EnquiryInput): Classification["complexity"] {
  const wordCount = input.description.split(/\s+/).length;
  const hasStakeholders =
    /stakeholder|multi-site|global|integration|legacy|board|regulator/i.test(
      input.description,
    );

  if (wordCount > 80 || hasStakeholders || input.urgency === "high") {
    return "complex";
  }
  if (wordCount > 35 || input.urgency === "medium") {
    return "moderate";
  }
  return "simple";
}

export function classifyWithKeywords(
  input: EnquiryInput,
): Classification | null {
  const scores = scoreServiceLines(
    `${input.description} ${input.industry} ${input.companySize}`,
  );
  const ranked = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const [topLine, topScore] = ranked[0];
  const [, secondScore] = ranked[1] ?? ["", 0];

  if (topScore === 0) {
    return null;
  }

  const ambiguous = topScore === secondScore;
  const confidence = ambiguous
    ? 0.45
    : Math.min(0.65, 0.35 + topScore * 0.1);

  const parsedServiceLine = serviceLineSchema.safeParse(topLine);
  if (!parsedServiceLine.success) {
    return null;
  }

  const complexity = inferComplexity(input);

  const needsHumanReview = confidence < 0.6;

  const reasoning = needsHumanReview
    ? `Keyword fallback suggested ${parsedServiceLine.data} (${complexity}) with ${(confidence * 100).toFixed(0)}% confidence. LLM unavailable \u2014 flagged for human review.`
    : `Keyword-based fallback classification used. Confidence ${(confidence * 100).toFixed(0)}% \u2014 auto-routed.`;

  return {
    serviceLine: parsedServiceLine.data,
    complexity,
    confidence,
    reasoning,
    suggestedTags: ["fallback", "needs-validation"],
    needsHumanReview,
  };
}
