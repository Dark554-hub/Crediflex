"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-base font-extrabold text-white shadow-soft transition duration-200 hover:bg-moss active:bg-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/35"
    >
      <LockKeyhole size={18} aria-hidden />
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useFormState(loginAction, { error: null });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <label htmlFor="password" className="text-sm font-extrabold text-ink">
          Contraseña
        </label>
        <div className="mt-2 flex min-h-12 overflow-hidden rounded-md border border-line bg-white shadow-soft focus-within:border-moss focus-within:ring-4 focus-within:ring-maize/25">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            inputMode="numeric"
            autoComplete="current-password"
            className="min-h-12 flex-1 border-0 bg-transparent px-4 text-lg font-bold text-ink outline-none placeholder:text-ink/55"
            placeholder="Escribe la contraseña"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="inline-flex min-h-12 w-12 items-center justify-center text-moss transition hover:bg-field focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </div>
        {state.error ? (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
