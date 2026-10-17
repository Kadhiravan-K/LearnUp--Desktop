/**
 * LearnUp Theme System — Motion & Global Design Tokens
 */

import { MotionTokens } from './types';

export const MOTION_TOKENS: MotionTokens = {
  durationFast: '150ms',
  durationNormal: '250ms',
  durationSlow: '400ms',
  easeDefault: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

export const SPACING_TOKENS = {
  space1: '0.25rem',  // 4px
  space2: '0.5rem',   // 8px
  space3: '0.75rem',  // 12px
  space4: '1rem',     // 16px
  space5: '1.25rem',  // 20px
  space6: '1.5rem',   // 24px
  space8: '2rem',     // 32px
  space10: '2.5rem',  // 40px
  space12: '3rem',    // 48px
  space16: '4rem'     // 64px
};

export const RADIUS_TOKENS = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px'
};
