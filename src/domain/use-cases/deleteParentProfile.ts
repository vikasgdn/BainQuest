import type { AppServices } from '../../shared/AppServices';
import type { ParentGate } from './ParentGate';

/** Clear selection after SQLite deletion; startup repairs a stale selection if settings fail. */
export async function deleteParentProfile(
  services: AppServices,
  gate: ParentGate,
  profileId: string,
): Promise<void> {
  if (!gate.unlocked) throw new Error('Parent gate required');
  const settings = services.settings.get();
  if (settings.selectedProfileId !== profileId)
    throw new Error('Selected profile changed');
  await services.childProfiles.delete(profileId);
  services.settings.set({
    ...services.settings.get(),
    selectedProfileId: null,
    onboardingCompleted: false,
  });
  gate.lock();
}
