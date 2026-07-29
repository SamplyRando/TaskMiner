import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string | undefined;
  label: string;
};

export function FormField({ error, id, label, ...inputProps }: FormFieldProps) {
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        id={id}
        {...inputProps}
      />
      {error ? (
        <p className="text-destructive text-sm" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
