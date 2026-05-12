import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Box, Button, Card, CardContent, Divider, Grid, IconButton, InputAdornment, Stack, Typography } from "@mui/material";
import { FormContainer, SelectElement, TextFieldElement } from "react-hook-form-mui";
import { Close, Save, Visibility, VisibilityOff } from "@mui/icons-material";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
  REGEX_IP,
  REGEX_USERNAME,
} from "../../../app/constants/CommonRegex";
import PasswordValidAdornment from "../../utils/PasswordValidAdornment";
import Swal from "sweetalert2";

type FormValues = {
  nombre: string;
  direccion_ip: string;
  puerto: number;
  modo_acceso: "entrada" | "salida" | "ambos";
  usuario: string;
  contrasena: string;
};

const resolver = yup.object().shape({
  nombre: yup.string().required("Este campo es obligatorio."),
  direccion_ip: yup.string().required("Este campo es obligatorio").matches(REGEX_IP, "Formato invalido"),
  puerto: yup.number().required("Este campo es obligatorio").min(1).max(65535),
  modo_acceso: yup
    .mixed<"entrada" | "salida" | "ambos">()
    .oneOf(["entrada", "salida", "ambos"])
    .required("Este campo es obligatorio."),
  usuario: yup.string().required("Este campo es obligatorio.").matches(REGEX_USERNAME, "Formato de usuario invalido."),
  contrasena: yup
    .string()
    .required("Este campo es obligatorio.")
    .min(8, "La contrasena debe contener minimo 8 caracteres.")
    .test("isValidPass", "", (value) => {
      const hasUpperCase = HASUPPERCASE.test(value || "");
      const hasNumber = HASNUMBER.test(value || "");
      const hasLowerCase = HASLOWERCASE.test(value || "");
      const hasSymbole = HASSYMBOLE.test(value || "");
      const conditions = [hasUpperCase, hasLowerCase, hasNumber, hasSymbole];
      return conditions.filter(Boolean).length >= 4;
    }),
}) as yup.ObjectSchema<FormValues>;

export default function EditarDispositivoBiostar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formContext = useForm<FormValues>({
    defaultValues: { nombre: "", direccion_ip: "", puerto: 443, modo_acceso: "ambos", usuario: "", contrasena: "" },
    resolver: yupResolver(resolver),
    mode: "all",
  });

  useEffect(() => {
    const run = async () => {
      try {
        const res = await clienteAxios.get(`/api/dispositivos-biostar/form-editar/${id}`);
        if (res.data.estado) {
          formContext.reset({
            nombre: res.data.datos.nombre,
            direccion_ip: res.data.datos.direccion_ip,
            puerto: res.data.datos.puerto || 443,
            modo_acceso: res.data.datos.modo_acceso || "ambos",
            usuario: res.data.datos.usuario,
            contrasena: res.data.datos.contrasena || "",
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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      setIsSaving(true);
      Swal.fire({
        title: "Validando conexion...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const testRes = await clienteAxios.post(`/api/dispositivos-biostar/probar-conexion/${id}`, data);
      if (!testRes.data.estado) {
        await Swal.fire({
          icon: "error",
          title: "Sin conexion",
          text: testRes.data.mensaje || "No se pudo conectar con Suprema.",
        });
        return;
      }

      const res = await clienteAxios.put(`/api/dispositivos-biostar/${id}`, data);
      if (res.data.estado) {
        await Swal.fire({
          icon: "success",
          title: "Guardado",
          text: "Dispositivo actualizado correctamente.",
        });
        parentGridDataRef?.fetchRows();
        navigate("/biostarar/conexion");
      } else {
        await Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text: res.data.mensaje || "No se pudo actualizar el dispositivo.",
        });
      }
    } catch (error) {
      handlingError(error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrio un error al guardar el dispositivo.",
      });
    } finally {
      Swal.close();
      setIsSaving(false);
    }
  };

  return (
    <ModalContainer
      modalProps={{ sx: { display: isSaving ? "none" : "block" } }}
      containerProps={{ maxWidth: "md" }}
    >
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            <Typography variant="h4" sx={{ mt: 1, mb: 2, textAlign: "center" }}>
              Editar Dispositivo Suprema
            </Typography>
            {isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <TextFieldElement name="direccion_ip" label="Direccion IP" required fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextFieldElement name="puerto" label="Puerto" required fullWidth type="number" />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextFieldElement name="nombre" label="Nombre" required fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <SelectElement
                        name="modo_acceso"
                        label="Tipo de acceso"
                        required
                        fullWidth
                        options={[
                          { id: "entrada", label: "Entrada" },
                          { id: "salida", label: "Salida" },
                          { id: "ambos", label: "Ambos (alterna)" },
                        ]}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextFieldElement name="usuario" label="Usuario" required fullWidth />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextFieldElement
                        name="contrasena"
                        label="Contrasena"
                        fullWidth
                        required
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
                    <Grid size={{ xs: 12 }}>
                      <PasswordValidAdornment name="contrasena" />
                    </Grid>
                  </Grid>
                  <Divider />
                  <Box display="flex" justifyContent="end">
                    <Stack direction="row" spacing={1}>
                      <Button startIcon={<Close />} onClick={() => navigate("/biostarar/conexion")}>Cancelar</Button>
                      <Button type="submit" variant="contained" startIcon={<Save />} disabled={isSaving}>
                        Guardar
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
