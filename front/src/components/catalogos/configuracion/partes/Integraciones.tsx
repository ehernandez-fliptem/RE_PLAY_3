import { Fragment, useEffect, useState } from "react";
import {
  Checkbox,
  Button,
  Grid,
  Stack,
  Typography,
  Box,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  IconButton,
  Tooltip,
} from "@mui/material";
import { SwitchElement } from "react-hook-form-mui";
import { Devices, ExpandMore, Add, Delete } from "@mui/icons-material";
import { useFormContext } from "react-hook-form";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { updateConfig } from "../../../../app/features/config/configSlice";
import Swal from "sweetalert2";

export default function Integraciones() {
  const { getValues, watch, setValue } = useFormContext();
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<
    "contratistas" | "visitantes" | false
  >(false);
  const dispatch = useDispatch();
  const habilitarContratistas = watch("habilitarContratistas");
  const habilitarRegistroCampo = watch("habilitarRegistroCampo");
  const habilitarIntegracionHv = watch("habilitarIntegracionHv");
  const docsVisitantes = watch("documentos_visitantes");
  const docsContratistas = watch("documentos_contratistas");

  type DocScope = "contratistas" | "visitantes";
  type DocBucket = "obligatorios" | "opcionales";
  type DocItem = { id: string; nombre: string; activo: boolean };
  type DocDefaultScope = "contratistas" | "visitantes";

  const CUSTOM_DOCS_DEFAULT = {
    contratistas: { obligatorios: [], opcionales: [] },
    visitantes: { obligatorios: [], opcionales: [] },
  };

  useEffect(() => {
    if (!habilitarIntegracionHv) {
      setValue("habilitarIntegracionHvBiometria", false, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [habilitarIntegracionHv, setValue]);

  useEffect(() => {
    const current = getValues("documentos_personalizados");
    if (!current || typeof current !== "object") {
      setValue("documentos_personalizados", CUSTOM_DOCS_DEFAULT, {
        shouldDirty: false,
        shouldValidate: false,
      });
      return;
    }
    if (
      !current.contratistas ||
      !current.visitantes ||
      !Array.isArray(current?.contratistas?.obligatorios) ||
      !Array.isArray(current?.contratistas?.opcionales) ||
      !Array.isArray(current?.visitantes?.obligatorios) ||
      !Array.isArray(current?.visitantes?.opcionales)
    ) {
      setValue(
        "documentos_personalizados",
        {
          ...CUSTOM_DOCS_DEFAULT,
          ...current,
          contratistas: {
            ...CUSTOM_DOCS_DEFAULT.contratistas,
            ...(current?.contratistas || {}),
          },
          visitantes: {
            ...CUSTOM_DOCS_DEFAULT.visitantes,
            ...(current?.visitantes || {}),
          },
        },
        {
          shouldDirty: false,
          shouldValidate: false,
        }
      );
    }
  }, [getValues, setValue]);

  const docsPersonalizados = watch("documentos_personalizados");

  const DOC_LABELS: Record<string, string> = {
    identificacion_oficial: "Identificacion oficial",
    sua: "SUA",
    permiso_entrada: "Permiso de entrada",
    lista_articulos: "Lista de articulos",
    repse: "REPSE",
    soporte_pago_actualizado: "Soporte de pago actualizado",
    constancia_vigencia_imss: "Constancia de Vigencia IMSS",
    constancias_habilidades: "Constancias de Habilidades",
  };

  const DOCS_REQUIRED = [
    "identificacion_oficial",
    "sua",
    "permiso_entrada",
    "lista_articulos",
    "repse",
    "soporte_pago_actualizado",
  ];

  const DOCS_OPTIONAL = [
    "constancia_vigencia_imss",
    "constancias_habilidades",
  ];

  const getTotalActivosPorScope = (scope: DocScope): number => {
    const defaults = scope === "contratistas" ? docsContratistas : docsVisitantes;
    const activosDefault = [...DOCS_REQUIRED, ...DOCS_OPTIONAL].reduce(
      (acc, key) => (defaults?.[key] ? acc + 1 : acc),
      0
    );
    const personalizados = getCustomDocsConfig()?.[scope];
    const activosCustom = [
      ...(personalizados?.obligatorios || []),
      ...(personalizados?.opcionales || []),
    ].filter((item: DocItem) => Boolean(item?.activo)).length;
    return activosDefault + activosCustom;
  };

  const puedeDesactivarEnScope = (scope: DocScope): boolean =>
    getTotalActivosPorScope(scope) > 1;

  const guardarIntegraciones = async () => {
    try {
      setIsSaving(true);
      const {
        habilitarIntegracionHv,
        habilitarIntegracionHvBiometria,
        habilitarCamaras,
        habilitarContratistas,
        habilitarRegistroCampo,
      } = getValues();
      const documentos_visitantes = getValues("documentos_visitantes");
      const documentos_contratistas = getValues("documentos_contratistas");
      const documentos_personalizados = getValues("documentos_personalizados");
      const res = await clienteAxios.put("/api/configuracion/integraciones", {
        habilitarIntegracionHv,
        habilitarIntegracionHvBiometria,
        habilitarCamaras,
        habilitarContratistas,
        habilitarRegistroCampo,
        documentos_visitantes,
        documentos_contratistas,
        documentos_personalizados,
      });
      if (res.data.estado) {
        const recarga = await clienteAxios.get("/api/configuracion/integraciones");
        const datos = recarga?.data?.datos || {};
        setValue("documentos_visitantes", datos.documentos_visitantes || {}, {
          shouldDirty: false,
          shouldValidate: false,
        });
        setValue("documentos_contratistas", datos.documentos_contratistas || {}, {
          shouldDirty: false,
          shouldValidate: false,
        });
        setValue(
          "documentos_personalizados",
          {
            ...CUSTOM_DOCS_DEFAULT,
            ...(datos.documentos_personalizados || {}),
            contratistas: {
              ...CUSTOM_DOCS_DEFAULT.contratistas,
              ...(datos?.documentos_personalizados?.contratistas || {}),
            },
            visitantes: {
              ...CUSTOM_DOCS_DEFAULT.visitantes,
              ...(datos?.documentos_personalizados?.visitantes || {}),
            },
          },
          {
            shouldDirty: false,
            shouldValidate: false,
          }
        );
        dispatch(
          updateConfig({
            habilitarIntegracionHv,
            habilitarIntegracionHvBiometria,
            habilitarCamaras,
            habilitarContratistas,
            habilitarRegistroCampo,
            documentos_visitantes,
            documentos_contratistas,
            documentos_personalizados,
          })
        );
        enqueueSnackbar("Integraciones guardadas.", { variant: "success" });
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const guardarDocumentos = async () => {
    try {
      await guardarIntegraciones();
      await Swal.fire({
        icon: "success",
        title: "Enviado con exito",
        confirmButtonText: "OK",
        allowOutsideClick: false,
      });
    } catch {
      // errores ya manejados en guardarIntegraciones
    }
  };

  const getCustomDocsConfig = () => {
    const current =
      docsPersonalizados ||
      getValues("documentos_personalizados") ||
      CUSTOM_DOCS_DEFAULT;
    return {
      ...CUSTOM_DOCS_DEFAULT,
      ...current,
      contratistas: {
        ...CUSTOM_DOCS_DEFAULT.contratistas,
        ...(current?.contratistas || {}),
      },
      visitantes: {
        ...CUSTOM_DOCS_DEFAULT.visitantes,
        ...(current?.visitantes || {}),
      },
    };
  };

  const getCustomDocs = (scope: DocScope, bucket: DocBucket): DocItem[] => {
    const cfg = getCustomDocsConfig();
    return (cfg?.[scope]?.[bucket] as DocItem[]) || [];
  };

  const setCustomDocs = (scope: DocScope, bucket: DocBucket, value: DocItem[]) => {
    const cfg = getCustomDocsConfig();
    const next = {
      ...cfg,
      [scope]: {
        ...cfg[scope],
        [bucket]: value,
      },
    };
    setValue("documentos_personalizados", next, {
      shouldDirty: true,
      shouldValidate: false,
      shouldTouch: false,
    });
  };

  const agregarDocumentoPersonalizado = async (
    scope: DocScope,
    bucket: DocBucket
  ) => {
    const result = await Swal.fire({
      title: "Agregar documento personalizado",
      input: "text",
      inputLabel: "Nombre del documento",
      inputPlaceholder: "Ej. Carta de seguridad",
      showCancelButton: true,
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (!value || !value.trim()) return "El nombre es obligatorio.";
        return undefined;
      },
    });
    if (!result.isConfirmed) return;
    const nombre = String(result.value || "").trim();
    if (!nombre) return;
    const actual = getCustomDocs(scope, bucket);
    if (
      actual.some(
        (item: DocItem) =>
          String(item?.nombre || "").toLowerCase() === nombre.toLowerCase()
      )
    ) {
      enqueueSnackbar("Ese documento ya existe en esta seccion.", {
        variant: "warning",
      });
      return;
    }
    setCustomDocs(scope, bucket, [
      ...actual,
      {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nombre,
        activo: true,
      },
    ]);
  };

  const eliminarDocumentoPersonalizado = (
    scope: DocScope,
    bucket: DocBucket,
    index: number
  ) => {
    const actualScope = getCustomDocs(scope, bucket);
    const docActual = actualScope?.[index];
    if (docActual?.activo && !puedeDesactivarEnScope(scope)) {
      enqueueSnackbar("Debe permanecer al menos un documento activo.", {
        variant: "warning",
      });
      return;
    }
    const actual = [...getCustomDocs(scope, bucket)];
    actual.splice(index, 1);
    setCustomDocs(scope, bucket, actual);
  };

  const cambiarEstadoDocumentoPersonalizado = (
    scope: DocScope,
    bucket: DocBucket,
    index: number,
    activo: boolean
  ) => {
    if (!activo && !puedeDesactivarEnScope(scope)) {
      enqueueSnackbar("Debe permanecer al menos un documento activo.", {
        variant: "warning",
      });
      return;
    }
    const actual = [...getCustomDocs(scope, bucket)];
    actual[index] = { ...actual[index], activo };
    setCustomDocs(scope, bucket, actual);
  };

  const renderDocumentosPersonalizados = (scope: DocScope, bucket: DocBucket) => {
    const docs = getCustomDocs(scope, bucket);
    return (
      <Box sx={{ mt: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Personalizados
          </Typography>
          <Tooltip title="Agregar documento personalizado">
            <IconButton
              size="small"
              color="primary"
              onClick={() => agregarDocumentoPersonalizado(scope, bucket)}
            >
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {docs.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Sin documentos personalizados.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {docs.map((doc: DocItem, index: number) => (
              <Box
                key={`${doc?.id || index}`}
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    checked={Boolean(doc?.activo)}
                    onChange={(e) =>
                      cambiarEstadoDocumentoPersonalizado(
                        scope,
                        bucket,
                        index,
                        e.target.checked
                      )
                    }
                    size="small"
                  />
                  <Typography variant="body2">{doc?.nombre || "Documento"}</Typography>
                </Box>
                <Tooltip title="Eliminar documento">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => eliminarDocumentoPersonalizado(scope, bucket, index)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    );
  };

  const renderDefaultDocCheckbox = (scope: DocDefaultScope, key: string) => (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Checkbox
        checked={Boolean(
          scope === "contratistas"
            ? docsContratistas?.[key]
            : docsVisitantes?.[key]
        )}
        onChange={(_, checked) => {
          if (!checked && !puedeDesactivarEnScope(scope)) {
            enqueueSnackbar("Debe permanecer al menos un documento activo.", {
              variant: "warning",
            });
            return;
          }
          setValue(`documentos_${scope}.${key}`, checked, {
            shouldDirty: true,
            shouldValidate: false,
            shouldTouch: false,
          });
        }}
        size="small"
      />
      <Typography variant="body1">{DOC_LABELS[key]}</Typography>
    </Box>
  );

  return (
    <Fragment>
      <Typography
        variant="overline"
        component="h2"
        sx={{ mb: 2 }}
        display="flex"
        alignItems="center"
      >
        <Devices color="primary" sx={{ mr: 1 }} />{" "}
        <strong>Integraciones</strong>
      </Typography>
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong>Registro de campo para empleados</strong>
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: { xs: 0, sm: 2 } }}
            >
              <small>
                Activa el modulo para permitir check in/check out de campo por
                ubicacion y foto.
              </small>
            </Typography>
          </Stack>
        </Grid>
        <Grid
          size={{ xs: 12, sm: 2 }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "end" },
          }}
        >
          <SwitchElement
            label=""
            labelPlacement="start"
            name="habilitarRegistroCampo"
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong>Integracion con Control de accesos de Hikvision</strong>
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: { xs: 0, sm: 2 } }}
            >
              <small>
                Esta opcion habilita el uso de los dispositivos de
                reconocimiento facial de la marca Hikvision.
              </small>
            </Typography>
          </Stack>
        </Grid>
        <Grid
          size={{ xs: 12, sm: 2 }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "end" },
          }}
        >
          <SwitchElement
            label=""
            labelPlacement="start"
            name="habilitarIntegracionHv"
          />
        </Grid>
      </Grid>
      {habilitarIntegracionHv && (
        <Grid container spacing={2} sx={{ my: 1, ml: { xs: 0, sm: 2 } }}>
          <Grid size={{ xs: 12, sm: 10 }}>
            <Stack spacing={0}>
              <Typography variant="overline" component="h2">
                <strong>Huella y tarjeta (Hikvision)</strong>
              </Typography>
              <Typography
                variant="body2"
                component="span"
                sx={{ ml: { xs: 0, sm: 2 } }}
              >
                <small>
                  Activa funciones biometricas y de tarjeta. Esta opcion
                  habilita el uso de panel maestro para operaciones de
                  huella/tarjeta.
                </small>
              </Typography>
            </Stack>
          </Grid>
          <Grid
            size={{ xs: 12, sm: 2 }}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: { xs: "center", sm: "end" },
            }}
          >
            <SwitchElement
              label=""
              labelPlacement="start"
              name="habilitarIntegracionHvBiometria"
            />
          </Grid>
        </Grid>
      )}
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong>Portal de Visitas para Contratistas</strong>
            </Typography>
          </Stack>
        </Grid>
      </Grid>
      {habilitarContratistas && (
        <Box sx={{ ml: { xs: 0, sm: 2 }, mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Documentos
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              border: "1px solid #e6e6e6",
              borderRadius: 1,
              p: 1,
            }}
          >
            <Accordion
              expanded={expandedDocs === "contratistas"}
              onChange={(_, isExpanded) =>
                setExpandedDocs(isExpanded ? "contratistas" : false)
              }
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={600} variant="body2">
                  Contratistas
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    border: "1px solid #e6e6e6",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Documentos obligatorios
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_REQUIRED.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderDefaultDocCheckbox("contratistas", key)}
                      </Grid>
                    ))}
                  </Grid>
                  {renderDocumentosPersonalizados("contratistas", "obligatorios")}
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Documentos opcionales
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_OPTIONAL.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderDefaultDocCheckbox("contratistas", key)}
                      </Grid>
                    ))}
                  </Grid>
                  {renderDocumentosPersonalizados("contratistas", "opcionales")}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={guardarDocumentos}
                    disabled={isSaving}
                  >
                    Guardar documentos
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expandedDocs === "visitantes"}
              onChange={(_, isExpanded) =>
                setExpandedDocs(isExpanded ? "visitantes" : false)
              }
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={600} variant="body2">
                  Visitantes
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    border: "1px solid #e6e6e6",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Documentos obligatorios
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_REQUIRED.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderDefaultDocCheckbox("visitantes", key)}
                      </Grid>
                    ))}
                  </Grid>
                  {renderDocumentosPersonalizados("visitantes", "obligatorios")}
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Documentos opcionales
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_OPTIONAL.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        {renderDefaultDocCheckbox("visitantes", key)}
                      </Grid>
                    ))}
                  </Grid>
                  {renderDocumentosPersonalizados("visitantes", "opcionales")}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={guardarDocumentos}
                    disabled={isSaving}
                  >
                    Guardar documentos
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      )}
      <Typography
        variant="body2"
        component="span"
        sx={{ ml: { xs: 0, sm: 2 }, display: "block", mt: 1 }}
      >
        <small>Habilita o deshabilita el modulo de contratistas en el sistema.</small>
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: { xs: "center", sm: "end" },
          mt: 1,
        }}
      >
        <SwitchElement
          label=""
          labelPlacement="start"
          name="habilitarContratistas"
        />
      </Box>
      {!habilitarRegistroCampo && (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1, textAlign: { xs: "center", sm: "right" } }}
        >
          {/* El acceso de empleados de campo quedara deshabilitado. */}
        </Typography>
      )}
      <Grid container spacing={2} sx={{ my: 1 }}>
        <Grid
          size={{ xs: 12 }}
          sx={{ display: "flex", justifyContent: { xs: "center", sm: "end" } }}
        >
          <Button
            variant="contained"
            size="small"
            onClick={guardarIntegraciones}
            disabled={isSaving}
          >
            Guardar integraciones
          </Button>
        </Grid>
      </Grid>
    </Fragment>
  );
}
