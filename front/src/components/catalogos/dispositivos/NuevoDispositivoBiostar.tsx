import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { Close, Save, Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import ModalContainer from "../../utils/ModalContainer";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Swal from "sweetalert2";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
  REGEX_IP,
  REGEX_USERNAME,
} from "../../../app/constants/CommonRegex";
import PasswordValidAdornment from "../../utils/PasswordValidAdornment";

type FormValues = {
  nombre: string;
  direccion_ip: string;
  puerto: number;
  modo_acceso: "entrada" | "salida" | "ambos";
  id_acceso: string;
  apertura_destino_habilitada: "si" | "no";
  apertura_puerta_id: string;
  apertura_puerta_nombre?: string;
  usuario: string;
  contrasena: string;
};

const resolver = yup.object().shape({
  nombre: yup.string().required("Este campo es obligatorio."),
  direccion_ip: yup
    .string()
    .required("Este campo es obligatorio")
    .matches(REGEX_IP, "Formato invalido"),
  puerto: yup.number().required("Este campo es obligatorio").min(1).max(65535),
  modo_acceso: yup
    .mixed<"entrada" | "salida" | "ambos">()
    .oneOf(["entrada", "salida", "ambos"])
    .required("Este campo es obligatorio."),
  id_acceso: yup.string().default(""),
  apertura_destino_habilitada: yup.mixed<"si" | "no">().oneOf(["si", "no"]).default("no"),
  apertura_puerta_id: yup.string().default(""),
  usuario: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_USERNAME, "Formato de usuario invalido."),
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

const initialValue: FormValues = {
  nombre: "",
  direccion_ip: "",
  puerto: 443,
  modo_acceso: "ambos",
  id_acceso: "",
  apertura_destino_habilitada: "no",
  apertura_puerta_id: "",
  apertura_puerta_nombre: "",
  usuario: "",
  contrasena: "",
};

export default function NuevoDispositivoBiostar() {
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formContext = useForm<FormValues>({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    mode: "all",
  });

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

      const payload = {
        ...data,
        apertura_destino_habilitada: data.apertura_destino_habilitada === "si",
        apertura_puerta_nombre: data.apertura_puerta_nombre || "",
      };

      const testRes = await clienteAxios.post(
        "/api/dispositivos-biostar/probar-conexion",
        payload
      );

      if (!testRes.data.estado) {
        await Swal.fire({
          icon: "error",
          title: "Sin conexion",
          text: testRes.data.mensaje || "No se pudo conectar con Suprema.",
        });
        return;
      }

      const saveRes = await clienteAxios.post("/api/dispositivos-biostar", payload);
      if (saveRes.data.estado) {
        await Swal.fire({
          icon: "success",
          title: "Guardado",
          text: "Dispositivo creado correctamente.",
        });
        parentGridDataRef?.fetchRows();
        navigate("/biostarar/conexion");
      } else {
        await Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text: saveRes.data.mensaje || "No se pudo crear el dispositivo.",
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
            <FormContainer formContext={formContext} onSuccess={onSubmit}>
              <Typography variant="h4" sx={{ mt: 1, mb: 2, textAlign: "center" }}>
                Nuevo Dispositivo
              </Typography>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextFieldElement
                      name="direccion_ip"
                      label="Direccion IP"
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextFieldElement
                      name="puerto"
                      label="Puerto"
                      required
                      fullWidth
                      type="number"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextFieldElement name="nombre" label="Nombre" required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextFieldElement name="usuario" label="Usuario" required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextFieldElement
                      name="contrasena"
                      label="Contrasena"
                      required
                      fullWidth
                      type={showPassword ? "text" : "password"}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword((v) => !v)}
                                edge="end"
                              >
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
                    <Button
                      startIcon={<Close />}
                      onClick={() => navigate("/biostarar/conexion")}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={isSaving}
                    >
                      Guardar
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </FormContainer>
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
