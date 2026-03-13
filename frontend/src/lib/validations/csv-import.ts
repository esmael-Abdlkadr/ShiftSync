import { z } from 'zod';

// ── User import schema ────────────────────────────────────────────────────────
export const importUserRowSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().min(1, 'Email is required').email('Invalid email address').max(255),
  role: z
    .string()
    .min(1, 'Role is required')
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(['ADMIN', 'MANAGER', 'STAFF'], { message: 'Role must be ADMIN, MANAGER, or STAFF' })),
  timezone: z
    .string()
    .optional()
    .transform((v) => v || 'America/New_York'),
  desiredWeeklyHours: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().min(0).max(168).optional()),
  hourlyRate: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().min(0).optional()),
});

export type ImportUserRow = z.infer<typeof importUserRowSchema>;

// ── Generic CSV row validation ────────────────────────────────────────────────
export interface ValidatedRow<T> {
  rowIndex: number;
  raw: Record<string, string>;
  data: T | null;
  errors: Record<string, string> | null;
  isValid: boolean;
}

export function validateCsvRows<T>(
  rawRows: Record<string, string>[],
  schema: z.ZodSchema<T>
): ValidatedRow<T>[] {
  return rawRows.map((raw, index) => {
    const result = schema.safeParse(raw);
    if (result.success) {
      return { rowIndex: index + 2, raw, data: result.data, errors: null, isValid: true };
    }

    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.') || 'general';
      errors[field] = issue.message;
    });

    return { rowIndex: index + 2, raw, data: null, errors, isValid: false };
  });
}

// ── Column definitions for user CSV template / export ────────────────────────
export const USER_CSV_COLUMNS = [
  { key: 'firstName', header: 'firstName' },
  { key: 'lastName', header: 'lastName' },
  { key: 'email', header: 'email' },
  { key: 'role', header: 'role' },
  { key: 'timezone', header: 'timezone' },
  { key: 'desiredWeeklyHours', header: 'desiredWeeklyHours' },
  { key: 'hourlyRate', header: 'hourlyRate' },
];
