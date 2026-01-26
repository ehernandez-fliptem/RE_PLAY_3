import { SmartToy } from "@mui/icons-material";
import { FormLabel, Grid, Stack, Typography } from "@mui/material";
import { Fragment } from "react";
import { SwitchElement, TextFieldElement } from "react-hook-form-mui";

export default function Bot() {
  return (
    <Fragment>
      <Typography
        variant="overline"
        component="h2"
        sx={{ mb: 2 }}
        display="flex"
        alignItems="center"
      >
        <SmartToy color="primary" sx={{ mr: 1 }} /> <strong>Bot</strong>
      </Typography>
      <Grid container spacing={2}>
        <Grid
          size={{ xs: 12, md: 10 }}
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <FormLabel
            sx={(theme) => ({
              color: theme.palette.text.primary,
              fontSize: theme.typography.body2,
            })}
          >
            Tiempo de espera entre cada reconocimiento en segundos.
          </FormLabel>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextFieldElement
            name="delayProximaFoto"
            type="number"
            required
            fullWidth
            slotProps={{
              input: {
                inputProps: {
                  inputMode: "numeric",
                  min: 1,
                  max: 60,
                },
              },
            }}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong> Habilitar cámaras para accesos</strong>
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: { xs: 0, sm: 2 } }}
            >
              <small>
                Esta opción habilita el uso de cámaras de seguridad para el uso
                del reconocimiento facial.
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
            name="habilitarCamaras"
          />
        </Grid>
      </Grid>
    </Fragment>
  );
}
