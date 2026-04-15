import { ChevronLeft, Save } from "@mui/icons-material";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../app/config/axios";
import Spinner from "../utils/Spinner";
import { setFormErrors } from "../helpers/formHelper";
import ModalContainer from "../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { REGEX_EMAIL, REGEX_FABRI, REGEX_NAME, REGEX_PHONE } from "../../app/constants/CommonRegex";

type FormValues = {
  empresa: string;
  correo: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  telefono?: string;
  correos?: string;
};

const resolver = yup.object().shape({
  empresa: yup
    .string()
    .required("El nombre de la empresa es obligatorio.")
    .matches(REGEX_FABRI, "El nombre de la empresa es invalido."),
  correo: yup
    .string()
    .required("El correo es obligatorio.")
    .matches(REGEX_EMAIL, "Formato de correo invalido."),
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
  telefono: yup
    .string()
    .notRequired()
    .test("isValidPhone", "Telefono invalido.", (value) => {
      if (!value) return true;
      return REGEX_PHONE.test(value);
    }),
  correos: yup.string().notRequired(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  empresa: "",
  correo: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  telefono: "",
  correos: "",
};

export default function NuevoContratista() {
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
      const payload = {
        ...data,
        correos: data.correos
          ? data.correos
              .split(",")
              .map((c) => c.trim())
              .filter((c) => !!c)
          : [],
      };
      const res = await clienteAxios.post("api/contratistas", payload);
      if (res.data.estado) {
        const correoEnviado = Boolean(res.data?.datos?.correoUsuario);
        enqueueSnackbar("El contratista se creo correctamente.", {
          variant: "success",
        });
        if (!correoEnviado) {
          enqueueSnackbar(
            "El contratista se creó, pero no se pudo enviar el correo de acceso.",
            { variant: "warning" }
          );
        }
        parentGridDataRef.fetchRows();
        navigate("/contratistas");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/contratistas");
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
                  Nuevo Contratista
                </Typography>
                <TextFieldElement
                  name="empresa"
                  label="Empresa"
                  required
                  fullWidth
                  margin="normal"
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" component="h3">
                  Usuario Manager
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
                  label="Telefono"
                  fullWidth
                  margin="normal"
                />
                <Divider sx={{ my: 2 }} />
                <TextFieldElement
                  name="correos"
                  label="Correos adicionales (separados por coma)"
                  fullWidth
                  margin="normal"
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
