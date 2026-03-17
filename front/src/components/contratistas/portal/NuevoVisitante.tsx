import { ChevronLeft, Save } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { REGEX_EMAIL, REGEX_NAME, REGEX_PHONE } from "../../../app/constants/CommonRegex";

type DocChecks = {
  identificacion_oficial: boolean;
  sua: boolean;
  permiso_entrada: boolean;
  lista_articulos: boolean;
  repse: boolean;
  soporte_pago_actualizado: boolean;
  constancia_vigencia_imss: boolean;
  constancias_habilidades: boolean;
};

type FormValues = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
  documentos_checks: DocChecks;
};

const resolver = yup.object().shape({
  nombre: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_pat: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_mat: yup
    .string()
    .notRequired()
    .test("isValidLastName", "Este campo solo acepta letras y espacios.", (value) => {
      if (!value) return true;
      return REGEX_NAME.test(value);
    }),
  correo: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_EMAIL, "Formato de correo inválido."),
  telefono: yup
    .string()
    .notRequired()
    .test("isValidPhone", "Teléfono inválido.", (value) => {
      if (!value) return true;
      return REGEX_PHONE.test(value);
    }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  correo: "",
  telefono: "",
  documentos_checks: {
    identificacion_oficial: false,
    sua: false,
    permiso_entrada: false,
    lista_articulos: false,
    repse: false,
    soporte_pago_actualizado: false,
    constancia_vigencia_imss: false,
    constancias_habilidades: false,
  },
};

const DOC_LABELS: Record<keyof DocChecks, string> = {
  identificacion_oficial: "Identificación oficial",
  sua: "SUA",
  permiso_entrada: "Permiso de entrada",
  lista_articulos: "Lista de artículos",
  repse: "REPSE",
  soporte_pago_actualizado: "Soporte de pago actualizado",
  constancia_vigencia_imss: "Constancia de Vigencia IMSS",
  constancias_habilidades: "Constancias de Habilidades",
};

const DOC_KEYS: (keyof DocChecks)[] = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
  "constancia_vigencia_imss",
  "constancias_habilidades",
];

export default function NuevoPortalVisitante() {
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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/contratistas-visitantes", data);
      if (res.data.estado) {
        enqueueSnackbar("El visitante se creó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/portal-contratistas/visitantes");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/portal-contratistas/visitantes");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Nuevo Visitante
                </Typography>
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="apellido_pat"
                  label="Apellido paterno"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="apellido_mat"
                  label="Apellido materno"
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="correo"
                  label="Correo"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="telefono"
                  label="Teléfono"
                  fullWidth
                  margin="normal"
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" component="h3">
                  Documentos
                </Typography>
                {DOC_KEYS.map((key) => (
                    <Controller
                      key={key}
                      name={`documentos_checks.${key}` as const}
                      control={formContext.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={Boolean(field.value)} />}
                          label={DOC_LABELS[key as keyof DocChecks] || key}
                        />
                      )}
                    />
                  ))}
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
                    >
                      <ChevronLeft /> Regresar
                    </Button>
                    <Button
                      disabled={!formContext.formState.isValid}
                      type="submit"
                      size="medium"
                      variant="contained"
                    >
                      <Save /> Guardar
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
