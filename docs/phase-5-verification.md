# Phase 5: puzzle engine

Implemented 26 September 2026 against sections 7 and 16 of the technical guide.
Existing onboarding, MCQ runtime and seven pattern generators were retained.

## Changes

- Added `MemoryObjectsGenerator`: deterministic ordered sets of 4, 6 or 9
  uniquely labeled objects, a position question and three distinct distractors.
  Output includes generator ID, version and seed for subsequent persistence integration.
- Made memory presentation a discriminated union with typed objects and target position.
- Added a pure immutable memory runtime: INTRO → MEMORIZE → HIDDEN → QUESTION →
  FEEDBACK → COMPLETE. Memorization lasts 8/6/5 seconds by age band, extended by
  50 percent when requested. Background ticks do not consume memorization time.
  Invalid answers and timer values are rejected; repeated submissions cannot change
  feedback. Presentation omits hidden objects and withholds answer keys until feedback.
- Updated README to reflect current repository progress.

## Verification

Using Node 24.7.0, `npm run check` passed: typecheck, lint, formatting and all
9 Jest suites / 57 tests. The seven existing pattern generators each passed
10,000-seed checks. Memory passed 10,000 seeds for each of all three difficulties,
including determinism, uniqueness, object counts and independently checked answers.
Runtime tests cover timing boundaries, extended time, hidden presentation,
background behavior, wrong-answer feedback, invalid input and duplicate actions.

The existing App test emits overlapping `act()` warnings despite passing.
Node also emits its experimental SQLite warning.

## Scope and follow-up

Phase 6 is Daily 10: integrate generated items into persisted session plans and
attempts, render pattern/memory activities, wire lifecycle events into memory timing,
and verify stable same-day resume and streak behavior. This phase adds the engine;
it does not expose memory play through navigation yet. Device TalkBack and lifecycle
QA therefore remain pending alongside that integration. No dependencies, native
configuration, schema, permissions or external services were added.
