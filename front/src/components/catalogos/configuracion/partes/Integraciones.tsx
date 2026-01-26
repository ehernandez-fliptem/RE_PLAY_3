import { Fragment } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { SwitchElement } from "react-hook-form-mui";
import { Devices } from "@mui/icons-material";

export default function Integraciones() {
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
    </Fragment>
  );
}
