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
      const { habilitarIntegracionHv, habilitarCamaras } = getValues();
      const res = await clienteAxios.put("/api/configuracion/integraciones", {
        habilitarIntegracionHv,
        habilitarCamaras,
      });
      if (res.data.estado) {
        dispatch(
          updateConfig({
            habilitarIntegracionHv,
            habilitarCamaras,
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
        <Devices color="primary" sx={{ mr: 1 }} />{" "}
        <strong>Integraciones</strong>
      </Typography>
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong> Habilitar integración</strong>
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
          <SwitchElement
            label=""
            labelPlacement="start"
            name="habilitarIntegracionHv"
          />
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
