"use client";

import type { ButtonHTMLAttributes } from "react";
import { GlowEffect } from "@/components/core/glow-effect";
import { cn } from "@/lib/utils";

const SOGEA_GLOW = ["#0f7ad6", "#0C4881", "#eb1b33", "#7ec8f0"];

type GlowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  glow?: boolean;
  glowBlur?: "softest" | "soft" | "medium";
  static?: boolean;
};

export function GlowButton({
  children,
  className,
  glow = true,
  glowBlur = "medium",
  static: isStatic = false,
  type = "button",
  ...props
}: GlowButtonProps) {
  return (
    <span className="glow-wrap">
      {glow ? (
        <GlowEffect
          colors={SOGEA_GLOW}
          mode="colorShift"
          blur={glowBlur}
          duration={8}
          className="glow-wrap-fx"
        />
      ) : null}
      <button
        type={type}
        className={cn("glow-btn", isStatic && "glow-btn-static", className)}
        {...props}
      >
        {children}
      </button>
    </span>
  );
}
