import { Save } from "@mui/icons-material";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import { REGEX_BASE64 } from "../../../app/constants/CommonRegex";
import General from "../../catalogos/configuracion/partes/General";

type Props = {
  setConfiguracion: React.Dispatch<React.SetStateAction<number>>;
};

type FormValues = {
  appNombre: string;
  zonaHoraria: string;
  imgCorreo: string;
  saludaCorreo: string;
  despedidaCorreo: string;
};

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
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  appNombre: "",
  zonaHoraria: "",
  imgCorreo: "",
  saludaCorreo: "",
  despedidaCorreo: "",
};

export default function NuevaConfiguracion({ setConfiguracion }: Props) {
  const formContext = useForm<FormValues>({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/validacion/configuracion", data);
      if (res.data.estado) {
        enqueueSnackbar("El usuario se creó correctamente.", {
          variant: "success",
        });
        setConfiguracion(1);
        const appNombre = formContext.watch("appNombre");
        document.title = appNombre;
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  return (
    <Container component="div" maxWidth="lg">
      <Box component="section" sx={{ paddingY: 5 }}>
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Configuración Inicial
                </Typography>
                <General />
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
    </Container>
  );
}
