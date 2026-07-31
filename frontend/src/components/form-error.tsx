import { AlertCircle } from "lucide-react";

import { ApiError } from "@/api/client";

type FormErrorProps = {
  error: unknown;
};

export function FormError({ error }: FormErrorProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {error instanceof ApiError
          ? error.message
          : "Une erreur inattendue est survenue."}
      </span>
    </div>
  );
}
