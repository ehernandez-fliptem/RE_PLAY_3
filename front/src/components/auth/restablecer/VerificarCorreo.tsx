import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { Box, Button, CardContent, Grid, Typography } from "@mui/material";
import Copyright from "../../utils/Copyright";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextFieldElement, FormContainer } from "react-hook-form-mui";
import { setFormErrors } from "../../helpers/formHelper";
import { enqueueSnackbar } from "notistack";
import LogoHeader from "../LogoHeader";

type FormValues = {
  correo: string;
};

const resolver = yup.object().shape({
  correo: yup
    .string()
    .required("El correo es obligatorio.")
    .email("Formato de correo inválido."),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  correo: "",
};

type Props = {
  setCorreoEnviado: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function VerificarCorreo({ setCorreoEnviado }: Props) {
  const formContext = useForm<FormValues>({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onSubmit",
    mode: "all",
  });
  const navigate = useNavigate();

  const verificarCorreo: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post(
        "/api/recuperaciones/enviar-codigo",
        data
      );
      if (res.data.estado) {
        setCorreoEnviado(true);
        enqueueSnackbar("El correo se envió correctamente.", {
          variant: "success",
        });
      } else {
        enqueueSnackbar(res.data.mensaje, {
          variant: "warning",
        });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const cancelar = () => {
    navigate("/");
  };

  return (
    <Fragment>
      {formContext.formState.isSubmitting ? (
        <Spinner />
      ) : (
        <CardContent
          sx={{
            p: 5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoHeader />
            <Typography component="h1" variant="h5" textAlign="center">
              Restablecer Contraseña
            </Typography>
            <FormContainer
              FormProps={{
                style: { width: "100%" },
              }}
              formContext={formContext}
              onSuccess={verificarCorreo}
            >
              <TextFieldElement
                name="correo"
                label="Correo"
                required
                fullWidth
                margin="normal"
                type="email"
                autoComplete="email"
                helperText={
                  "Al recibir el correo tienes 7 días para reestablecer tu contraseña."
                }
              />
              <Grid
                container
                spacing={2}
                direction={{ xs: "column-reverse", sm: "row" }}
                sx={{
                  mt: 3,
                  mb: 3,
                  justifyContent: "space-around",
                  alignItems: "stretch",
                }}
              >
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    sx={{ width: "100%" }}
                    type="button"
                    variant="contained"
                    color="inherit"
                    onClick={cancelar}
                  >
                    Cancelar
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    disabled={!formContext.formState.isValid}
                    sx={{ width: "100%" }}
                    type="submit"
                    fullWidth
                    variant="contained"
                  >
                    Enviar Correo
                  </Button>
                </Grid>
              </Grid>
            </FormContainer>
            <Copyright sx={{ mt: 5, mb: 2 }} />
          </Box>
        </CardContent>
      )}
    </Fragment>
  );
}
