import type {
  Classification,
  Complexity,
  EnquiryInput,
  Priority,
  RoutingResult,
  ServiceLine,
} from "./types";

const INTAKE_REVIEW_QUEUE = "intake-review@firm.com";

const TEAM_LEADS: Record<
  ServiceLine,
  Record<Complexity, string>
> = {
  Strategy: {
    simple: "alice.chen@firm.com",
    moderate: "bob.martinez@firm.com",
    complex: "carol.williams@firm.com",
  },
  Operations: {
    simple: "dan.kim@firm.com",
    moderate: "elena.rodriguez@firm.com",
    complex: "frank.obrien@firm.com",
  },
  Technology: {
    simple: "grace.patel@firm.com",
    moderate: "henry.nguyen@firm.com",
    complex: "isabel.torres@firm.com",
  },
  Compliance: {
    simple: "james.foster@firm.com",
    moderate: "karen.singh@firm.com",
    complex: "liam.campbell@firm.com",
  },
  "HR Advisory": {
    simple: "maria.gonzalez@firm.com",
    moderate: "nathan.brooks@firm.com",
    complex: "olivia.hayes@firm.com",
  },
};

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
  if (classification.confidence < 0.7) return true;
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
    return {
      assignedTeamLead: INTAKE_REVIEW_QUEUE,
      slaHours: 4,
      priority: "normal",
      routeToIntakeReview: true,
    };
  }

  const assignedTeamLead =
    TEAM_LEADS[classification.serviceLine][classification.complexity];
  const slaHours = Math.round(
    BASE_SLA_HOURS[classification.complexity] * urgencyBoost(input.urgency),
  );

  return {
    assignedTeamLead,
    slaHours,
    priority: derivePriority(
      input.urgency,
      classification.complexity,
      routeToIntakeReview,
    ),
    routeToIntakeReview: false,
  };
}
