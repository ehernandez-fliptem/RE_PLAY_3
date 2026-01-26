import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { Box, Button, CardContent, Grid, Typography } from "@mui/material";
import Copyright from "../../utils/Copyright";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  FormContainer,
  Controller
} from "react-hook-form-mui";
import { MuiOtpInput } from "mui-one-time-password-input";
import { setFormErrors } from "../../helpers/formHelper";
import { enqueueSnackbar } from "notistack";
import LogoHeader from "../LogoHeader";

type FormValues = {
  codigo: string;
};

const resolver = yup.object().shape({
  codigo: yup.string().uppercase().required("El código es obligatorio."),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  codigo: "",
};

type Props = {
  setCodigoValido: React.Dispatch<React.SetStateAction<boolean>>;
  setToken: React.Dispatch<React.SetStateAction<string>>;
};

export default function VerificarCodigo({ setCodigoValido, setToken }: Props) {
  const formContext = useForm<FormValues>({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onSubmit",
    mode: "all",
  });
  const navigate = useNavigate();

  const submit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post(
        "/api/recuperaciones/validar-codigo",
        data
      );
      if (res.data.estado) {
        setCodigoValido(true);
        setToken(res.data.datos);
        enqueueSnackbar("El código se validó correctamente.", {
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
              onSuccess={submit}
            >
              <Controller
                name="codigo"
                control={formContext.control}
                render={({ field }) => (
                  <MuiOtpInput
                    autoFocus
                    TextFieldsProps={{
                      margin: "normal",
                      placeholder: "-",
                    }}
                    value={field.value}
                    onChange={field.onChange}
                    length={6}
                  />
                )}
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
                    Validar código
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
