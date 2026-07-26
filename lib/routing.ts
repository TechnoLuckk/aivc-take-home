import type {
  Classification,
  Complexity,
  EnquiryInput,
  Priority,
  RoutingResult,
  ServiceLine,
} from "./types";
import { getLoadBalancedTeam, addAssignment, addIntakeReviewAssignment } from "./teams";

const INTAKE_REVIEW_QUEUE = "intake-review@firm.com";

const BASE_SLA_HOURS: Record<Complexity, number> = {
  simple: 48,
  moderate: 24,
  complex: 8,
};

function urgencyBoost(urgency: EnquiryInput["urgency"]): number {
  switch (urgency) {
    case "high":
      return 0.5;
    case "medium":
      return 0.75;
    default:
      return 1;
  }
}

function derivePriority(
  urgency: EnquiryInput["urgency"],
  complexity: Complexity,
  routeToIntakeReview: boolean,
): Priority {
  if (routeToIntakeReview) return "normal";
  if (urgency === "high" && complexity !== "simple") return "urgent";
  if (urgency === "high" || complexity === "complex") return "high";
  if (urgency === "medium" || complexity === "moderate") return "normal";
  return "low";
}

export function shouldRouteToIntakeReview(
  classification: Classification,
  input: EnquiryInput,
): boolean {
  if (classification.needsHumanReview) return true;
  if (classification.complexity === "complex") return true;
  if (input.urgency === "high" && classification.complexity === "moderate") {
    return true;
  }
  return false;
}

export function applyRoutingRules(
  classification: Classification,
  input: EnquiryInput,
): RoutingResult {
  const routeToIntakeReview = shouldRouteToIntakeReview(classification, input);

  if (routeToIntakeReview) {
    addIntakeReviewAssignment(
      classification.complexity,
      derivePriority(input.urgency, classification.complexity, true),
      input.description,
    );
    return {
      assignedTeamLead: INTAKE_REVIEW_QUEUE,
      assignedTeamId: "intake-review",
      assignedTeamName: "Intake Review Queue",
      slaHours: 4,
      priority: "normal",
      routeToIntakeReview: true,
    };
  }

  const team = getLoadBalancedTeam(classification.serviceLine);

  addAssignment(
    team.id,
    classification.complexity,
    derivePriority(input.urgency, classification.complexity, false),
    input.description,
  );

  const slaHours = Math.round(
    BASE_SLA_HOURS[classification.complexity] * urgencyBoost(input.urgency),
  );

  return {
    assignedTeamLead: team.teamLead,
    assignedTeamId: team.id,
    assignedTeamName: team.name,
    slaHours,
    priority: derivePriority(
      input.urgency,
      classification.complexity,
      routeToIntakeReview,
    ),
    routeToIntakeReview: false,
  };
}
