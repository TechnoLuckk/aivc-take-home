import { z } from "zod";

export const urgencySchema = z.enum(["low", "medium", "high"]);
export type Urgency = z.infer<typeof urgencySchema>;

export const complexitySchema = z.enum(["simple", "moderate", "complex"]);
export type Complexity = z.infer<typeof complexitySchema>;

export const serviceLineSchema = z.enum([
  "Strategy",
  "Operations",
  "Technology",
  "Compliance",
  "HR Advisory",
]);
export type ServiceLine = z.infer<typeof serviceLineSchema>;

export const enquiryInputSchema = z.object({
  description: z.string().min(1),
  industry: z.string().min(1),
  companySize: z.string().min(1),
  urgency: urgencySchema,
});
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export const classificationSchema = z.object({
  serviceLine: serviceLineSchema,
  complexity: complexitySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedTags: z.array(z.string()),
  needsHumanReview: z.boolean(),
});
export type Classification = z.infer<typeof classificationSchema>;

export type Priority = "low" | "normal" | "high" | "urgent";

export type TriageSource = "llm" | "fallback" | "manual_review";

export interface Team {
  id: string;
  name: string;
  serviceLine: ServiceLine;
  teamLead: string;
  capacity: number;
}

export interface TeamAssignment {
  teamId: string;
  complexity: Complexity;
  priority: Priority;
  description: string;
  assignedAt: string;
}

export interface TeamLoad {
  team: Team;
  assignments: TeamAssignment[];
  currentLoad: number;
  utilizationPercent: number;
}

export const COMPLEXITY_WEIGHT: Record<Complexity, number> = {
  simple: 1,
  moderate: 2,
  complex: 3,
};

export interface RoutingResult {
  assignedTeamLead: string;
  assignedTeamId: string;
  assignedTeamName: string;
  slaHours: number;
  priority: Priority;
  routeToIntakeReview: boolean;
}

export interface TriageResult {
  input: EnquiryInput;
  classification: Classification;
  routing: RoutingResult;
  source: TriageSource;
  status: "triaged" | "pending_manual_review";
  errorReason?: string;
}

export interface SyntheticEnquiry extends EnquiryInput {
  id: string;
  label?: string;
}
