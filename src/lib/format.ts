import type { Channel, PaymentMethod } from '../../shared/types';
export { formatEUR } from '../../shared/logic';

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', opts);
}

export function formatDateTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  online: 'Online',
  seller: 'Walk-up',
  platform: 'Platform',
  group: 'Group',
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  stripe: 'Stripe',
  cash: 'Cash',
  card_terminal: 'Card terminal',
  platform: 'Paid via platform',
  invoice: 'Invoice',
  free: 'Free',
};
