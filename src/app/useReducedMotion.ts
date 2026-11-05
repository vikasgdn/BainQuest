import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { AppSettingsReader } from '@/shared/AppServices';

export function useReducedMotion(settings: AppSettingsReader): boolean {
  const [preferred, setPreferred] = useState(
    () => settings.get().reducedMotion,
  );
  const [system, setSystem] = useState(false);
  useEffect(
    () => settings.subscribe(next => setPreferred(next.reducedMotion)),
    [settings],
  );
  useEffect(() => {
    let active = true;
    let eventReceived = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      value => {
        eventReceived = true;
        setSystem(value);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active && !eventReceived) setSystem(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return preferred || system;
}
