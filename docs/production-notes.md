# Production Notes — What Breaks First

## What would break first in production?

1. **Ambiguous multi-service enquiries.** Clients often describe problems that span Strategy and Operations, or Technology and Compliance. The LLM may pick one service line confidently but wrong. At 40–60 enquiries/week, this is the highest-volume failure mode. The keyword fallback handles this even worse — it scores each service line independently and can't reason about multi-service scope.

2. **Intake review queue bottleneck.** Complex enquiries, high-urgency moderate cases, and low-confidence classifications all route to the intake review queue. If the queue fills up (currently seeded with 4 pre-existing reviews), new enquiries pile up while the 4-hour SLA clock ticks. The dashboard tracks this queue's utilization, but there's no auto-scaling of reviewer capacity.

3. **Load balancing drift.** The in-memory team load tracking resets on serverless cold starts. On Vercel, each invocation re-seeds synthetic data but loses any assignments from the current session. Two concurrent requests could route to the same team because they see stale load state. Production needs Redis or a database for shared state.

4. **Confidence miscalibration.** The LLM's self-reported confidence doesn't always correlate with actual accuracy. The keyword fallback caps confidence at 65%, which means even a strong keyword match never auto-routes with high confidence. The 60% auto-route threshold for keyword classifications is a starting point — it needs calibration against override data.

5. **Form schema drift.** If marketing adds fields (budget, geography, referral source) or changes company-size buckets, the prompt and rules engine won't use them until updated. Classifications will silently ignore useful signal.

## What to monitor

| Signal | Action threshold |
|--------|------------------|
| **Override rate** (human changes classification) | > 20% weekly → review prompt, rules, or keyword thresholds |
| **Intake review queue depth** | > 15 pending → add analyst capacity or tighten auto-route rules |
| **Intake review queue utilization** | > 85% → the queue is a bottleneck; escalate to management |
| **Team utilization imbalance** | Any team > 90% while sibling teams < 50% → rebalance capacity ratings or team count |
| **Fallback rate** | > 5% → check LLM health, increase timeout, or add retry |
| **Keyword auto-route rate** | Track how often keyword fallback auto-routes (confidence > 60%) vs routes to review; tune threshold accordingly |
| **SLA misses by team** | Any team consistently missing SLA → investigate capacity or assignment rules |
| **Confidence vs accuracy** | Quarterly calibration: plot confidence deciles against override rate, separately for LLM and keyword paths |

## Fallback when the model gets it wrong

The system implements a three-tier fallback (see [`lib/triage.ts`](../lib/triage.ts)):

1. **LLM classification with review triggers** → if the LLM sets `needsHumanReview=true`, or the enquiry is complex, or it's high-urgency moderate complexity, route to the intake review queue. The intake review queue is now a tracked entity with its own capacity (15 slots) and utilization metric displayed on the dashboard. SLA: 4 hours.

2. **LLM parse failure or timeout** → keyword-based classifier ([`lib/fallback.ts`](../lib/fallback.ts)) takes over. If keyword confidence > 60%, it **auto-routes** to the least-loaded team (no human review). If keyword confidence ≤ 60%, it routes to human review with the keyword's suggested service line, complexity, and confidence embedded in the reasoning — giving the reviewer a concrete starting point rather than a blank slate.

3. **Total failure** (no keywords matched, API down) → `pending_manual_review` status with a zero-confidence manual review classification. The enquiry is never silently dropped.

**Production additions:**
- Capture every override in an audit table: `{ enquiryId, original, corrected, reviewerId, timestamp }`.
- Feed corrections into weekly prompt reviews or monthly fine-tuning.
- After ~200 labelled overrides, train a lightweight classifier for 70–80% of volume, reserving the LLM for edge cases.
- Track keyword auto-route accuracy separately — if the 60% threshold produces too many misroutes, raise it; if it's too conservative, lower it.
- Monitor intake review queue depth as a leading indicator. If it consistently runs above 80% utilization, the review step itself becomes the bottleneck and needs either more reviewers or tighter auto-route rules.
