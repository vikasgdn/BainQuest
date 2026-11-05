import type { ParentGateStorage } from '@/domain/use-cases/ParentGate';
import type { AppSettings } from './AppSettings';
import type { Clock } from './Clock';
import type {
  AttemptRepository,
  BadgeRepository,
  ChildProfileRepository,
  ContentMetadataRepository,
  ProgressRepository,
  QuestionRepository,
  SessionRepository,
} from '@/domain/repositories/contracts';

export type AppSettingsReader = ParentGateStorage &
  Readonly<{
    subscribe(listener: (settings: AppSettings) => void): () => void;
    get(): AppSettings;
    set(settings: AppSettings): void;
  }>;

export type AppServices = Readonly<{
  childProfiles: ChildProfileRepository;
  questions: QuestionRepository;
  sessions: SessionRepository;
  attempts: AttemptRepository;
  progress: ProgressRepository;
  badges: BadgeRepository;
  contentMetadata: ContentMetadataRepository;
  settings: AppSettingsReader;
  clock: Clock;
}>;
