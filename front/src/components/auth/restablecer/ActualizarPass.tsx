import { useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import {
  Box,
  Button,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  Typography,
} from "@mui/material";
import Copyright from "../../utils/Copyright";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextFieldElement, FormContainer } from "react-hook-form-mui";
import { setFormErrors } from "../../helpers/formHelper";
import { enqueueSnackbar } from "notistack";
import { Fragment, useState } from "react";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
} from "../../../app/constants/CommonRegex";
import PasswordValidAdornment from "../../utils/PasswordValidAdornment";
import LogoHeader from "../LogoHeader";

type FormValues = {
  contrasena: string;
  confirm_contrasena: string;
};

const resolver = yup.object().shape({
  contrasena: yup
    .string()
    .required("Este campo es obligatorio.")
    .min(8, "La contraseña debe contener mínimo 8 caracteres.")
    .test("isValidPass", "", (value) => {
      const hasUpperCase = HASUPPERCASE.test(value);
      const hasNumber = HASNUMBER.test(value);
      const hasLowerCase = HASLOWERCASE.test(value);
      const hasSymbole = HASSYMBOLE.test(value);
      let validConditions = 0;
      const numberOfMustBeValidConditions = 4;
      const conditions = [hasUpperCase, hasLowerCase, hasNumber, hasSymbole];
      conditions.forEach((condition) => (condition ? validConditions++ : null));
      if (validConditions >= numberOfMustBeValidConditions) {
        return true;
      }
      return false;
    }),
  confirm_contrasena: yup
    .string()
    .required("Debes repetir la contraseña.")
    .oneOf([yup.ref("contrasena")], "Las contraseñas deben coincidir."),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  contrasena: "",
  confirm_contrasena: "",
};

type Props = {
  token: string;
};

export default function ActualizarPass({ token }: Props) {
  const formContext = useForm<FormValues>({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onSubmit",
    mode: "all",
  });
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [contrasenaActualizada, setContrasenaActualizada] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const verificarCorreo: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.put(
        "/api/recuperaciones/modificar-contrasena",
        { ...data, token }
      );
      if (res.data.estado) {
        setContrasenaActualizada(true);
        enqueueSnackbar(
          "El contrasena se actualizó correctamente, será redirigido al login en breve.",
          {
            variant: "success",
          }
        );
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
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
      {formContext.formState.isSubmitting || contrasenaActualizada ? (
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
                name="contrasena"
                label="Nueva Contraseña"
                required
                fullWidth
                margin="normal"
                type={showPassword ? "text" : "password"}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword
                              ? "hide the password"
                              : "display the password"
                          }
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <PasswordValidAdornment name="contrasena" />
              <TextFieldElement
                name="confirm_contrasena"
                label="Repetir Contraseña"
                required
                fullWidth
                margin="normal"
                type={showPassword ? "text" : "password"}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword
                              ? "hide the password"
                              : "display the password"
                          }
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
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
                    Actualizar
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
