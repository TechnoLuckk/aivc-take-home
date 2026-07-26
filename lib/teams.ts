import type {
  Complexity,
  Priority,
  ServiceLine,
  Team,
  TeamAssignment,
  TeamLoad,
} from "./types";
import { COMPLEXITY_WEIGHT } from "./types";

const TEAMS: Team[] = [
  // Strategy
  { id: "strat-alpha", name: "Strategy Alpha", serviceLine: "Strategy", teamLead: "alice.chen@firm.com", capacity: 10 },
  { id: "strat-beta", name: "Strategy Beta", serviceLine: "Strategy", teamLead: "bob.martinez@firm.com", capacity: 10 },
  { id: "strat-gamma", name: "Strategy Gamma", serviceLine: "Strategy", teamLead: "carol.williams@firm.com", capacity: 8 },
  // Operations
  { id: "ops-alpha", name: "Operations Alpha", serviceLine: "Operations", teamLead: "dan.kim@firm.com", capacity: 10 },
  { id: "ops-beta", name: "Operations Beta", serviceLine: "Operations", teamLead: "elena.rodriguez@firm.com", capacity: 10 },
  { id: "ops-gamma", name: "Operations Gamma", serviceLine: "Operations", teamLead: "frank.obrien@firm.com", capacity: 8 },
  // Technology
  { id: "tech-alpha", name: "Technology Alpha", serviceLine: "Technology", teamLead: "grace.patel@firm.com", capacity: 10 },
  { id: "tech-beta", name: "Technology Beta", serviceLine: "Technology", teamLead: "henry.nguyen@firm.com", capacity: 10 },
  { id: "tech-gamma", name: "Technology Gamma", serviceLine: "Technology", teamLead: "isabel.torres@firm.com", capacity: 8 },
  // Compliance
  { id: "comp-alpha", name: "Compliance Alpha", serviceLine: "Compliance", teamLead: "james.foster@firm.com", capacity: 10 },
  { id: "comp-beta", name: "Compliance Beta", serviceLine: "Compliance", teamLead: "karen.singh@firm.com", capacity: 10 },
  { id: "comp-gamma", name: "Compliance Gamma", serviceLine: "Compliance", teamLead: "liam.campbell@firm.com", capacity: 8 },
  // HR Advisory
  { id: "hr-alpha", name: "HR Advisory Alpha", serviceLine: "HR Advisory", teamLead: "maria.gonzalez@firm.com", capacity: 10 },
  { id: "hr-beta", name: "HR Advisory Beta", serviceLine: "HR Advisory", teamLead: "nathan.brooks@firm.com", capacity: 10 },
  { id: "hr-gamma", name: "HR Advisory Gamma", serviceLine: "HR Advisory", teamLead: "olivia.hayes@firm.com", capacity: 8 },
];

const INTAKE_REVIEW_TEAM: Team = {
  id: "intake-review",
  name: "Intake Review Queue",
  serviceLine: "Strategy",
  teamLead: "intake-review@firm.com",
  capacity: 15,
};

const assignments: Map<string, TeamAssignment[]> = new Map();

function ensureTeamInitialized(teamId: string): void {
  if (!assignments.has(teamId)) {
    assignments.set(teamId, []);
  }
}

export function getTeamsForServiceLine(serviceLine: ServiceLine): Team[] {
  return TEAMS.filter((t) => t.serviceLine === serviceLine);
}

export function getTeamById(teamId: string): Team | undefined {
  if (teamId === INTAKE_REVIEW_TEAM.id) return INTAKE_REVIEW_TEAM;
  return TEAMS.find((t) => t.id === teamId);
}

export function getAllTeams(): Team[] {
  return [...TEAMS];
}

export function getTeamAssignments(teamId: string): TeamAssignment[] {
  ensureTeamInitialized(teamId);
  return [...assignments.get(teamId)!];
}

export function addAssignment(
  teamId: string,
  complexity: Complexity,
  priority: Priority,
  description: string,
): void {
  ensureTeamInitialized(teamId);
  assignments.get(teamId)!.push({
    teamId,
    complexity,
    priority,
    description,
    assignedAt: new Date().toISOString(),
  });
}

export function addIntakeReviewAssignment(
  complexity: Complexity,
  priority: Priority,
  description: string,
): void {
  addAssignment(INTAKE_REVIEW_TEAM.id, complexity, priority, description);
}

export function getTeamLoad(teamId: string): TeamLoad {
  const team = getTeamById(teamId);
  if (!team) throw new Error(`Team ${teamId} not found`);

  ensureTeamInitialized(teamId);
  const teamAssignments = assignments.get(teamId)!;
  const currentLoad = teamAssignments.reduce(
    (sum, a) => sum + COMPLEXITY_WEIGHT[a.complexity],
    0,
  );
  const maxLoad = team.capacity * 3; // max weight if all slots were complex
  const utilizationPercent = Math.min(100, Math.round((currentLoad / maxLoad) * 100));

  return {
    team,
    assignments: teamAssignments,
    currentLoad,
    utilizationPercent,
  };
}

export function getAllTeamLoads(): TeamLoad[] {
  const loads = TEAMS.map((t) => getTeamLoad(t.id));
  loads.push(getTeamLoad(INTAKE_REVIEW_TEAM.id));
  return loads;
}

export function getLoadBalancedTeam(serviceLine: ServiceLine): Team {
  const candidates = getTeamsForServiceLine(serviceLine);

  let bestTeam = candidates[0];
  let bestUtilization = Infinity;

  for (const team of candidates) {
    const load = getTeamLoad(team.id);
    if (load.utilizationPercent < bestUtilization) {
      bestUtilization = load.utilizationPercent;
      bestTeam = team;
    }
  }

  return bestTeam;
}

export function resetAssignments(): void {
  assignments.clear();
  seedSyntheticLoad();
}

function seedSyntheticLoad(): void {
  const now = new Date();

  const seeds: {
    teamId: string;
    complexity: Complexity;
    priority: Priority;
    description: string;
    daysAgo: number;
  }[] = [
    // Strategy Alpha: moderately busy
    { teamId: "strat-alpha", complexity: "moderate", priority: "normal", description: "Market positioning review for Series B startup", daysAgo: 5 },
    { teamId: "strat-alpha", complexity: "simple", priority: "low", description: "Competitive landscape one-pager", daysAgo: 3 },
    { teamId: "strat-alpha", complexity: "moderate", priority: "high", description: "Growth strategy for new vertical", daysAgo: 1 },
    // Strategy Beta: light load
    { teamId: "strat-beta", complexity: "simple", priority: "normal", description: "Board presentation prep", daysAgo: 4 },
    // Strategy Gamma: heavy load
    { teamId: "strat-gamma", complexity: "complex", priority: "urgent", description: "M&A due diligence for $200M acquisition", daysAgo: 2 },
    { teamId: "strat-gamma", complexity: "complex", priority: "high", description: "Post-merger integration roadmap", daysAgo: 6 },
    { teamId: "strat-gamma", complexity: "moderate", priority: "normal", description: "Three-year strategic plan refresh", daysAgo: 4 },
    { teamId: "strat-gamma", complexity: "moderate", priority: "normal", description: "Market entry sizing for LATAM", daysAgo: 1 },

    // Operations Alpha: heavy load
    { teamId: "ops-alpha", complexity: "complex", priority: "high", description: "Supply chain restructuring APAC", daysAgo: 3 },
    { teamId: "ops-alpha", complexity: "moderate", priority: "normal", description: "Warehouse layout optimization", daysAgo: 5 },
    { teamId: "ops-alpha", complexity: "simple", priority: "low", description: "Procurement policy update", daysAgo: 7 },
    { teamId: "ops-alpha", complexity: "moderate", priority: "normal", description: "Lean Six Sigma training program", daysAgo: 2 },
    { teamId: "ops-alpha", complexity: "complex", priority: "urgent", description: "Emergency logistics rerouting post-disruption", daysAgo: 1 },
    // Operations Beta: moderate
    { teamId: "ops-beta", complexity: "moderate", priority: "normal", description: "KPI dashboard design for fulfillment", daysAgo: 4 },
    { teamId: "ops-beta", complexity: "simple", priority: "normal", description: "Vendor SLA review", daysAgo: 2 },
    // Operations Gamma: light
    { teamId: "ops-gamma", complexity: "simple", priority: "low", description: "Process documentation for onboarding", daysAgo: 6 },

    // Technology Alpha: moderate
    { teamId: "tech-alpha", complexity: "moderate", priority: "normal", description: "Cloud migration planning AWS", daysAgo: 3 },
    { teamId: "tech-alpha", complexity: "moderate", priority: "high", description: "API gateway modernization", daysAgo: 1 },
    // Technology Beta: heavy
    { teamId: "tech-beta", complexity: "complex", priority: "urgent", description: "Data lakehouse build on Snowflake", daysAgo: 2 },
    { teamId: "tech-beta", complexity: "complex", priority: "high", description: "Legacy mainframe decommission", daysAgo: 5 },
    { teamId: "tech-beta", complexity: "moderate", priority: "normal", description: "ML pipeline for fraud detection", daysAgo: 3 },
    { teamId: "tech-beta", complexity: "moderate", priority: "normal", description: "CRM integration with Salesforce", daysAgo: 1 },
    { teamId: "tech-beta", complexity: "simple", priority: "normal", description: "CI/CD pipeline setup", daysAgo: 4 },
    // Technology Gamma: light
    { teamId: "tech-gamma", complexity: "simple", priority: "low", description: "Internal tool UI refresh", daysAgo: 7 },

    // Compliance Alpha: moderate
    { teamId: "comp-alpha", complexity: "moderate", priority: "high", description: "GDPR remediation program", daysAgo: 2 },
    { teamId: "comp-alpha", complexity: "simple", priority: "normal", description: "Privacy policy update", daysAgo: 5 },
    // Compliance Beta: heavy
    { teamId: "comp-beta", complexity: "complex", priority: "urgent", description: "SOX 404 testing across 3 regions", daysAgo: 1 },
    { teamId: "comp-beta", complexity: "moderate", priority: "normal", description: "SOC 2 Type II audit prep", daysAgo: 4 },
    { teamId: "comp-beta", complexity: "complex", priority: "high", description: "Multi-jurisdiction regulatory review", daysAgo: 3 },
    { teamId: "comp-beta", complexity: "simple", priority: "normal", description: "Anti-bribery policy refresh", daysAgo: 6 },
    // Compliance Gamma: light
    { teamId: "comp-gamma", complexity: "simple", priority: "low", description: "Employee handbook compliance check", daysAgo: 7 },

    // HR Advisory Alpha: light
    { teamId: "hr-alpha", complexity: "simple", priority: "normal", description: "Benefits package comparison", daysAgo: 5 },
    // HR Advisory Beta: moderate
    { teamId: "hr-beta", complexity: "moderate", priority: "normal", description: "Retention program design", daysAgo: 3 },
    { teamId: "hr-beta", complexity: "moderate", priority: "high", description: "Executive comp benchmarking", daysAgo: 1 },
    { teamId: "hr-beta", complexity: "simple", priority: "normal", description: "Employee engagement survey design", daysAgo: 4 },
    // HR Advisory Gamma: heavy
    { teamId: "hr-gamma", complexity: "complex", priority: "urgent", description: "Org restructure for 800 roles across 4 countries", daysAgo: 2 },
    { teamId: "hr-gamma", complexity: "complex", priority: "high", description: "DEI program with measurable OKRs", daysAgo: 5 },
    { teamId: "hr-gamma", complexity: "moderate", priority: "normal", description: "Talent acquisition workflow redesign", daysAgo: 3 },

    // Intake Review Queue: moderate backlog
    { teamId: "intake-review", complexity: "complex", priority: "normal", description: "Ambiguous AI + compliance enquiry needs service line disambiguation", daysAgo: 1 },
    { teamId: "intake-review", complexity: "moderate", priority: "normal", description: "Low-confidence multi-service post-merger integration", daysAgo: 2 },
    { teamId: "intake-review", complexity: "simple", priority: "normal", description: "Vague one-liner requiring follow-up before routing", daysAgo: 3 },
    { teamId: "intake-review", complexity: "complex", priority: "normal", description: "High-urgency cybersecurity assessment with cross-service scope", daysAgo: 1 },
  ];

  for (const seed of seeds) {
    const assignedAt = new Date(now.getTime() - seed.daysAgo * 86400000).toISOString();
    ensureTeamInitialized(seed.teamId);
    assignments.get(seed.teamId)!.push({
      teamId: seed.teamId,
      complexity: seed.complexity,
      priority: seed.priority,
      description: seed.description,
      assignedAt,
    });
  }
}

// Seed on module load
seedSyntheticLoad();
