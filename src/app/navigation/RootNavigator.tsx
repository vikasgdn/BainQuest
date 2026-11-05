import { ParentScreen } from '@/features/parent/ParentScreen';
import { useReducedMotion } from '@/app/useReducedMotion';
import React from 'react';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PlaceholderScreen } from '@/features/placeholders/PlaceholderScreen';
import { CategoryScreen } from '@/features/game/CategoryScreen';
import { DailyScreen } from '@/features/game/DailyScreen';
import { GameScreen } from '@/features/game/GameScreen';
import { ResultScreen } from '@/features/game/ResultScreen';
import type { BootstrapState } from '@/app/bootstrap/types';
import type { SessionResult } from '@/domain/models/types';
import { useAppServices } from '@/app/AppServicesContext';
export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Daily10: undefined;
  Category: undefined;
  Progress: undefined;
  Parent: undefined;
  Game: { sessionId: string };
  Result: { result: SessionResult };
};
const Stack = createNativeStackNavigator<RootStackParamList>();
type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
function HomeRoute({ navigation }: HomeProps) {
  const services = useAppServices();
  return (
    <HomeScreen
      services={services}
      onOpenPlaceholder={route => navigation.navigate(route)}
    />
  );
}
export function RootNavigator({
  bootstrap,
}: Readonly<{ bootstrap: Extract<BootstrapState, { status: 'ready' }> }>) {
  const services = useAppServices();
  const reducedMotion = useReducedMotion(services.settings);
  return (
    <Stack.Navigator
      initialRouteName={bootstrap.profileId ? 'Home' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'default',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingRoute} />
      <Stack.Screen name="Home" component={HomeRoute} />
      <Stack.Screen name="Daily10" component={DailyRoute} />
      <Stack.Screen name="Category" component={CategoryRoute} />
      <Stack.Screen name="Game" component={GameRoute} />
      <Stack.Screen
        name="Result"
        children={({ navigation, route }) => (
          <ResultScreen
            result={route.params.result}
            onHome={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
            }
          />
        )}
      />
      <Stack.Screen
        name="Progress"
        children={({ navigation }) => (
          <ProgressScreen
            services={services}
            onHome={() => navigation.navigate('Home')}
          />
        )}
      />
      <Stack.Screen
        name="Parent"
        children={({ navigation }) => (
          <ParentScreen
            services={services}
            onExit={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
            }
            onDeleted={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] })
            }
          />
        )}
      />
    </Stack.Navigator>
  );
}

function CategoryRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Category'>) {
  const services = useAppServices();
  const profileId = services.settings.get().selectedProfileId;
  return profileId ? (
    <CategoryScreen
      services={services}
      profileId={profileId}
      onSessionReady={sessionId => navigation.navigate('Game', { sessionId })}
    />
  ) : (
    <PlaceholderScreen title="Categories" />
  );
}

function GameRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const services = useAppServices();
  return (
    <GameScreen
      services={services}
      sessionId={route.params.sessionId}
      onComplete={result => navigation.replace('Result', { result })}
    />
  );
}

function OnboardingRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Onboarding'>) {
  const services = useAppServices();
  return (
    <OnboardingScreen
      services={services}
      onComplete={() =>
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
      }
    />
  );
}

function DailyRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Daily10'>) {
  const services = useAppServices();
  return (
    <DailyScreen
      services={services}
      onSessionReady={sessionId => navigation.replace('Game', { sessionId })}
    />
  );
}
