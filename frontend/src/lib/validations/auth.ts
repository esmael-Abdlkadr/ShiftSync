import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  timezone: z.string().optional(),
  desiredWeeklyHours: z.number().min(0).max(60).optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'Too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Too long'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Too long'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Too long'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF'], { message: 'Select a role' }),
  timezone: z.string().min(1, 'Select a timezone'),
  desiredWeeklyHours: z
    .number({ error: 'Must be a number' })
    .min(0)
    .max(168)
    .optional(),
  hourlyRate: z
    .number({ error: 'Must be a number' })
    .min(0)
    .optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
