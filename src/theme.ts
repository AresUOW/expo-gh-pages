import type { CatStatus } from './types/models';
export const colors = {
  ink: '#252D26', muted: '#7A8179', orange: '#E8724A', orangeSoft: '#FFF0E8',
  green: '#536D53', background: '#F7F7F2', white: '#FFFFFF', border: '#E7E8E1', error: '#B44134'
};
export const fonts = { regular: 'DMSans_400Regular', medium: 'DMSans_500Medium', semibold: 'DMSans_600SemiBold', bold: 'DMSans_700Bold' };
export const statuses: Record<CatStatus, { label: string; color: string; background: string }> = {
  stray: { label: 'Stray', color: '#B8783E', background: '#FBF0DF' },
  needs_help: { label: 'Needs help', color: '#C85546', background: '#FDECE7' },
  being_cared_for: { label: 'Cared for', color: '#59846A', background: '#EAF3EB' },
  adopted: { label: 'Adopted', color: '#697EA3', background: '#EBF0F9' }
};
