export type ModuloPermisoId =
  | "kiosco"
  | "usuarios"
  | "empleados"
  | "campo"
  | "visitantes"
  | "portal_contratistas"
  | "contratistas"
  | "directorio"
  | "eventos"
  | "escaner_qr"
  | "catalogos"
  | "dispositivos_hikvision"
  | "camaras"
  | "biostar"
  | "configuracion"
  | "permisos";

export const MODULOS_PERMISOS: Array<{ id: ModuloPermisoId; nombre: string; integracion?: "hv" | "biostar" | "camaras" | "contratistas" | "campo" }> = [
  { id: "kiosco", nombre: "Kiosco" },
  { id: "usuarios", nombre: "Usuarios" },
  { id: "empleados", nombre: "Empleados" },
  { id: "campo", nombre: "Registro Campo", integracion: "campo" },
  { id: "visitantes", nombre: "Visitantes" },
  { id: "portal_contratistas", nombre: "Portal Contratistas", integracion: "contratistas" },
  { id: "contratistas", nombre: "Contratistas", integracion: "contratistas" },
  { id: "directorio", nombre: "Directorio" },
  { id: "eventos", nombre: "Eventos" },
  { id: "escaner_qr", nombre: "Escaner QR" },
  { id: "catalogos", nombre: "Catalogos" },
  { id: "dispositivos_hikvision", nombre: "Dispositivos Hikvision", integracion: "hv" },
  { id: "camaras", nombre: "Camaras", integracion: "camaras" },
  { id: "biostar", nombre: "BioStar", integracion: "biostar" },
  { id: "configuracion", nombre: "Configuracion" },
  { id: "permisos", nombre: "Permisos" },
];

