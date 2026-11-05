# Phase 7: Progress

Implemented 5 November 2026 against the guide’s Progress screen and Phase 7 scope.

## Changes

- Replaced the Progress placeholder with a screen for saved XP, level, next-level
  progress, daily streak and best streak. The level bar starts at the current
  level’s XP threshold (zero for level 1), using the existing progression policy.
- Added a transactional progress summary query. Lifetime answer counts and category
  accuracy use all persisted attempts, including unfinished rounds; they do not use
  the 200-attempt adaptation window. Completed-session counts use completed rows.
- Shows all five categories with an explicit unplayed state, seven catalog badges
  with earned dates and expandable requirements, and the latest 20 completed
  sessions with correct counts, score and awarded XP. History is newest first,
  with deterministic ordering when completion timestamps match.
- Refreshes on navigation focus and provides loading, empty and retry states.
  Streak values are explicitly labeled as of the last completed Daily 10, matching
  the existing persisted streak policy. Text scales and cards scroll without fixed
  text heights. No database migrations, new dependencies or reward writes added.

## Verification

- Node 24.7.0: `npm run check` passed TypeScript, ESLint, formatting and Jest
  (12 suites / 75 tests).
- Progress tests cover 205 saved answers beyond the adaptation limit, profile
  isolation, 21 completed sessions with a 20-result history cap, deterministic
  ordering, earned badges, retrying completion without duplicate rewards, and
  populated/empty UI, badge details and recovery after a failed read.
- `cd android && ./gradlew assembleDebug`: passed (409 actionable tasks).
  Gradle required access to its cache outside the workspace; existing Gradle
  deprecation warnings remain. Debug uses Metro to serve JavaScript.
- Existing App test `act()` warnings and Node experimental SQLite warning remain.

## Remaining manual checks

Android phone/tablet, TalkBack, large-font and process restart walkthroughs remain
pending for this screen. iOS is out of scope. Phase 8 is the protected Parent area.
