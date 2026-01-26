import { type FieldValues, type Path, type UseFormSetError } from "react-hook-form";

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
