export type DocumentosChecks = {
  identificacion_oficial: boolean;
  sua: boolean;
  permiso_entrada: boolean;
  lista_articulos: boolean;
};

export const DOCUMENTOS_CHECKS_LIST = [
  { key: "identificacion_oficial", label: "Identificación oficial" },
  { key: "sua", label: "SUA" },
  { key: "permiso_entrada", label: "Permiso de entrada" },
  { key: "lista_articulos", label: "Lista de artículos" },
] as const;

export const EMPTY_DOCUMENTOS_CHECKS: DocumentosChecks = {
  identificacion_oficial: false,
  sua: false,
  permiso_entrada: false,
  lista_articulos: false,
};

export const normalizeDocumentosChecks = (
  value?: Partial<DocumentosChecks> | null
): DocumentosChecks => ({
  identificacion_oficial: Boolean(value?.identificacion_oficial),
  sua: Boolean(value?.sua),
  permiso_entrada: Boolean(value?.permiso_entrada),
  lista_articulos: Boolean(value?.lista_articulos),
});

export const areDocumentosChecksComplete = (
  value?: Partial<DocumentosChecks> | null
): boolean =>
  DOCUMENTOS_CHECKS_LIST.every(({ key }) => Boolean(value?.[key]));

export const areDocumentosChecksEqual = (
  a?: Partial<DocumentosChecks> | null,
  b?: Partial<DocumentosChecks> | null
): boolean => {
  const an = normalizeDocumentosChecks(a);
  const bn = normalizeDocumentosChecks(b);
  return DOCUMENTOS_CHECKS_LIST.every(({ key }) => an[key] === bn[key]);
};
