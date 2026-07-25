import { classifyWithGroq, isGroqConfigured } from "./groq";
import { classifyWithKeywords } from "./fallback";
import { applyRoutingRules } from "./routing";
import type { EnquiryInput, TriageResult } from "./types";

const LLM_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("LLM request timed out")), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function triageEnquiry(input: EnquiryInput): Promise<TriageResult> {
  if (!isGroqConfigured()) {
    const fallback = classifyWithKeywords(input);
    if (!fallback) {
      return {
        input,
        classification: {
          serviceLine: "Strategy",
          complexity: "moderate",
          confidence: 0,
          reasoning: "No GROQ_API_KEY configured and keyword fallback could not classify.",
          suggestedTags: ["manual-review"],
          needsHumanReview: true,
        },
        routing: applyRoutingRules(
          {
            serviceLine: "Strategy",
            complexity: "moderate",
            confidence: 0,
            reasoning: "Manual review required.",
            suggestedTags: ["manual-review"],
            needsHumanReview: true,
          },
          input,
        ),
        source: "manual_review",
        status: "pending_manual_review",
        errorReason: "GROQ_API_KEY is not configured",
      };
    }

    return {
      input,
      classification: fallback,
      routing: applyRoutingRules(fallback, input),
      source: "fallback",
      status: "triaged",
    };
  }

  try {
    const classification = await withTimeout(classifyWithGroq(input), LLM_TIMEOUT_MS);
    return {
      input,
      classification,
      routing: applyRoutingRules(classification, input),
      source: "llm",
      status: "triaged",
    };
  } catch (error) {
    const fallback = classifyWithKeywords(input);
    const errorReason =
      error instanceof Error ? error.message : "Unknown LLM error";

    if (!fallback) {
      return {
        input,
        classification: {
          serviceLine: "Strategy",
          complexity: "moderate",
          confidence: 0,
          reasoning: "LLM failed and keyword fallback could not classify this enquiry.",
          suggestedTags: ["manual-review"],
          needsHumanReview: true,
        },
        routing: applyRoutingRules(
          {
            serviceLine: "Strategy",
            complexity: "moderate",
            confidence: 0,
            reasoning: "Manual review required.",
            suggestedTags: ["manual-review"],
            needsHumanReview: true,
          },
          input,
        ),
        source: "manual_review",
        status: "pending_manual_review",
        errorReason,
      };
    }

    return {
      input,
      classification: fallback,
      routing: applyRoutingRules(fallback, input),
      source: "fallback",
      status: "triaged",
      errorReason,
    };
  }
}
