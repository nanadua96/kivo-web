import z from 'zod';

export const loginSchema = z.object({
  code: z.string().length(6).nonempty(),
});

export type LoginInput = z.infer<typeof loginSchema>;
