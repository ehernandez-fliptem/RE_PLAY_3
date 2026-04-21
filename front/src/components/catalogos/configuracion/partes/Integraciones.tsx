import { Fragment, useState } from "react";
import {
  Button,
  Grid,
  Stack,
  Typography,
  Box,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import { SwitchElement, CheckboxElement } from "react-hook-form-mui";
import { Devices, ExpandMore } from "@mui/icons-material";
import { useFormContext } from "react-hook-form";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { updateConfig } from "../../../../app/features/config/configSlice";
import Swal from "sweetalert2";

export default function Integraciones() {
  const { getValues, watch } = useFormContext();
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<
    "contratistas" | "visitantes" | false
  >(false);
  const dispatch = useDispatch();
  const habilitarContratistas = watch("habilitarContratistas");
  const habilitarRegistroCampo = watch("habilitarRegistroCampo");

  const DOC_LABELS: Record<string, string> = {
    identificacion_oficial: "Identificación oficial",
    sua: "SUA",
    permiso_entrada: "Permiso de entrada",
    lista_articulos: "Lista de artículos",
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

  const guardarIntegraciones = async () => {
    try {
      setIsSaving(true);
      const {
        habilitarIntegracionHv,
        habilitarCamaras,
        habilitarContratistas,
        habilitarRegistroCampo,
        documentos_visitantes,
        documentos_contratistas,
      } = getValues();
      const res = await clienteAxios.put("/api/configuracion/integraciones", {
        habilitarIntegracionHv,
        habilitarCamaras,
        habilitarContratistas,
        habilitarRegistroCampo,
        documentos_visitantes,
        documentos_contratistas,
      });
      if (res.data.estado) {
        dispatch(
          updateConfig({
            habilitarIntegracionHv,
            habilitarCamaras,
            habilitarContratistas,
            habilitarRegistroCampo,
            documentos_visitantes,
            documentos_contratistas,
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
        title: "Enviado con éxito",
        confirmButtonText: "OK",
        allowOutsideClick: false,
      });
    } catch {
      // errores ya manejados en guardarIntegraciones
    }
  };

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
                Activa el módulo para permitir check in/check out de campo por ubicación y foto.
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
          <SwitchElement label="" labelPlacement="start" name="habilitarRegistroCampo" />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong>Integración con Control de accesos de Hikvision</strong>
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: { xs: 0, sm: 2 } }}
            >
              <small>
                Esta opción habilita el uso de los dispositivos de
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
          <SwitchElement label="" labelPlacement="start" name="habilitarIntegracionHv" />
        </Grid>
      </Grid>
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
                <Box sx={{ mt: 1.5, p: 1.5, border: "1px solid #e6e6e6", borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Documentos obligatorios
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_REQUIRED.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        <CheckboxElement
                          name={`documentos_contratistas.${key}`}
                          label={DOC_LABELS[key]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Documentos opcionales
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_OPTIONAL.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        <CheckboxElement
                          name={`documentos_contratistas.${key}`}
                          label={DOC_LABELS[key]}
                        />
                      </Grid>
                    ))}
                  </Grid>
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
                <Box sx={{ mt: 1.5, p: 1.5, border: "1px solid #e6e6e6", borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Documentos obligatorios
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_REQUIRED.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        <CheckboxElement
                          name={`documentos_visitantes.${key}`}
                          label={DOC_LABELS[key]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Documentos opcionales
                  </Typography>
                  <Grid container spacing={1}>
                    {DOCS_OPTIONAL.map((key) => (
                      <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                        <CheckboxElement
                          name={`documentos_visitantes.${key}`}
                          label={DOC_LABELS[key]}
                        />
                      </Grid>
                    ))}
                  </Grid>
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
        <small>Habilita o deshabilita el módulo de contratistas en el sistema.</small>
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: { xs: "center", sm: "end" },
          mt: 1,
        }}
      >
        <SwitchElement label="" labelPlacement="start" name="habilitarContratistas" />
      </Box>
      {!habilitarRegistroCampo && (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1, textAlign: { xs: "center", sm: "right" } }}
        >
          {/* El acceso de empleados de campo quedará deshabilitado. */}
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



