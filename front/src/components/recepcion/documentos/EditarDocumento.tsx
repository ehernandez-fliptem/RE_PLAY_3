import { Fragment, useEffect, useState } from "react";
import { Block, CheckCircle, Close, Image, Save } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import {
  FormContainer,
  SelectElement,
  SwitchElement,
} from "react-hook-form-mui";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import DocumentControl from "../../utils/DocumentControl";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { DatePicker } from "@mui/x-date-pickers";
import ProfilePicture from "../../utils/ProfilePicture";
import { showDialogComment } from "../../utils/functions/showDialogComment";

type FormValues = {
  tipo: string;
  estatus: number;
  documento: string;
  imagenes: string[];
  tiempo_indefinido?: boolean;
  fecha_entrada?: Dayjs;
  fecha_salida?: Dayjs;
};

const resolver = yup.object().shape({
  tipo: yup.string().required("Este campo es obligatorio."),
  estatus: yup
    .number()
    .min(1, "El estatus no puede ser menor a 1")
    .max(3, "El estatus no puede ser mayor a 3"),
  documento: yup
    .string()
    .test("isValidDoc", "Este campo es obligatorio.", (value, context) => {
      if (context.parent.tipo != 1) {
        return !!value;
      }
      return true;
    }),
  imagenes: yup
    .array()
    .of(yup.string())
    .test(
      "isValidIde",
      "Las imagenes de las identificaciones son obligatorias.",
      (value, context) => {
        if (context.parent.tipo == 1) {
          if (Array.isArray(value) && !!value[0] && !!value[1]) {
            return true;
          }
          return false;
        }
        return true;
      }
    ),
  tiempo_indefinido: yup.boolean(),
  fecha_entrada: yup
    .mixed()
    .test(
      "isAfter",
      "La fecha no puede ser mayor a la fecha de salida.",
      (value, context) => {
        if (dayjs.isDayjs(value) && value.isValid()) {
          return !dayjs(value).isAfter(dayjs(context.parent.fecha_salida));
        } else {
          return false;
        }
      }
    ),
  fecha_salida: yup
    .mixed()
    .test(
      "isFurther",
      "La fecha no puede ser menor a la fecha de entrada.",
      (value, context) => {
        if (dayjs.isDayjs(value) && value.isValid()) {
          return !dayjs(value).isBefore(dayjs(context.parent.fecha_entrada));
        } else {
          return false;
        }
      }
    ),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  tipo: "",
  estatus: 1,
  documento: "",
  imagenes: [],
  tiempo_indefinido: false,
  fecha_entrada: dayjs().startOf("month"),
  fecha_salida: dayjs().endOf("month"),
};

const IDENAMES = ["Frontal", "Reverso"];

const ESTATUS: Record<
  number,
  { nombre: string; color: "warning" | "error" | "success" }
> = {
  1: { nombre: "Por validar", color: "warning" },
  2: { nombre: "Rechazado", color: "error" },
  3: { nombre: "Aceptado", color: "success" },
};

export default function EditarDocumento() {
  const { id: ID } = useParams();
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const TIPOS_DOCS = Object.entries(tipos_documentos).map((item) => {
    return {
      id: item[0],
      label: item[1].nombre,
    };
  });
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/documentos/form-editar/${ID}`);
        if (res.data.estado) {
          const { documento } = res.data.datos;
          formContext.reset({
            ...initialValue,
            ...documento,
            fecha_entrada: dayjs(
              documento.fecha_entrada || initialValue.fecha_entrada
            ),
            fecha_salida: dayjs(
              documento.fecha_salida || initialValue.fecha_salida
            ),
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
  }, [formContext, ID]);

  const onSubmitDecline: SubmitHandler<FormValues> = async (data) => {
    let key = null;
    try {
      const { isSubmitted, result } = await showDialogComment({
        title: "Motivo del rechazo",
        label: "Comentarios",
        showCheckBox: true,
      });
      if (isSubmitted) {
        if (result?.check) {
          key = enqueueSnackbar(`Enviando correos`, {
            variant: "info",
            persist: true,
          });
        }
        const res = await clienteAxios.put(`api/documentos/${ID}`, {
          ...data,
          estatus: 2,
          motivo: result?.text,
          enviar_correo: result?.check,
        });

        if (res.data.estado) {
          if (key) closeSnackbar(key);
          if (result?.check) {
            const { correo_enviado } = res.data.datos;
            if (result?.check) {
              enqueueSnackbar(
                correo_enviado
                  ? "El correo al visitante se envió correctamente."
                  : "El correo al visitante no se envió correctamente.",
                { variant: correo_enviado ? "success" : "warning" }
              );
            } else {
              enqueueSnackbar("El documento se rechazó correctamente.", {
                variant: "success",
              });
            }
          } else {
            enqueueSnackbar("El documento se rechazó correctamente.", {
              variant: "success",
            });
          }
          parentGridDataRef.fetchRows();
          navigate("/validacion-documentos");
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      }
    } catch (error: unknown) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      if (key) closeSnackbar(key);
    }
  };

  const onSubmitSuccess: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.put(`api/documentos/${ID}`, {
        ...data,
        estatus: 3,
      });
      if (res.data.estado) {
        enqueueSnackbar("El documento se aceptó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/validacion-documentos");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const handleChange = (value: string) =>
    formContext.reset({
      tipo: value,
      estatus: 1,
      documento: "",
      imagenes: [],
      tiempo_indefinido: false,
      fecha_entrada: dayjs().startOf("month"),
      fecha_salida: dayjs().endOf("month"),
    });

  const regresar = () => {
    navigate("/validacion-documentos");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext}>
                <Controller
                  name="estatus"
                  control={formContext.control}
                  render={({ field }) => (
                    <Fragment>
                      <Typography
                        variant="h4"
                        component="h2"
                        textAlign="center"
                      >
                        Validar Documento -{" "}
                        <Chip
                          label={ESTATUS[field.value].nombre}
                          color={ESTATUS[field.value].color}
                        />
                      </Typography>
                    </Fragment>
                  )}
                />

                <SelectElement
                  label="Tipo de documento"
                  name="tipo"
                  options={TIPOS_DOCS}
                  fullWidth
                  margin="normal"
                  onChange={handleChange}
                />
                <Typography component="small" variant="caption">
                  * Recuerda revisar los documentos de manera estricta para
                  evitar que sea rechazado.
                </Typography>
                <Controller
                  name="tipo"
                  control={formContext.control}
                  render={({ field }) => {
                    if (!field.value) return <></>;
                    const isPdf =
                      tipos_documentos[
                        Number(field.value)
                      ].extensiones.includes("pdf");
                    const isImage =
                      tipos_documentos[
                        Number(field.value)
                      ].extensiones.includes("webp");
                    return (
                      <Fragment>
                        {isPdf && (
                          <DocumentControl
                            name="documento"
                            nameImg="imagenes"
                            label="Archivo"
                            disableEdit
                            required
                          />
                        )}
                        {isImage && (
                          <Controller
                            name="imagenes"
                            control={formContext.control}
                            render={({ field: fieldImg }) => (
                              <Grid container spacing={2}>
                                {Array.from({ length: 2 }, () => 0).map(
                                  (_item, i) => (
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                      <ProfilePicture
                                        key={i}
                                        name={`${fieldImg.name}.${i}`}
                                        label={`Identificación ${IDENAMES[i]}`}
                                        required
                                        adjustImageToBox
                                        disableEdit
                                        showViewButton
                                        variant="square"
                                        backgroundIcon={<Image />}
                                      />
                                    </Grid>
                                  )
                                )}
                              </Grid>
                            )}
                          />
                        )}
                      </Fragment>
                    );
                  }}
                />
                <Controller
                  name="tiempo_indefinido"
                  control={formContext.control}
                  render={({ field: fieldTiempo }) => {
                    return (
                      <Fragment>
                        {!fieldTiempo.value && (
                          <Fragment>
                            <Controller
                              name="fecha_entrada"
                              render={({ field, fieldState }) => (
                                <DatePicker
                                  {...field}
                                  label="Fecha de Inicio"
                                  name={field.name}
                                  value={field.value || dayjs()}
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
                            <Controller
                              name="fecha_salida"
                              render={({ field, fieldState }) => (
                                <DatePicker
                                  {...field}
                                  label="Fecha de Fin"
                                  name={field.name}
                                  value={field.value || dayjs()}
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
                          </Fragment>
                        )}
                        <Grid container spacing={2} sx={{ my: 2 }}>
                          <Grid size={{ xs: 12, sm: 10 }}>
                            <Stack spacing={0}>
                              <Typography variant="overline" component="h2">
                                <strong>Habilitar tiempo indefinido</strong>
                              </Typography>
                              <Typography
                                variant="body2"
                                component="span"
                                sx={{ ml: { xs: 0, sm: 2 } }}
                              >
                                <small>
                                  Esta opción permite que el documento sea usado
                                  sin límite de tiempo por los visitantes.
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
                              name={fieldTiempo.name}
                            />
                          </Grid>
                        </Grid>
                      </Fragment>
                    );
                  }}
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
                      type="button"
                      size="medium"
                      variant="contained"
                      color="secondary"
                      onClick={regresar}
                      startIcon={<Close />}
                    >
                      Cancelar
                    </Button>
                    <Controller
                      name="estatus"
                      control={formContext.control}
                      render={({ field }) => (
                        <Fragment>
                          {[1, 3].includes(field.value) && (
                            <Button
                              //   disabled={!formContext.formState.isValid}
                              type="button"
                              size="medium"
                              variant="contained"
                              color="error"
                              onClick={formContext.handleSubmit(
                                onSubmitDecline
                              )}
                              startIcon={<Block />}
                            >
                              Rechazar
                            </Button>
                          )}
                          {[1, 2, 3].includes(field.value) && (
                            <Button
                              //   disabled={!formContext.formState.isValid}
                              type="button"
                              size="medium"
                              variant="contained"
                              color={
                                [3].includes(field.value)
                                  ? "primary"
                                  : "success"
                              }
                              onClick={formContext.handleSubmit(
                                onSubmitSuccess
                              )}
                              startIcon={
                                [3].includes(field.value) ? (
                                  <Save />
                                ) : (
                                  <CheckCircle />
                                )
                              }
                            >
                              {[3].includes(field.value)
                                ? "Guardar"
                                : "Aceptar"}
                            </Button>
                          )}
                        </Fragment>
                      )}
                    />
                  </Stack>
                </Box>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
