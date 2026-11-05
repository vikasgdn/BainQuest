# Local Android release APK

This build contains the Phase 8 app and bundles JavaScript and Hermes bytecode;
Metro is not required. The application ID is `com.brainquest.kids`, version 1.0
(code 1), minimum Android API 26. It targets all four configured ABIs.

## Build and sign

Use the project's Node 24.7.0 environment and installed JDK 17/Android SDK:

```sh
nvm use
cd android
./gradlew :app:assembleRelease
cd ..
python3 scripts/sign-release-apk.py
```

The installable APK is `artifacts/BrainQuest-1.0-release.apk`. Gradle's
`app-release-unsigned.apk` remains unsigned; distribute the APK in `artifacts`.
The signing script verifies the signature and 16 KB ZIP alignment before success.

The first signing run creates a private RSA 3072 local release key and a random
password under `.android-signing/`; subsequent runs reuse them. The directory and
APK artifacts are ignored by Git. Back up the entire signing directory securely:
future updates must use the same signing key. This is a local distribution key;
Google Play upload signing and store publication have not been configured.

An installed debug build uses a different signing certificate, so this APK cannot
update it in place. Removing that build before installing this one deletes its
local profiles and progress. No installed app is automatically removed by this
build process.

## Verification

Pending build and APK verification.
