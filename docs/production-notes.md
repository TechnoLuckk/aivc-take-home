# Production Notes — What Breaks First

## What would break first in production?

1. **Ambiguous multi-service enquiries.** Clients often describe problems that span Strategy and Operations, or Technology and Compliance. The model may pick one service line confidently but wrong. This is the highest-volume failure mode at 40–60 enquiries/week.

2. **Form schema drift.** If marketing adds fields (budget, geography, referral source) or changes company-size buckets, the prompt and rules engine won't use them until updated. Classifications will silently ignore useful signal.

3. **Confidence miscalibration.** The LLM's self-reported confidence doesn't always correlate with actual accuracy. A fixed 0.7 threshold may over-route or under-route to human review.

4. **LLM availability and latency.** Groq outages, rate limits, or slow responses will trigger fallback classification. Keyword fallback is better than nothing but less accurate on nuanced language.

## What to monitor

| Signal | Action threshold |
|--------|------------------|
| **Override rate** (human changes classification) | > 20% weekly → review prompt and rules |
| **Review queue depth** | > 15 pending → add analyst capacity or tighten auto-route rules |
| **Fallback rate** | > 5% → check LLM health, increase timeout, or add retry |
| **SLA misses by team lead** | Any route consistently missing SLA → rebalance assignment rules |
| **Confidence vs accuracy** | Quarterly calibration: plot confidence deciles against override rate |

## Fallback when the model gets it wrong

The prototype implements a three-tier fallback (see [`lib/triage.ts`](../lib/triage.ts)):

1. **Low confidence or rule-triggered review** → route to `intake-review@firm.com` instead of a team lead. A junior analyst validates before assignment. SLA: 4 hours.

2. **LLM parse failure or timeout** → keyword-based classifier ([`lib/fallback.ts`](../lib/fallback.ts)) assigns a best-guess service line with `needsHumanReview: true`.

3. **Total failure** (no keywords matched, API down) → `pending_manual_review` status; enquiry is never silently dropped.

**Production addition:** capture every override in an audit table and feed corrections into weekly prompt reviews or monthly fine-tuning. After ~200 labelled overrides, a small classifier can handle 70–80% of volume with the LLM reserved for edge cases — reducing cost and latency while improving consistency.
