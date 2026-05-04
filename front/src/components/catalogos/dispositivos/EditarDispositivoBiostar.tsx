import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Box, Button, Card, CardContent, Divider, Grid, IconButton, InputAdornment, Stack, Typography } from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { Close, NetworkCheck, Save, Visibility, VisibilityOff } from "@mui/icons-material";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { REGEX_IP, REGEX_USERNAME } from "../../../app/constants/CommonRegex";

type FormValues = {
  nombre: string;
  direccion_ip: string;
  puerto: number;
  usuario: string;
  contrasena: string;
};

const resolver = yup.object().shape({
  nombre: yup.string().required("Este campo es obligatorio."),
  direccion_ip: yup.string().required("Este campo es obligatorio").matches(REGEX_IP, "Formato invalido"),
  puerto: yup.number().required("Este campo es obligatorio").min(1).max(65535),
  usuario: yup.string().required("Este campo es obligatorio.").matches(REGEX_USERNAME, "Formato de usuario invalido."),
  contrasena: yup.string().notRequired(),
}) as yup.ObjectSchema<FormValues>;

export default function EditarDispositivoBiostar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const formContext = useForm<FormValues>({
    defaultValues: { nombre: "", direccion_ip: "", puerto: 443, usuario: "", contrasena: "" },
    resolver: yupResolver(resolver),
    mode: "all",
  });

  useEffect(() => {
    const run = async () => {
      try {
        const res = await clienteAxios.get(`/api/dispositivos-biostar/${id}`);
        if (res.data.estado) {
          formContext.reset({
            nombre: res.data.datos.nombre,
            direccion_ip: res.data.datos.direccion_ip,
            puerto: res.data.datos.puerto || 443,
            usuario: res.data.datos.usuario,
            contrasena: "",
          });
        }
      } catch (error) {
        handlingError(error);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [formContext, id]);

  const testConnection: SubmitHandler<FormValues> = async (data) => {
    try {
      const payload = data.contrasena?.trim() ? data : { ...data, contrasena: undefined };
      const res = await clienteAxios.post(`/api/dispositivos-biostar/probar-conexion/${id}`, payload);
      enqueueSnackbar(res.data.mensaje || (res.data.estado ? "Conexion correcta." : "No se pudo conectar."), {
        variant: res.data.estado ? "success" : "warning",
      });
    } catch (error) {
      handlingError(error);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.put(`/api/dispositivos-biostar/${id}`, data);
      if (res.data.estado) {
        enqueueSnackbar("Dispositivo actualizado correctamente.", { variant: "success" });
        parentGridDataRef?.fetchRows();
        navigate("/dispositivos-biostar");
      } else {
        enqueueSnackbar(res.data.mensaje || "No se pudo actualizar el dispositivo.", { variant: "warning" });
      }
    } catch (error) {
      handlingError(error);
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "sm" }}>
      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Editar Dispositivo BioStar
      </Typography>
      {isLoading ? (
        <Spinner />
      ) : (
        <FormContainer formContext={formContext} onSuccess={onSubmit}>
          <Card elevation={0}>
            <CardContent>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextFieldElement name="nombre" label="Nombre" required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextFieldElement name="direccion_ip" label="Direccion IP" required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextFieldElement name="puerto" label="Puerto" required fullWidth type="number" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextFieldElement name="usuario" label="Usuario" required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextFieldElement
                      name="contrasena"
                      label="Contrasena (dejar vacia para no cambiar)"
                      fullWidth
                      type={showPassword ? "text" : "password"}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                </Grid>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Button startIcon={<NetworkCheck />} onClick={formContext.handleSubmit(testConnection)}>
                    Probar conexion
                  </Button>
                  <Stack direction="row" spacing={1}>
                    <Button startIcon={<Close />} onClick={() => navigate("/dispositivos-biostar")}>Cancelar</Button>
                    <Button type="submit" variant="contained" startIcon={<Save />}>
                      Guardar
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </FormContainer>
      )}
    </ModalContainer>
  );
}
