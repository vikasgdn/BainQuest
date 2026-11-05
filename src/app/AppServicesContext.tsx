import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import type { AppServices } from './bootstrap/types';

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({
  services,
  children,
}: PropsWithChildren<{ services: AppServices }>) {
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('App services are unavailable.');
  return services;
}
