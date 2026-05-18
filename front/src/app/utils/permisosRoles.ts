import type { ModuloPermisoId } from "../constants/permisosModulos";

type PermisoRol = {
  rol: number;
  modulo_inicio?: string;
  modulos?: Record<string, boolean>;
};

export function getPermisoRol(permisos: PermisoRol[] | undefined, rolesUsuario: number[]) {
  const all = Array.isArray(permisos) ? permisos : [];
  for (const r of rolesUsuario) {
    const found = all.find((p) => Number(p.rol) === Number(r));
    if (found) return found;
  }
  return undefined;
}

export function canViewModule(
  permisos: PermisoRol[] | undefined,
  rolesUsuario: number[],
  modulo: ModuloPermisoId
) {
  // Retrocompatibilidad: si aún no hay permisos configurados/cargados,
  // se conserva el comportamiento previo y no se bloquea.
  if (!Array.isArray(permisos) || permisos.length === 0) return true;
  const pr = getPermisoRol(permisos, rolesUsuario);
  // Si el rol no tiene fila de permisos, no forzamos bloqueo.
  if (!pr || !pr.modulos || typeof pr.modulos !== "object") return true;
  return Boolean(pr.modulos[modulo]);
}

export function getMainModuleForRole(permisos: PermisoRol[] | undefined, rolesUsuario: number[]) {
  const pr = getPermisoRol(permisos, rolesUsuario);
  return String(pr?.modulo_inicio || "").trim();
}

export const mainModulePath: Record<string, string> = {
  kiosco: "/kiosco",
  usuarios: "/usuarios",
  empleados: "/empleados",
  campo: "/campo",
  visitantes: "/visitantes",
  portal_contratistas: "/portal-contratistas/visitantes",
  contratistas: "/contratistas",
  directorio: "/directorio",
  eventos: "/eventos",
  escaner_qr: "/escaner-qr",
  catalogos: "/accesos",
  dispositivos_hikvision: "/dispositivos-hikvision",
  camaras: "/camaras",
  biostar: "/biostarar/conexion",
  configuracion: "/configuracion",
  permisos: "/configuracion",
};
