export type AppSettings = Readonly<{
  onboardingCompleted: boolean;
  selectedProfileId: string | null;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  reducedMotion: boolean;
  extendedTime: boolean;
}>;
