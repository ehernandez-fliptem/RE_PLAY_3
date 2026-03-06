export const ROLE_LABELS: Record<number, string> = {
  1: "Super Admin",
  2: "Administrador",
  4: "Anfitrión",
  5: "Recepción",
  10: "Visitante",
};

export function getRoleLabel(id: number, fallback?: string) {
  return ROLE_LABELS[id] ?? fallback ?? "Rol";
}
