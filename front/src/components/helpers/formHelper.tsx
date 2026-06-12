import { enqueueSnackbar } from "notistack";
import { type FieldErrors, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";

export function setFormErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  errors: Partial<Record<keyof TFieldValues, string>>
) {
  Object.entries(errors).forEach(([key, message]) => {
    if (message) {
      setError(key as Path<TFieldValues>, {
        type: 'manual',
        message,
      });
    }
  });
}

export function getFormErrorMessages(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") return [];
  const current = obj as Record<string, unknown>;
  const out: string[] = [];
  if (typeof current.message === "string" && current.message.trim()) {
    out.push(current.message);
  }
  Object.values(current).forEach((value) => {
    if (value && typeof value === "object") {
      out.push(...getFormErrorMessages(value));
    }
  });
  return out;
}

export function notifyFormErrors<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>
) {
  const messages = Array.from(new Set(getFormErrorMessages(errors)));
  enqueueSnackbar(
    messages.length > 0
      ? `Faltan campos por completar: ${messages.join(" | ")}`
      : "Faltan campos obligatorios por completar.",
    { variant: "warning" }
  );
}
