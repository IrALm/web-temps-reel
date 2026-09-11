import type {OrderStatus} from '@resto/shared';

export const ORDER_STATUS_META: Record<
  OrderStatus,
  {label: string; color: string; bg: string}
> = {
  pending: {label: 'À valider', color: 'var(--pending)', bg: 'var(--pending-bg)'},
  in_preparation: {
    label: 'En préparation',
    color: 'var(--prep)',
    bg: 'var(--prep-bg)',
  },
  served: {label: 'Servie', color: 'var(--served)', bg: 'var(--served-bg)'},
  cancelled: {
    label: 'Annulée',
    color: 'var(--cancelled)',
    bg: 'var(--cancelled-bg)',
  },
};
