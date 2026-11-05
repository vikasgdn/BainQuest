# BrainQuest

Phase 8 Parent area. React Native Community CLI, Android first.
The app includes local persistence, onboarding, category MCQ practice and results,
plus a daily round with five knowledge questions, four generated patterns and one
memory activity. Daily plans and question snapshots persist before play; reopening
the same day resumes the round or shows its saved result. Memory timers pause in
background. Progress shows persisted XP, levels, streaks, lifetime category accuracy, badges and recent completed sessions. The Parent area includes a randomized adult gate, learning report, device settings, privacy information and confirmed local profile deletion.

See [Phase 8 verification](docs/phase-8-verification.md) for scope and checks.

## Toolchain

- Node **24.7.0** (`nvm install && nvm use`); npm **11.5.1**. Use npm only and commit `package-lock.json`.
- React Native **0.87.1**, React **19.2.3**, Hermes and the New Architecture.
- Android: JDK **17**, Gradle **9.4.1**, Kotlin **2.2.0**, SDK platform **37**,
  SDK Manager package `platforms;android-37.0`, Android Gradle Plugin **9.2.1**,
  Build Tools **37.0.0**, NDK **27.1.12297006**. Minimum API **26**, target API **36**.
- Application ID / provisional iOS bundle ID: `com.brainquest.kids`; display name: BrainQuest.
- iOS: **15.1** minimum, Xcode **16.1** minimum, as specified by the installed
  React Native 0.87 pod helpers. iOS dependencies
  and builds were deliberately deferred. No CocoaPods or Ruby gems were installed.

## Install and develop

```sh
nvm install
nvm use
npm ci
npm start
# In another terminal, with an emulator or USB-debugging device connected:
npm run android
```

Install Android Studio, JDK 17 and the SDK components listed above. Set `ANDROID_HOME`
to your SDK directory (on macOS, `$HOME/Library/Android/sdk`), and add its
`platform-tools` to `PATH`. The first build needs network access for Gradle, Maven
artifacts and missing SDK components. Accept Android SDK licenses using SDK Manager.

```sh
npm run android:build
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk` and uses Metro.
For an installable standalone release APK, see [local release signing](docs/android-release-apk.md).
The signing script retains its private local key outside Git for future updates.
Only debug declares Internet permission. `cd android && ./gradlew assembleInternal`
creates a bundled, release-like internal build with the `.internal` application ID
suffix and the public development signing key; it must never be published to stores.
The internal variant has not been built in this phase. Release is unsigned until publisher signing
is configured; the template's debug signing was removed from release. Native screens'
fragment restoration factory is configured in MainActivity. No application secrets
are stored in the repository; `debug.keystore` is the public template development key.

## iOS setup (deferred)

The CLI-generated `ios/` project and Podfile are retained for future shared-code work.
The iOS platform CLI package is intentionally not installed. On a future authorized
iOS setup task, install the matching `@react-native-community/cli-platform-ios@20.2.0`,
check the React Native 0.87 Xcode/iOS requirements, configure Xcode and Ruby/Bundler,
then run `bundle install`, `cd ios && bundle exec pod install`, and `npm run ios`.
These commands have not been run in Phase 0. The iOS script will not work until that setup.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
npm run check
npm run format
npm run android:build
```

GitHub Actions runs the JavaScript checks and Android debug build. CI assumes this
application directory is the repository root when published. CI has not been executed
remotely. Tests exercise real root navigation/provider rendering and error containment;
Jest uses library-provided native test support, which does not substitute for device QA.
Testing Library 14 uses async rendering and `test-renderer` 1.2.0, pinned to stay
compatible with React 19.2 (renderer 1.3 requires React 19.3 through its reconciler).

## Architecture

- `src/app`: composition, providers, error boundary and typed root navigation.
- `src/domain/{models,policies,repositories,use-cases}`: pure TypeScript contracts, puzzle generators
  and rules. No React Native, infrastructure or UI imports.
- `src/infrastructure/{content,database,storage}`: SQLite persistence, content import and MMKV settings adapters behind
  `DatabaseDriver` and `KeyValueStore` interfaces.
- `src/design-system`: shared theme tokens and a safe-area-aware scrolling ScreenContainer.
- `src/features/{onboarding,home,game,progress,parent}`: onboarding, Home, category practice, game and result UI.
- `src/shared`: framework-independent services, clocks and deterministic randomness.

`@/` resolves to `src/` in TypeScript, Babel/Metro and Jest. ESLint restricts imports
across the domain, feature and infrastructure boundaries. Gesture Handler wraps the
root, Safe Area provides insets, and React Navigation uses the app theme. Worklets'
Babel plugin is last, as required by Reanimated. Zustand and Zod need no global provider;
they are installed for subsequent typed stores and runtime validation, with no artificial
state or content introduced in Phase 0.

## Dependency decisions

Runtime versions are pinned in `package.json`; the npm lockfile records the complete tree.

| Dependency                                                                  | Purpose                                  |
| --------------------------------------------------------------------------- | ---------------------------------------- |
| React 19.2.3 / React Native 0.87.1                                          | Official native application runtime      |
| React Navigation native 7.4.1 / native-stack 7.19.2                         | Typed root navigation                    |
| Screens 4.28.0                                                              | Native-stack native views                |
| Gesture Handler 3.3.0                                                       | Native gesture root                      |
| Safe Area Context 5.10.0                                                    | Insets for phones and tablets            |
| Reanimated 4.7.0 / Worklets 0.13.0                                          | Compatible animation toolchain           |
| Zustand 5.0.15                                                              | Future feature state                     |
| Zod 4.6.5                                                                   | Future runtime validation                |
| React Native Nitro SQLite / Nitro Modules                                   | On-device relational persistence         |
| React Native MMKV                                                           | Small non-sensitive application settings |
| TypeScript, ESLint, Prettier                                                | Strict types, boundaries and formatting  |
| Jest, RN Jest preset, Testing Library 14.0.1, test-renderer 1.2.0           | Component and integration tests          |
| Babel module resolver                                                       | Runtime `@/` aliases                     |
| Community CLI, RN Babel/Metro/TS/ESLint presets, Babel and type definitions | Official template build tooling          |

Official references checked during setup:
[React Native versions](https://reactnative.dev/versions),
[environment setup](https://reactnative.dev/docs/set-up-your-environment),
[Reanimated compatibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/),
[Reanimated Jest setup](https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/),
[React Navigation setup](https://reactnavigation.org/docs/getting-started/).

The CLI template retains ESLint 8 and Prettier 2. npm reports deprecated transitive
tooling; no automatic dependency upgrades were applied. Production signing, internal
release distribution, iOS toolchain validation and store policy review are future work.
See `docs/phase-0-verification.md` for this implementation's command results and
`docs/phase-0-files.txt` for the complete source/configuration file inventory.
