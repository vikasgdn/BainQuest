import React from 'react';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AppProviders } from '@/app/providers/AppProviders';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { BootstrapGate } from '@/app/bootstrap/BootstrapGate';
import { AppServicesProvider } from '@/app/AppServicesContext';
import { AppLifecycle } from '@/app/AppLifecycle';
import type { BootstrapDependencies } from '@/app/bootstrap/BootstrapCoordinator';
export default function App({
  bootstrapDependencies,
}: Readonly<{ bootstrapDependencies?: BootstrapDependencies }> = {}) {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BootstrapGate dependencies={bootstrapDependencies}>
          {(state, services) => (
            <AppServicesProvider services={services}>
              <AppLifecycle />
              <RootNavigator bootstrap={state} />
            </AppServicesProvider>
          )}
        </BootstrapGate>
      </AppProviders>
    </ErrorBoundary>
  );
}
