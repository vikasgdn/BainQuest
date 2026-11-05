import type { IsoInstant, LocalDate } from '../domain/models/types';

/** The adapter owns timezone conversion; policies receive the resulting civil date. */
export interface Clock {
  now(): IsoInstant;
  localDate(): LocalDate;
}
