export type DocTarget = "visitantes" | "contratistas";

export type DocDef = {
  key: string;
  label: string;
};

const DEFAULT_LABELS: Record<string, string> = {
  identificacion_oficial: "Identificación oficial",
  sua: "SUA",
  permiso_entrada: "Permiso de entrada",
  lista_articulos: "Lista de artículos",
  repse: "REPSE",
  soporte_pago_actualizado: "Soporte de pago actualizado",
  constancia_vigencia_imss: "Constancia de Vigencia IMSS",
  constancias_habilidades: "Constancias de Habilidades",
};

const DEFAULT_REQUIRED = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
];

const DEFAULT_OPTIONAL = ["constancia_vigencia_imss", "constancias_habilidades"];

export function getDocumentosConfig(
  config: any,
  target: DocTarget
): {
  required: DocDef[];
  optional: DocDef[];
  labelByKey: Record<string, string>;
} {
  const toggleConfig =
    target === "visitantes"
      ? config?.documentos_visitantes || {}
      : config?.documentos_contratistas || {};
  const personalizados =
    config?.documentos_personalizados?.[target] || {};

  const requiredDefaults = DEFAULT_REQUIRED
    .filter((key) => toggleConfig[key] !== false)
    .map((key) => ({ key, label: DEFAULT_LABELS[key] || key }));
  const optionalDefaults = DEFAULT_OPTIONAL
    .filter((key) => toggleConfig[key] !== false)
    .map((key) => ({ key, label: DEFAULT_LABELS[key] || key }));

  const requiredCustom = ((personalizados?.obligatorios || []) as any[])
    .filter((doc) => doc?.activo !== false && doc?.id)
    .map((doc) => ({
      key: String(doc.id),
      label: String(doc.nombre || doc.id),
    }));
  const optionalCustom = ((personalizados?.opcionales || []) as any[])
    .filter((doc) => doc?.activo !== false && doc?.id)
    .map((doc) => ({
      key: String(doc.id),
      label: String(doc.nombre || doc.id),
    }));

  const required = [...requiredDefaults, ...requiredCustom];
  const optional = [...optionalDefaults, ...optionalCustom];

  const labelByKey = [...required, ...optional].reduce(
    (acc, doc) => ({ ...acc, [doc.key]: doc.label }),
    {} as Record<string, string>
  );

  return { required, optional, labelByKey };
}
