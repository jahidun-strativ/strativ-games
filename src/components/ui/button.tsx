"use client";

import { useRouter } from "next/navigation";
import { Button as AntButton } from "antd";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

function antProps(variant: Variant) {
  switch (variant) {
    case "primary":
      return { type: "primary" as const };
    case "secondary":
      return { type: "default" as const };
    case "danger":
      return { type: "primary" as const, danger: true };
    case "ghost":
      return { type: "text" as const };
  }
}

export function Button({
  variant = "primary",
  type = "button",
  children,
  className,
  disabled,
  onClick,
}: {
  variant?: Variant;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: ComponentProps<"button">["onClick"];
}) {
  return (
    <AntButton
      {...antProps(variant)}
      htmlType={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </AntButton>
  );
}

export function ButtonLink({
  variant = "primary",
  href,
  children,
  className,
}: {
  variant?: Variant;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <AntButton
      {...antProps(variant)}
      className={className}
      onClick={() => router.push(href)}
    >
      {children}
    </AntButton>
  );
}
