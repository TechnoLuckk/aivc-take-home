import Groq from "groq-sdk";
import { classificationSchema, type EnquiryInput } from "./types";

const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an intake triage assistant for a professional services firm.
Classify inbound client enquiries into exactly one service line and one complexity level.

Service lines:
- Strategy: market positioning, M&A, growth planning, competitive analysis
- Operations: process improvement, supply chain, cost optimization, workflow design
- Technology: software, cloud, data platforms, digital transformation, AI/ML implementation
- Compliance: regulatory, audit, risk, governance, privacy, policy
- HR Advisory: talent, compensation, culture, workforce planning, retention

Complexity rubric:
- simple: single clear ask, limited scope, one team or function
- moderate: multi-step engagement, several stakeholders, defined deliverables
- complex: enterprise-wide, regulatory pressure, legacy systems, tight deadlines, ambiguous scope

Set needsHumanReview=true when the enquiry spans multiple service lines, is vague, or confidence would be below 0.7.
Return ONLY valid JSON matching this schema:
{
  "serviceLine": "Strategy" | "Operations" | "Technology" | "Compliance" | "HR Advisory",
  "complexity": "simple" | "moderate" | "complex",
  "confidence": number between 0 and 1,
  "reasoning": "1-2 sentence explanation",
  "suggestedTags": string[],
  "needsHumanReview": boolean
}`;

const FEW_SHOT_EXAMPLES = `
Example 1:
Input: "We need help evaluating three ERP vendors before our board meeting next month." | Industry: Manufacturing | Size: 500-1000 | Urgency: high
Output: {"serviceLine":"Technology","complexity":"moderate","confidence":0.91,"reasoning":"Vendor selection for ERP is a defined technology advisory engagement with a clear deadline.","suggestedTags":["erp","vendor-selection"],"needsHumanReview":false}

Example 2:
Input: "Not sure where to start — growth has stalled and our ops team is overwhelmed." | Industry: Retail | Size: 50-200 | Urgency: medium
Output: {"serviceLine":"Strategy","complexity":"moderate","confidence":0.62,"reasoning":"The ask blends growth strategy and operational strain, making service line assignment ambiguous.","suggestedTags":["growth","operations","ambiguous"],"needsHumanReview":true}

Example 3:
Input: "Annual SOC 2 audit prep — need policy documentation reviewed before Q3." | Industry: SaaS | Size: 100-250 | Urgency: medium
Output: {"serviceLine":"Compliance","complexity":"simple","confidence":0.94,"reasoning":"Focused compliance documentation review with a standard audit timeline.","suggestedTags":["soc2","audit-prep"],"needsHumanReview":false}
`;

function buildUserPrompt(input: EnquiryInput): string {
  return `${FEW_SHOT_EXAMPLES}

Classify this enquiry:
Description: ${input.description}
Industry: ${input.industry}
Company size: ${input.companySize}
Urgency: ${input.urgency}`;
}

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey });
}

export async function classifyWithGroq(
  input: EnquiryInput,
): Promise<ReturnType<typeof classificationSchema.parse>> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  console.log(content);
  if (!content) {
    throw new Error("Empty response from Groq");
  }

  const parsed = classificationSchema.parse(JSON.parse(content));
  return parsed;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
