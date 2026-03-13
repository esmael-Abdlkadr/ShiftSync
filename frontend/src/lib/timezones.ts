export const SUPPORTED_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (America/Los_Angeles)' },
  { value: 'America/New_York',    label: 'Eastern Time (America/New_York)' },
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number]['value'];
