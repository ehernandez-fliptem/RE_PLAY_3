import { Box, Button, InputAdornment, Stack } from "@mui/material";
import { Fragment, Suspense, useEffect, useState } from "react";
import {
  AutocompleteElement,
  Controller,
  FormProvider,
  SelectElement,
  TextFieldElement,
  useFormContext,
} from "react-hook-form-mui";
import ProfilePicturePreview from "../../../../../utils/fallbackRender/ProfilePicturePreview";
import ProfilePicture from "../../../../../utils/ProfilePicture";
import {
  Abc,
  Accessible,
  Close,
  DirectionsCar,
  Image,
  Save,
} from "@mui/icons-material";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import AutocompleteOcrInput from "../utils/AutocompleteOcrInput";

type Pases = {
  _id: string;
  codigo: string;
};

export default function FormEditarCitas() {
  const formContext = useFormContext();
  const [isLoading, setIsLoading] = useState(true);
  const [pases, setPases] = useState<Pases[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const res = await clienteAxios.get("/api/pases/activos");
        if (res.data.estado) {
          setPases(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistros();
  }, []);

  const regresar = () => {
    navigate("/bitacora", { replace: true });
  };
  return (
    <Fragment>
      <FormProvider {...formContext}>
        <SelectElement
          name="tipo_ide"
          label="Tipo de Identificación"
          required
          fullWidth
          margin="normal"
          options={[
            {
              id: "1",
              label: "Oficial",
            },
            {
              id: "2",
              label: "Licencia de Conducir",
            },
            {
              id: "3",
              label: "Pasaporte",
            },
            {
              id: "4",
              label: "Otro",
            },
          ]}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
          }}
        >
          <Controller
            name="img_usuario"
            render={({ field: { name } }) => {
              return (
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    required
                    label="Visitante"
                    name={name}
                    allowFiles={["png", "jpeg", "jpg"]}
                  />
                </Suspense>
              );
            }}
          />
          <Controller
            name="img_ide_a"
            render={({ field: { name } }) => (
              <Suspense fallback={<ProfilePicturePreview />}>
                <ProfilePicture
                  required
                  adjustImageToBox
                  backgroundIcon={<Image />}
                  variant="square"
                  label="Identificación Frontal"
                  name={name}
                  allowFiles={["png", "jpeg", "jpg"]}
                />
              </Suspense>
            )}
          />
          <Controller
            name="img_ide_b"
            render={({ field: { name } }) => (
              <Suspense fallback={<ProfilePicturePreview />}>
                <ProfilePicture
                  required
                  adjustImageToBox
                  backgroundIcon={<Image />}
                  variant="square"
                  label="Identificación Reverso"
                  name={name}
                  allowFiles={["png", "jpeg", "jpg"]}
                />
              </Suspense>
            )}
          />
        </Stack>
        <AutocompleteOcrInput
          parentImgName="img_ide_b"
          textFieldProps={{
            name: "numero_ide",
            label: "Número de identificación",
            required: true,
            fullWidth: true,
            margin: "normal",
          }}
        />
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
        <AutocompleteElement
          name="id_pase"
          label="Pase"
          matchId
          loading={isLoading}
          options={pases.map((item) => {
            return { id: item._id, label: item.codigo };
          })}
          textFieldProps={{
            margin: "normal",
          }}
          autocompleteProps={{
            noOptionsText: "No hay opciones.",
          }}
        />
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
