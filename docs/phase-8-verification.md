# Phase 8: Parent area

Implemented 5 November 2026 against guide sections 9 and 12 and Phase 8 scope.
Android only; iOS remains out of scope.

## Behavior

- Replaced the Parent placeholder with a randomized multiplication/subtraction gate
  and a plainly worded adult instruction. Three incorrect submissions cause a
  30-second lockout persisted in MMKV, including across navigation and process
  restart. Incorrect answers produce a new calculation with a different answer.
  Invalid/corrupt gate storage fails closed. This is adult friction, not identity
  verification. Authorization is in memory and cleared on blur, inactive/background
  events, leaving the Parent area and deletion; the gate answer is not persisted.
- The protected report shows lifetime completed sessions, saved answer counts,
  accuracy and recorded answer duration, including unfinished rounds. Duration is
  explicitly not total app usage. Topic suggestions require at least five answers
  and accuracy below 55%; no intelligence or ability score is presented.
- Settings save through the existing MMKV adapter. Extra memory time applies to
  newly created Daily 10 plans and leaves saved plans unchanged. Reduced motion
  disables native navigation transitions and respects the system preference.
  Sound and haptic preferences are explicitly described as saved preferences for
  future features: this version produces neither audio nor haptics.
- Privacy information is inside the protected area. No external policy URL,
  account, telemetry, advertising, permissions or new dependencies were added.
- Deletion requires the unlocked gate and a separate permanent-deletion confirmation
  with a cancel action. Repeated taps are guarded while deletion is pending.
  SQLite removes the profile and cascades sessions, attempts, progress and badges;
  unreferenced generated puzzle records from that profile are removed in the same
  transaction. Shared questions, the badge catalog and other profiles are retained.
  Question records referenced by other session plans or attempts are preserved.
- After SQLite commits, the selected profile and onboarding flag are cleared and
  navigation resets to onboarding, removing stale routes. Device preferences stay.
  SQLite and MMKV cannot share a transaction: if settings cleanup fails, retry is
  idempotent; startup also repairs a selected profile that no longer exists.

## Verification

- Node 24.7.0: `npm run check` passed TypeScript, ESLint, formatting and Jest
  (14 suites / 82 tests).
- Gate tests verify changing challenges, rejection of reused answers, a persisted
  30-second lockout across controller/storage recreation and corrupt-storage refusal.
- SQLite tests verify the gate requirement, lifetime report totals, rollback when
  profile deletion or generated-question cleanup fails, preservation of other
  profiles and shared content, generated-puzzle cleanup and settings-failure retry.
- Full app integration covers gate entry, recorded answer time and practice
  suggestions, saved settings, background relock, cancellation, confirmed deletion
  and navigation reset to onboarding. Reduced-motion tests cover both system and
  app preferences. Daily-plan tests cover extra time and saved-plan stability.
- `cd android && ./gradlew assembleDebug`: passed (409 actionable tasks).
  Gradle required access to its existing cache outside the workspace. Existing
  Gradle deprecation warnings remain; the debug APK uses Metro for JavaScript.
- Existing onboarding test `act()` warnings and Node experimental SQLite warnings
  remain. No test or lint rule was weakened.

## Remaining manual checks

Physical Android phone/tablet, TalkBack, large text, actual process restart during
cooldown and deletion, and OS background snapshots remain manual QA tasks. Relocking
on background does not introduce a native secure-window or screenshot prevention
feature. Production privacy policy and store policy review remain release work.
Phase 9 is polish and accessibility/device QA.
