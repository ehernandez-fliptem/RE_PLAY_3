import { Fragment, useState } from "react";
import { Button, Grid, Stack, Typography } from "@mui/material";
import { SwitchElement } from "react-hook-form-mui";
import { Devices } from "@mui/icons-material";
import { useFormContext } from "react-hook-form";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { updateConfig } from "../../../../app/features/config/configSlice";

export default function Integraciones() {
  const { getValues } = useFormContext();
  const [isSaving, setIsSaving] = useState(false);
  const dispatch = useDispatch();

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

  return (
    <Fragment>
      <Typography
        variant="overline"
        component="h2"
        sx={{ mb: 2 }}
        display="flex"
        alignItems="center"
      >
        <Devices color="primary" sx={{ mr: 1 }} /> <strong>Integraciones</strong>
      </Typography>

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
                Esta opcion habilita el uso de los dispositivos de reconocimiento facial de la marca Hikvision.
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
