import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type LifecycleCallbacks = Readonly<{
  onBackground?: () => void;
  onForeground?: () => void;
}>;

export function AppLifecycle({
  onBackground,
  onForeground,
}: LifecycleCallbacks) {
  useEffect(() => {
    let previous = (AppState.currentState ?? 'active') as AppStateStatus;
    const subscription = AppState.addEventListener('change', next => {
      if (
        previous === 'active' &&
        (next === 'background' || next === 'inactive')
      )
        onBackground?.();
      if (
        (previous === 'background' || previous === 'inactive') &&
        next === 'active'
      )
        onForeground?.();
      previous = next;
    });
    return () => subscription.remove();
  }, [onBackground, onForeground]);
  return null;
}
