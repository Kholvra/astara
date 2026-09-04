# REQ-016 — Route Comprehension User Validation — Requirement

## Metadata

```yaml
id: REQ-016
slug: route-comprehension-validation
type: spike
status: ready
priority: high
size: M
depends_on: [REQ-001, REQ-005, REQ-012, REQ-013, REQ-015]
related_to: [REQ-006, REQ-014]
profile: product-app
links: {}
```

## Summary

Astara needs manual user evidence that people can plan and understand a representative TransJakarta journey, reproduce the key route facts, interpret uncertainty, and recover from failure before the MVP explanation is treated as ready.

## Actors / consumers

- Primary actor: Astara product/design team running moderated or documented manual sessions.
- Participants: approved representative travelers, including relevant mobility/accessibility perspectives.
- Consumers: product scope decision, design iteration, and engineering handoff.

## Scope

### In scope

- Define a reproducible manual validation plan with approved participant cohort, journey cases, tasks, environment, and moderator script.
- Test origin/destination search, timing assumptions, primary route choice, route-card comprehension, map/card relationship, status language, and recovery behavior.
- Measure whether participants can reproduce approved key route facts, complete the planning task, identify uncertainty, and recover from a failed/limited state.
- Use the working baseline of at least 4 of 5 participants reproducing key route facts in under one minute for approved scenarios.
- Record failure categories, accessibility observations, quotes/notes as permitted, and an explicit proceed/iterate/stop recommendation.
- Keep the evidence report separate from production analytics implementation.
- Run the primary study on a low-end mobile baseline with a 360–412px viewport and ordinary mobile network conditions.

### Explicitly out of scope

- Selecting or building a routing engine; see REQ-006.
- Fixing UI, map, copy, or routing defects discovered by the study.
- Certifying full accessibility, route correctness, or network coverage from a small sample.
- Production event analytics, user profiling, login, or persistent research data beyond the approved study record.

## Constraints & invariants

- Cases must include at least one transfer and one uncertainty/limitation scenario in addition to an approved direct journey.
- “Correct understanding” is scored against explicit route facts, not participant confidence alone.
- The cohort and accessibility conclusions must be bounded by the participants actually tested.
- Timing comprehension is limited to the local depart-at input approved for the MVP; arrive-by behavior is not evaluated.
- Preference comprehension is limited to the fixed route-selection explanation; no user-selectable preference is evaluated in the MVP study.
- The result must distinguish product comprehension failures from underlying route/data/map defects.
- Manual research notes and any anonymized event data follow the approved privacy/consent boundary.
- The 4-of-5 participant result is a release gate only for the tested contest/demo scenarios; it does not certify the full network.
- For the contest, a participant passes a scenario by reproducing at least four of five facts—service/direction, boarding/alighting, transfer, timing/interval, and limitation—within 60 seconds, including mandatory scenario facts. The 4-of-5 participant result gates only the tested demo scenarios.

## Behavior / rules

1. Approve the five-participant cohort, representative cases, tasks, success rubric, time measurement, and low-end mobile environment before sessions.
2. Run the actual vertical slice represented by REQ-001, REQ-005, REQ-012, and REQ-015.
3. Ask participants to state key facts such as service/direction, boarding/alighting, transfer, timing/interval, and data limitation without leading them.
4. Record completion time, correct/incorrect facts, recovery action, observed confusion, and accessibility barriers by case in anonymized notes owned by the Astara developer/project owner.
5. Analyze failures by input, timing, route choice, transfer, card content, map interpretation, status language, and recovery.
6. Publish a bounded evidence report and explicit proceed/iterate/stop recommendation. If a tested demo scenario misses the 4-of-5 gate, fix the issue or remove/narrow that claim; do not silently reinterpret the result as a universal quality claim.

## Success

The team has a reviewed study report showing whether the approved participant/case set met the working comprehension baseline, what failed, and which product/engineering decisions follow. The report makes clear what was and was not tested.

## Edge cases

- Participant chooses a wrong direction but understands the route card, treats an interval as exact, misses an unknown-access warning, cannot use the map, encounters a no-route/error state, or needs assistive technology.

## Decision references

- REQ-016 discussion OQ-001 through OQ-004 are closed by D-003–D-007; the timing flow follows REQ-013 D-003 and the no-preference scope follows REQ-013 D-004.
- REQ-006 owns routing correctness; REQ-005 owns technical map performance/accessibility evidence.
