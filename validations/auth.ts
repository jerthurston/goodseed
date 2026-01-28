import * as z from "zod";

export type RegisterFormValues = z.infer<typeof RegisterSchema>;
export type LoginFormValues = z.infer<typeof LoginSchema>;

export type AuthFormState = {
    errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
    }
    message?: string | null
};

export const RegisterSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    email: z.email({
        message: "Please enter a valid email address.",
    }),
    password: z.string()
        .min(8, "Password must be at least 8 characters.")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
        .regex(/[0-9]/, "Password must contain at least one number.")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character.")
});
export const LoginSchema = z.object({
    email: z.email({
        message: "Please enter a valid email address."
    }),
    password: z.string().min(8, {
        message: "Password must be at least 8 characters."
    }),
    token: z.string().optional()
});
export const NewPasswordSchema = z.object({
    password: z.string().min(6, {
        message: "Mininum of 6 characters required"
    }),
    reTypePassword: z.string().min(6, {
        message: "Mininum of 6 characters required"
    }),
});
export const ResetPasswordSchema = z.object({
    password: z.string()
        .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
        .regex(/[a-z]/, "Mật khẩu phải có chữ thường")
        .regex(/[A-Z]/, "Mật khẩu phải có chữ hoa")
        .regex(/[0-9]/, "Mật khẩu phải có số")
        .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải có ký tự đặc biệt"),
});
export const UserUpdateSchema = z.object({
  username: z.string().min(2).max(30),
  email: z.email(),
  bio: z.string().max(160).optional(),
});

