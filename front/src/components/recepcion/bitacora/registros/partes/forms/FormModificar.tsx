import { Box, Button, InputAdornment, Stack } from "@mui/material";
import { Fragment, useEffect, useState } from "react";
import {
  AutocompleteElement,
  Controller,
  FormProvider,
  TextFieldElement,
  useFormContext,
} from "react-hook-form-mui";

import {
  Abc,
  Accessible,
  Close,
  DirectionsCar,
  Save,
} from "@mui/icons-material";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import Accesos from "../steps/Accesos/Accesos";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

type Usuarios = {
  _id: string;
  nombre: string;
};

export default function FormModificar() {
  const formContext = useFormContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [anfitriones, setAnfitriones] = useState<Usuarios[]>([]);

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const res = await clienteAxios.get(`/api/registros/form-nuevo`);
        if (res.data.estado) {
          const { anfitriones } = res.data.datos;
          setAnfitriones(anfitriones);
          if (anfitriones.length === 1) {
            formContext.setValue("id_anfitrion", anfitriones[0]._id);
            formContext.clearErrors("id_anfitrion");
          }
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistros();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regresar = () => {
    navigate("/bitacora", { replace: true });
  };

  return (
    <Fragment>
      <FormProvider {...formContext}>
        <TextFieldElement
          name="nombre"
          label="Nombre"
          required
          fullWidth
          margin="normal"
        />
        <TextFieldElement
          name="apellido_pat"
          label="Apellido Paterno"
          required
          fullWidth
          margin="normal"
        />
        <TextFieldElement
          name="apellido_mat"
          label="Apellido Materno"
          fullWidth
          margin="normal"
        />
        <Controller
          name="fecha_entrada"
          render={({ field, fieldState }) => (
            <DateTimePicker
              {...field}
              label="Fecha de Entrada"
              name={field.name}
              value={dayjs(field.value) || dayjs()}
              minDate={dayjs()}
              onChange={(value) => field.onChange(value)}
              slotProps={{
                textField: {
                  required: true,
                  margin: "normal",
                  fullWidth: true,
                  size: "small",
                  error: !!fieldState.error?.message,
                  helperText: fieldState.error?.message,
                },
              }}
            />
          )}
        />
        <AutocompleteElement
          name="id_anfitrion"
          label="Persona a Visitar"
          required
          matchId
          loading={isLoading}
          options={anfitriones.map((item) => {
            return { id: item._id, label: item.nombre };
          })}
          textFieldProps={{
            margin: "normal",
          }}
          autocompleteProps={{
            noOptionsText: "No hay opciones.",
          }}
        />
        <TextFieldElement
          name="actividades"
          label="Actividades"
          required
          fullWidth
          margin="normal"
        />
        <Accesos name="accesos" label="Acceso(s)" />
        <TextFieldElement
          name="comentarios"
          label="Comentarios"
          fullWidth
          margin="normal"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Accessible />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextFieldElement
          name="placas"
          label="Placas del Vehículo"
          fullWidth
          margin="normal"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Abc />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextFieldElement
          name="desc_vehiculo"
          label="Descripción del Vehículo"
          fullWidth
          margin="normal"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <DirectionsCar />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box
          component="footer"
          sx={{
            display: "flex",
            justifyContent: "end",
            mt: 3,
            mb: 0.5,
          }}
        >
          <Stack
            spacing={2}
            direction={{ xs: "column-reverse", sm: "row" }}
            justifyContent="end"
            sx={{ width: "100%" }}
          >
            <Button
              type="button"
              size="medium"
              variant="contained"
              color="secondary"
              onClick={regresar}
              startIcon={<Close />}
            >
              Cancelar
            </Button>
            <Button
              disabled={!formContext.formState.isDirty}
              type="submit"
              size="medium"
              variant="contained"
              startIcon={<Save />}
            >
              Guardar
            </Button>
          </Stack>
        </Box>
      </FormProvider>
    </Fragment>
  );
}
