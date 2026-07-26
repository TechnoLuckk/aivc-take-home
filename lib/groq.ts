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
Example 1 (Strategy / simple):
Input: "Need a competitive landscape analysis for our Series B positioning." | Industry: SaaS | Size: 50-200 | Urgency: low
Output: {"serviceLine":"Strategy","complexity":"simple","confidence":0.93,"reasoning":"Single clear deliverable — competitive analysis for positioning. Limited scope, one team.","suggestedTags":["competitive-analysis","positioning"],"needsHumanReview":false}

Example 2 (Strategy / moderate — ambiguous, needs review):
Input: "Not sure where to start — growth has stalled and our ops team is overwhelmed." | Industry: Retail | Size: 50-200 | Urgency: medium
Output: {"serviceLine":"Strategy","complexity":"moderate","confidence":0.62,"reasoning":"The ask blends growth strategy and operational strain, making service line assignment ambiguous.","suggestedTags":["growth","operations","ambiguous"],"needsHumanReview":true}

Example 3 (Strategy / complex — multi-function integration):
Input: "Post-acquisition integration playbook needed across finance, HR, and IT operating models within 60 days." | Industry: Professional Services | Size: 1000-5000 | Urgency: high
Output: {"serviceLine":"Strategy","complexity":"complex","confidence":0.88,"reasoning":"Enterprise-wide post-merger integration spanning multiple functions with tight deadline and regulatory implications.","suggestedTags":["ma","integration","post-merger"],"needsHumanReview":true}

Example 4 (Operations / simple):
Input: "Our warehouse pick-pack cycle times are 40% above benchmark. Need a lean process redesign." | Industry: Logistics | Size: 200-500 | Urgency: low
Output: {"serviceLine":"Operations","complexity":"simple","confidence":0.91,"reasoning":"Focused operational improvement with a clear metric and defined methodology (lean).","suggestedTags":["lean","warehouse","process-improvement"],"needsHumanReview":false}

Example 5 (Operations / moderate):
Input: "Decentralized procurement is causing maverick spend. Need a centralization roadmap and category management setup." | Industry: Hospitality | Size: 1000-5000 | Urgency: medium
Output: {"serviceLine":"Operations","complexity":"moderate","confidence":0.87,"reasoning":"Multi-step procurement transformation with roadmap and implementation deliverables across several stakeholders.","suggestedTags":["procurement","centralization","category-management"],"needsHumanReview":false}

Example 6 (Operations / complex):
Input: "Private equity sponsor wants 15% SG&A reduction within 12 months across all business units without impacting growth investments." | Industry: Business Services | Size: 1000-5000 | Urgency: high
Output: {"serviceLine":"Operations","complexity":"complex","confidence":0.90,"reasoning":"Enterprise-wide cost transformation with aggressive timeline, multiple business units, and competing growth constraints.","suggestedTags":["cost-transformation","sga","private-equity"],"needsHumanReview":false}

Example 7 (Technology / simple):
Input: "Integrate Shopify storefront with NetSuite inventory in six weeks for holiday peak season." | Industry: Retail | Size: 50-200 | Urgency: high
Output: {"serviceLine":"Technology","complexity":"simple","confidence":0.92,"reasoning":"Single API integration between two well-defined systems with a clear deadline.","suggestedTags":["api-integration","shopify","netsuite"],"needsHumanReview":false}

Example 8 (Technology / moderate):
Input: "We need help evaluating three ERP vendors before our board meeting next month." | Industry: Manufacturing | Size: 500-1000 | Urgency: high
Output: {"serviceLine":"Technology","complexity":"moderate","confidence":0.91,"reasoning":"Vendor selection for ERP is a defined technology advisory engagement with a clear deadline.","suggestedTags":["erp","vendor-selection"],"needsHumanReview":false}

Example 9 (Technology / complex):
Input: "Core banking mainframe is end-of-life. Need phased modernization strategy with regulator engagement across three regions." | Industry: Banking | Size: 5000+ | Urgency: high
Output: {"serviceLine":"Technology","complexity":"complex","confidence":0.89,"reasoning":"Legacy modernization with regulatory pressure across multiple regions, tight deadlines, and high-risk scope.","suggestedTags":["mainframe","modernization","regulatory","multi-region"],"needsHumanReview":true}

Example 10 (Compliance / simple):
Input: "Annual SOC 2 audit prep — need policy documentation reviewed before Q3." | Industry: SaaS | Size: 100-250 | Urgency: medium
Output: {"serviceLine":"Compliance","complexity":"simple","confidence":0.94,"reasoning":"Focused compliance documentation review with a standard audit timeline.","suggestedTags":["soc2","audit-prep"],"needsHumanReview":false}

Example 11 (Compliance / moderate):
Input: "Regulator flagged gaps in our GDPR data retention policies. Need remediation plan within 30 days." | Industry: Healthcare | Size: 250-500 | Urgency: high
Output: {"serviceLine":"Compliance","complexity":"moderate","confidence":0.88,"reasoning":"Regulatory remediation with a firm deadline involving policy updates and gap analysis across data practices.","suggestedTags":["gdpr","remediation","data-retention"],"needsHumanReview":false}

Example 12 (Compliance / complex):
Input: "Expanding to EU and APAC entities. Need transfer pricing documentation and indirect tax compliance framework across 8 jurisdictions." | Industry: Manufacturing | Size: 1000-5000 | Urgency: medium
Output: {"serviceLine":"Compliance","complexity":"complex","confidence":0.86,"reasoning":"Multi-jurisdiction tax compliance framework spanning EU and APAC with transfer pricing implications and regulatory complexity.","suggestedTags":["transfer-pricing","multi-jurisdiction","tax-compliance"],"needsHumanReview":true}

Example 13 (HR Advisory / simple):
Input: "Board requested an executive compensation benchmarking study against peer fintech companies." | Industry: Fintech | Size: 100-250 | Urgency: low
Output: {"serviceLine":"HR Advisory","complexity":"simple","confidence":0.93,"reasoning":"Straightforward benchmarking study with a defined peer set and clear deliverable.","suggestedTags":["executive-compensation","benchmarking"],"needsHumanReview":false}

Example 14 (HR Advisory / moderate):
Input: "Voluntary attrition hit 22% this year. Need a retention diagnostic and manager enablement program." | Industry: Technology | Size: 250-500 | Urgency: medium
Output: {"serviceLine":"HR Advisory","complexity":"moderate","confidence":0.89,"reasoning":"Multi-step retention engagement with diagnostic analysis and program design involving several stakeholders.","suggestedTags":["retention","attrition","manager-enablement"],"needsHumanReview":false}

Example 15 (HR Advisory / complex):
Input: "Planning a reorg from functional to business-unit structure affecting 800 roles across four countries." | Industry: Pharma | Size: 5000+ | Urgency: high
Output: {"serviceLine":"HR Advisory","complexity":"complex","confidence":0.87,"reasoning":"Enterprise-wide organizational restructure across multiple countries with high employee impact and regulatory considerations.","suggestedTags":["org-restructure","multi-country","change-management"],"needsHumanReview":true}
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
