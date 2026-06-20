"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACCESS_COOKIE = "crediflex_access";
const ACCESS_VALUE = "granted";
const ACCESS_PASSWORD = "1234567";

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

type LoginState = {
  error: string | null;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"));

  if (password !== ACCESS_PASSWORD) {
    return { error: "La contraseña no es correcta." };
  }

  cookies().set(ACCESS_COOKIE, ACCESS_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect(nextPath);
}

export async function logoutAction() {
  cookies().delete(ACCESS_COOKIE);
  redirect("/acceso");
}
