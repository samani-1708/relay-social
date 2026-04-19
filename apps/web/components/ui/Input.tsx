"use client";

/**
 * relayman Input — labeled TextField with consistent styling.
 *
 * Usage:
 *   <Input label="Skip hashtag" value={val} onChange={...} helperText="..." />
 */

import TextField, { TextFieldProps } from "@mui/material/TextField";

interface InputProps extends Omit<TextFieldProps, "variant"> {
  label: string;
}

export function Input({ label, ...rest }: InputProps) {
  return (
    <TextField
      label={label}
      variant="outlined"
      size="small"
      fullWidth
      {...rest}
    />
  );
}
