import { Fragment } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import {
  Controller,
  SwitchElement,
  TextFieldElement,
} from "react-hook-form-mui";

export default function CheckAuth() {
  return (
    <Fragment>
      <Typography variant="overline" component="h2" sx={{ mb: 2 }}>
        <strong>Check In / Out</strong>
      </Typography>
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong>Validar horario de usuarios</strong>
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: { xs: 0, sm: 2 } }}
            >
              <small>
                Esta opción válida si los usuarios están respetando el horario
                asignado al hacer Check In/Out, en caso contrario, se pedirá
                autorización a un usuario recepcionista.
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
            name="validarHorario"
          />
        </Grid>
      </Grid>
      <Controller
        name="validarHorario"
        render={({ field }) => (
          <Fragment>
            <Grid container spacing={2} sx={{ my: 2 }}>
              <Grid size={{ xs: 12, sm: 10 }}>
                <Stack spacing={0}>
                  <Typography variant="overline" component="h2">
                    <strong>Autorizar accesos y salidas Check In / Out</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ ml: { xs: 0, sm: 2 } }}
                  >
                    <small>
                      Esta opción habilita que los usuarios que no cumplan con
                      el horario asignado, puedan solicitar el acceso a un
                      usuario recepcionista.
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
                  name="autorizacionCheck"
                  disabled={!field.value}
                />
              </Grid>
            </Grid>
          </Fragment>
        )}
      />

      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Stack spacing={0}>
            <Typography variant="overline" component="h2">
              <strong>Notificar accesos y salidas Check In / Out</strong>
            </Typography>
            <Typography
              variant="body2"
              component="span"
              sx={{ ml: { xs: 0, sm: 2 } }}
            >
              <small>
                Esta opción habilita la notificación de la autorización de Check
                In/Out a los correos asignados.
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
            name="notificarCheck"
          />
        </Grid>
      </Grid>
      <Controller
        name="notificarCheck"
        render={({ field }) => (
          <Fragment>
            <TextFieldElement
              label="Correo primario para notificación"
              name="correoUnoAutorizacion"
              fullWidth
              margin="normal"
              disabled={!field.value}
            />
            <TextFieldElement
              label="Correo secundario para notificación"
              name="correoDosAutorizacion"
              fullWidth
              margin="normal"
              disabled={!field.value}
            />
          </Fragment>
        )}
      />
    </Fragment>
  );
}
