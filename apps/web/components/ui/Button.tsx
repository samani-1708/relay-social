"use client";

/**
 * relayman Button — MUI Button pre-wired to the black theme tokens.
 *
 * Variants:
 *   primary   — filled black (#18181B), white text
 *   secondary — outlined border, transparent background
 *   ghost     — no border, subtle hover
 *   danger    — filled red, white text
 *
 * Size: sm | md (default) | lg
 */

import MuiButton, { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends Omit<MuiButtonProps, "variant" | "size" | "color"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const SIZE_MAP: Record<Size, MuiButtonProps["size"]> = {
  sm: "small",
  md: "medium",
  lg: "large",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, disabled, sx, ...rest }, ref) => {
    const variantSx = getVariantSx(variant);
    return (
      <MuiButton
        ref={ref}
        size={SIZE_MAP[size]}
        disabled={disabled || loading}
        sx={[
          {
            textTransform: "none",
            fontWeight: 600,
            boxShadow: "none",
            borderRadius: 1.5,
            "&:hover": { boxShadow: "none" },
          },
          variantSx,
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
        {...rest}
      >
        {loading && (
          <CircularProgress size={14} thickness={5} sx={{ mr: 1, color: "inherit" }} />
        )}
        {children}
      </MuiButton>
    );
  },
);
Button.displayName = "Button";

function getVariantSx(variant: Variant) {
  switch (variant) {
    case "primary":
      return {
        bgcolor: "text.primary",
        color: "background.default",
        border: "1px solid transparent",
        "&:hover": { bgcolor: "text.secondary", color: "background.default" },
      } as const;
    case "secondary":
      return {
        bgcolor: "transparent",
        color: "text.primary",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary" },
      } as const;
    case "ghost":
      return {
        bgcolor: "transparent",
        color: "text.primary",
        border: "1px solid transparent",
        "&:hover": { bgcolor: "action.hover" },
      } as const;
    case "danger":
      return {
        bgcolor: "error.main",
        color: "#fff",
        border: "1px solid transparent",
        "&:hover": { bgcolor: "error.dark" },
      } as const;
  }
}
