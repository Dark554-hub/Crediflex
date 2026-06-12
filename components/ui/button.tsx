import Link from "next/link";
import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-ink text-white shadow-soft hover:bg-moss active:bg-ink",
  secondary: "border border-line bg-white text-ink hover:border-moss hover:bg-field active:bg-mint/55",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50 active:bg-red-100",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
};

export function ButtonLink({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={twMerge(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-maize/30",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
