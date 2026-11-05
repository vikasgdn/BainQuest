import type { Clock } from '../../shared/Clock';

export type ParentGateState = Readonly<{
  failures: number;
  lockedUntil: number;
}>;
export interface ParentGateStorage {
  getParentGateState(): ParentGateState;
  setParentGateState(state: ParentGateState): void;
}
export type ParentChallenge = Readonly<{ prompt: string; answer: number }>;

/** An adult friction gate, not identity verification. Authorization stays in memory. */
export class ParentGate {
  private authorized = false;
  private challenge: ParentChallenge;
  constructor(
    private readonly storage: ParentGateStorage,
    private readonly clock: Clock,
    private readonly random: () => number = Math.random,
  ) {
    this.challenge = this.generate();
  }
  private generate(previousAnswer?: number): ParentChallenge {
    const left = 12 + Math.floor(this.random() * 18);
    const multiplier = 3 + Math.floor(this.random() * 7);
    let subtract = 7 + Math.floor(this.random() * 17);
    if (left * multiplier - subtract === previousAnswer) subtract += 1;
    return {
      prompt: `(${left} × ${multiplier}) − ${subtract}`,
      answer: left * multiplier - subtract,
    };
  }
  get prompt(): string {
    return this.challenge.prompt;
  }
  get unlocked(): boolean {
    return this.authorized;
  }
  get waitSeconds(): number {
    return Math.max(
      0,
      Math.ceil(
        (this.storage.getParentGateState().lockedUntil -
          Date.parse(this.clock.now())) /
          1000,
      ),
    );
  }
  lock(): void {
    this.authorized = false;
    this.challenge = this.generate(this.challenge.answer);
  }
  submit(answer: string): 'unlocked' | 'incorrect' | 'locked' {
    if (this.waitSeconds > 0) return 'locked';
    const state = this.storage.getParentGateState();
    if (
      /^\d+$/.test(answer.trim()) &&
      Number(answer) === this.challenge.answer
    ) {
      this.storage.setParentGateState({ failures: 0, lockedUntil: 0 });
      this.authorized = true;
      return 'unlocked';
    }
    const failures = state.lockedUntil > 0 ? 1 : state.failures + 1;
    const locked = failures >= 3;
    this.storage.setParentGateState({
      failures: locked ? 0 : failures,
      lockedUntil: locked ? Date.parse(this.clock.now()) + 30000 : 0,
    });
    this.challenge = this.generate(this.challenge.answer);
    return locked ? 'locked' : 'incorrect';
  }
}
