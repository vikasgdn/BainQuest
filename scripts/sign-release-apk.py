#!/usr/bin/env python3
"""Sign the assembled release APK with a persistent, private local release key."""
import os
from pathlib import Path
import secrets
import subprocess

ROOT = Path(__file__).resolve().parents[1]
UNSIGNED = ROOT / 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
SIGNING = ROOT / '.android-signing'
ARTIFACTS = ROOT / 'artifacts'
SDK = Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or Path.home() / 'Library/Android/sdk')
TOOLS = SDK / 'build-tools/37.0.0'
PASSWORD = SIGNING / 'keystore.password'
KEYSTORE = SIGNING / 'brainquest-release.keystore'
OUTPUT = ARTIFACTS / 'BrainQuest-1.0-release.apk'


def run(*args):
    subprocess.run([str(arg) for arg in args], check=True)


def main():
    if not UNSIGNED.is_file():
        raise SystemExit('Build first: cd android && ./gradlew assembleRelease')
    if not all((TOOLS / tool).is_file() for tool in ('zipalign', 'apksigner')):
        raise SystemExit('Android SDK Build Tools 37.0.0 required; set ANDROID_HOME.')
    SIGNING.mkdir(mode=0o700, exist_ok=True)
    SIGNING.chmod(0o700)
    if KEYSTORE.exists() and not PASSWORD.exists():
        raise SystemExit('Signing password missing. Restore it; the existing key will not be replaced.')
    if not PASSWORD.exists():
        with PASSWORD.open('x', opener=lambda path, flags: os.open(path, flags, 0o600)) as stream:
            stream.write(secrets.token_urlsafe(48) + '\n')
    PASSWORD.chmod(0o600)
    if not KEYSTORE.exists():
        run('keytool', '-genkeypair', '-keystore', KEYSTORE, '-storetype', 'PKCS12',
            '-storepass:file', PASSWORD, '-keypass:file', PASSWORD,
            '-alias', 'brainquest-release', '-keyalg', 'RSA', '-keysize', '3072',
            '-validity', '10000', '-dname', 'CN=BrainQuest Local Release', '-noprompt')
    KEYSTORE.chmod(0o600)
    ARTIFACTS.mkdir(exist_ok=True)
    aligned = UNSIGNED.with_name('app-release-aligned.apk')
    run(TOOLS / 'zipalign', '-P', '16', '-f', '4', UNSIGNED, aligned)
    run(TOOLS / 'apksigner', 'sign', '--ks', KEYSTORE,
        '--ks-key-alias', 'brainquest-release', '--ks-pass', f'file:{PASSWORD}',
        '--key-pass', f'file:{PASSWORD}', '--out', OUTPUT, aligned)
    run(TOOLS / 'apksigner', 'verify', '--verbose', '--print-certs', OUTPUT)
    run(TOOLS / 'zipalign', '-c', '-P', '16', '4', OUTPUT)
    print(f'Installable release APK: {OUTPUT}')
    print('Back up .android-signing securely; the same key is required for future app updates.')


if __name__ == '__main__':
    main()
