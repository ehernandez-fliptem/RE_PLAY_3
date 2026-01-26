import { Fragment, useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as yup from "yup";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { setFormErrors } from "../../helpers/formHelper";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer } from "react-hook-form-mui";
import { Save } from "@mui/icons-material";
import Spinner from "../../utils/Spinner";
import { REGEX_BASE64, REGEX_HEX } from "../../../app/constants/CommonRegex";

import General from "./partes/General";
import Bitacora from "./partes/Bitacora";
import Integraciones from "./partes/Integraciones";
import Bot from "./partes/Bot";
import { useDispatch } from "react-redux";
import { updateConfig } from "../../../app/features/config/configSlice";
import ColorPalette from "./partes/ColorPalette";
import type { ColorPalette as TColorPalette } from "../../../types/theme";
import { defaultColorPalette } from "../../../themes/defaultTheme";
import ColorCollections from "./partes/ColorCollections";

type Colleciones = {
  tipo?: number;
  rol?: number;
  nombre: string;
  descripcion?: string;
  color: string;
};

type FormValues = {
  appNombre: string;
  zonaHoraria: string;
  imgCorreo: string;
  saludaCorreo: string;
  despedidaCorreo: string;
  delayProximaFoto: number;
  tiempoFotoVisita: number;
  tiempoCancelacionRegistros: string;
  tiempoToleranciaEntrada: string;
  habilitarIntegracionHv: boolean;
  habilitarCamaras: boolean;
  validarHorario: boolean;
  notificarCheck: boolean;
  autorizacionCheck: boolean;
  correoUnoAutorizacion?: string;
  correoDosAutorizacion?: string;
  palette: TColorPalette;
  tipos_registros: Colleciones[];
  tipos_documentos: Colleciones[];
  tipos_eventos: Colleciones[];
  roles: Colleciones[];
  tipos_dispositivos: Colleciones[];
};

const colorsResolver = yup.object().shape({
  main: yup.string().matches(REGEX_HEX, { message: "El color no es válido." }),
  dark: yup
    .string()
    .notRequired()
    .matches(REGEX_HEX, { message: "El color no es válido." }),
  light: yup
    .string()
    .notRequired()
    .matches(REGEX_HEX, { message: "El color no es válido." }),
  contrast: yup
    .string()
    .notRequired()
    .matches(REGEX_HEX, { message: "El color no es válido." }),
});

const resolver = yup.object().shape({
  appNombre: yup.string().required("Este campo es obligatorio."),
  zonaHoraria: yup.string().required("Este campo es obligatorio."),
  imgCorreo: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de usuario debe ser una URL válida.",
      (value) => {
        if (value) {
          const hasUri = REGEX_BASE64.test(value);
          if (hasUri) {
            return true;
          }
          return false;
        } else {
          return false;
        }
      }
    ),
  saludaCorreo: yup
    .string()
    .max(100, "El saludo debe ser de máximo 100 caracteres")
    .required("Este campo es obligatorio."),
  despedidaCorreo: yup
    .string()
    .max(100, "La despedida debe ser de máximo 100 caracteres")
    .required("Este campo es obligatorio."),
  delayProximaFoto: yup.number().required("Este campo es obligatorio."),
  tiempoFotoVisita: yup.number().required("Este campo es obligatorio."),
  tiempoCancelacionRegistros: yup
    .string()
    .required("Este campo es obligatorio."),
  tiempoToleranciaEntrada: yup.string().required("Este campo es obligatorio."),
  habilitarIntegracionHv: yup.boolean().required("Este campo es obligatorio."),
  habilitarCamaras: yup.boolean().required("Este campo es obligatorio."),
  validarHorario: yup.boolean().required("Este campo es obligatorio."),
  notificarCheck: yup.boolean().required("Este campo es obligatorio."),
  autorizacionCheck: yup.boolean().required("Este campo es obligatorio."),
  correoUnoAutorizacion: yup.string().email(),
  correoDosAutorizacion: yup.string().email(),
  palette: yup.object().shape({
    primary: colorsResolver,
    secondary: colorsResolver,
    error: colorsResolver,
    warning: colorsResolver,
    info: colorsResolver,
    success: colorsResolver,
  }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  appNombre: "",
  zonaHoraria: "",
  imgCorreo: "",
  saludaCorreo: "",
  despedidaCorreo: "",
  delayProximaFoto: 5,
  tiempoFotoVisita: 5,
  tiempoCancelacionRegistros: "30/m",
  tiempoToleranciaEntrada: "30/m",
  habilitarIntegracionHv: false,
  habilitarCamaras: false,

  validarHorario: false,
  notificarCheck: false,
  autorizacionCheck: false,
  correoUnoAutorizacion: "",
  correoDosAutorizacion: "",
  palette: defaultColorPalette,
  tipos_registros: [],
  tipos_documentos: [],
  tipos_eventos: [],
  roles: [],
  tipos_dispositivos: [],
};

export default function Configuracion() {
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get("/api/configuracion");
        if (res.data.estado) {
          const {
            configuracion,
            tipos_eventos,
            tipos_registros,
            tipos_dispositivos,
            tipos_documentos,
            roles,
          } = res.data.datos;
          formContext.reset({
            ...configuracion,
            palette: {
              ...defaultColorPalette,
              ...configuracion.palette,
            },
            tipos_eventos,
            tipos_registros,
            tipos_dispositivos,
            tipos_documentos,
            roles,
          });
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { erroresForm } = handlingError(error);
        if (erroresForm) setFormErrors(formContext.setError, erroresForm);
      }
    };
    obtenerRegistro();
  }, [formContext]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const {
        tipos_registros,
        tipos_documentos,
        tipos_eventos,
        roles,
        tipos_dispositivos,
        ...configuracion
      } = data;
      const res = await Promise.all([
        clienteAxios.put("api/configuracion", {
          configuracion,
        }),
        clienteAxios.put("api/configuracion/colecciones", {
          tipos_registros,
          tipos_documentos,
          tipos_eventos,
          roles,
          tipos_dispositivos,
        }),
      ]);
      const firstPromised = res[0];
      const secondPromised = res[1];

      if (firstPromised.data.estado) {
        enqueueSnackbar("La configuración se modificó correctamente.", {
          variant: "success",
        });
        dispatch(
          updateConfig({
            ...configuracion,
          })
        );
      } else {
        enqueueSnackbar(firstPromised.data.mensaje, { variant: "warning" });
      }
      if (secondPromised.data.estado) {
        const {
          tipos_registros,
          tipos_documentos,
          tipos_eventos,
          roles,
          tipos_dispositivos,
        } = secondPromised.data.datos;
        enqueueSnackbar("Las colecciones se modificaron correctamente.", {
          variant: "success",
        });
        const obj_tipos_eventos = tipos_eventos
          ? tipos_eventos.reduce(
              (
                a: object,
                v: {
                  tipo: number;
                  nombre: string;
                  color: string;
                }
              ) => ({
                ...a,
                [v.tipo]: { nombre: v.nombre, color: v.color },
              }),
              {}
            )
          : null;
        const obj_roles = roles
          ? roles.reduce(
              (
                a: object,
                v: { rol: number; nombre: string; color: string }
              ) => ({
                ...a,
                [v.rol]: { nombre: v.nombre, color: v.color },
              }),
              {}
            )
          : null;
        const obj_tipos_registros = tipos_registros
          ? tipos_registros.reduce(
              (
                a: object,
                v: {
                  tipo: number;
                  nombre: string;
                  descripcion: string;
                  color: string;
                }
              ) => ({
                ...a,
                [v.tipo]: {
                  nombre: v.nombre,
                  descripcion: v.descripcion,
                  color: v.color,
                },
              }),
              {}
            )
          : null;
        const obj_tipos_dispositivos = tipos_dispositivos
          ? tipos_dispositivos.reduce(
              (
                a: object,
                v: {
                  tipo: number;
                  nombre: string;
                  color: string;
                }
              ) => ({
                ...a,
                [v.tipo]: {
                  nombre: v.nombre,
                  color: v.color,
                },
              }),
              {}
            )
          : null;
        const obj_tipos_documentos = tipos_documentos
          ? tipos_documentos.reduce(
              (
                a: object,
                v: {
                  tipo: number;
                  nombre: string;
                  descripcion: string;
                  extensiones: string;
                  color: string;
                }
              ) => ({
                ...a,
                [v.tipo]: {
                  nombre: v.nombre,
                  descripcion: v.descripcion,
                  extensiones: v.extensiones,
                  color: v.color,
                },
              }),
              {}
            )
          : null;
        dispatch(
          updateConfig({
            ...configuracion,
            tipos_eventos: obj_tipos_eventos,
            roles: obj_roles,
            tipos_registros: obj_tipos_registros,
            tipos_dispositivos: obj_tipos_dispositivos,
            tipos_documentos: obj_tipos_documentos,
          })
        );
      } else {
        enqueueSnackbar(secondPromised.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  return (
    <Fragment>
      <Box component="section">
        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${lighten(
              alpha(theme.palette.divider, 0.3),
              0.88
            )}`,
          })}
        >
          <CardContent>
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Configuración
                </Typography>
                <General />
                <Divider sx={{ my: 2 }} />
                <Bitacora />
                <Divider sx={{ my: 2 }} />
                <Bot />
                <Divider sx={{ my: 2 }} />
                <Integraciones />
                <Divider sx={{ my: 2 }} />
                <ColorPalette />
                <Divider sx={{ my: 2 }} />
                <ColorCollections
                  name="tipos_registros"
                  label="Tipo de registros"
                />
                <Divider sx={{ my: 2 }} />

                <ColorCollections
                  name="tipos_documentos"
                  label="Tipo de documentos"
                />
                <Divider sx={{ my: 2 }} />

                <ColorCollections
                  name="tipos_eventos"
                  label="Tipo de eventos"
                />
                <Divider sx={{ my: 2 }} />

                <ColorCollections name="roles" label="Tipo de roles" />
                <Divider sx={{ my: 2 }} />

                <ColorCollections
                  name="tipos_dispositivos"
                  label="Tipo de dispositivos"
                />
                <Divider sx={{ my: 2 }} />
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
                      disabled={!formContext.formState.isValid}
                      type="submit"
                      size="medium"
                      variant="contained"
                      startIcon={<Save />}
                    >
                      Guardar
                    </Button>
                  </Stack>
                </Box>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </Fragment>
  );
}
