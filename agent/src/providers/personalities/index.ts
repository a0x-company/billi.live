import type { PersonalityProfile } from './types.ts';  // Para tipos no necesitamos extensión
import { HAWK } from './hawk.ts';
import { ALEXANDER } from './alexander.ts';
import { MORGAN } from './morgan.ts';
import { DENNIS } from './dennis.ts';
import { VIKTOR } from './viktor.ts';
import { SHADOW } from './shadow.ts';

export type { PersonalityProfile }; 

export const PERSONALITIES = {
    HAWK,
    ALEXANDER,
    MORGAN,
    DENNIS,
    VIKTOR,
    SHADOW
} as const;