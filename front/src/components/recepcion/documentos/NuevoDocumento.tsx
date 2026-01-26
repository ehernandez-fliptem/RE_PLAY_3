import { Fragment, useEffect, useState } from "react";
import { Close, Image, Save } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormHelperText,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer, SelectElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import DocumentControl from "../../utils/DocumentControl";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import ProfilePicture from "../../utils/ProfilePicture";

type TiposDocsEntrance = {
  tipo: number;
  nombre: string;
  extensiones: string[];
};

type TiposDocs = {
  id: string;
  label: string;
  extensiones: string[];
};

type FormValues = {
  tipo: string;
  documento: string;
  imagenes: string[];
};

const resolver = yup.object().shape({
  tipo: yup.string().required("Este campo es obligatorio."),
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
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  tipo: "",
  documento: "",
  imagenes: [],
};

const IDENAMES = ["Frontal", "Reverso"];

export default function NuevoDocumento() {
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
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
  const [TIPOS_DOCS, setTipos_documentos] = useState<TiposDocs[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/documentos/form-nuevo`);
        if (res.data.estado) {
          const { tipos_documentos } = res.data.datos;
          setTipos_documentos(
            tipos_documentos.map((item: TiposDocsEntrance) => {
              return {
                id: item.tipo,
                label: item.nombre,
                extensiones: item.extensiones,
              };
            })
          );
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
      const res = await clienteAxios.post("api/documentos", data);
      if (res.data.estado) {
        enqueueSnackbar("El documento se creó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/documentos");
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
      documento: "",
      imagenes: [],
    });

  const regresar = () => {
    navigate("/documentos");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Nuevo Documento
                </Typography>
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
                          <Fragment>
                            <DocumentControl
                              name="documento"
                              nameImg="imagenes"
                              label="Archivo"
                              required
                            />
                            <Typography component="small" variant="caption">
                              * Los únicos archivos que se aceptan son PDF, con
                              un máximo de 500KB de tamaño
                            </Typography>
                          </Fragment>
                        )}
                        {isImage && (
                          <Fragment>
                            <Controller
                              name="imagenes"
                              control={formContext.control}
                              render={({
                                field: fieldImg,
                                fieldState: fieldStateImg,
                              }) => (
                                <Grid container spacing={2}>
                                  {Array.from({ length: 2 }, () => 0).map(
                                    (_item, i) => (
                                      <Grid
                                        key={i}
                                        size={{ xs: 12, sm: 6 }}
                                        sx={(theme) => ({
                                          bgcolor: fieldStateImg.error
                                            ? alpha(
                                                theme.palette.error.light,
                                                0.2
                                              )
                                            : ``,
                                          border: fieldStateImg.error
                                            ? `1px solid ${theme.palette.error.main}`
                                            : 0,
                                        })}
                                      >
                                        <ProfilePicture
                                          name={`${fieldImg.name}.${i}`}
                                          label={`Identificación ${IDENAMES[i]}`}
                                          required
                                          adjustImageToBox
                                          variant="square"
                                          backgroundIcon={<Image />}
                                        />
                                      </Grid>
                                    )
                                  )}
                                  {fieldStateImg.error && (
                                    <FormHelperText error>
                                      {fieldStateImg.error.message}
                                    </FormHelperText>
                                  )}
                                </Grid>
                              )}
                            />
                            <Typography component="small" variant="caption">
                              * Los únicos archivos que se aceptan son png, jpg
                              y jpeg.
                            </Typography>
                          </Fragment>
                        )}
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
    </ModalContainer>
  );
}
