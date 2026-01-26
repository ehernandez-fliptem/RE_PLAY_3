import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Visibility, VisibilityOff, Email, Lock } from "@mui/icons-material";
import { clienteAxios, handlingError } from "../../app/config/axios";
import Spinner from "../utils/Spinner";
import {
  Box,
  Button,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import Copyright from "../utils/Copyright";
import { addAuth } from "../../app/features/auth/authSlice";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextFieldElement, FormContainer } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { setFormErrors } from "../helpers/formHelper";
import LogoHeader from "./LogoHeader";
import AuthContainer from "./AuthContainer";

type FormValues = {
  correo: string;
  contrasena: string;
};

const resolver = yup.object().shape({
  correo: yup
    .string()
    .required("El correo es obligatorio.")
    .email("Formato de correo inválido."),
  contrasena: yup
    .string()
    .required("La contraseña es obligatoria.")
    .min(8, "La contraseña debe contener al menos 8 caracteres."),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  correo: "",
  contrasena: "",
};

export default function Login() {
  const formContext = useForm<FormValues>({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onSubmit",
    mode: "all",
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [recordar, setRecordar] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");

    if (savedEmail && savedPassword) {
      formContext.reset({
        correo: savedEmail,
        contrasena: savedPassword,
      });
      setRecordar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const autenticar: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("/api/auth/", data);
      if (res.data.estado) {
        if (recordar) {
          localStorage.setItem("rememberedEmail", data.correo);
          localStorage.setItem("rememberedPassword", data.contrasena);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }
        dispatch(addAuth(res.data.datos));
        navigate("/", { replace: true });
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { restartSession, erroresForm } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  return (
    <AuthContainer>
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
           
            <FormContainer formContext={formContext} onSuccess={autenticar}>
              <TextFieldElement
                name="correo"
                placeholder="Ingresa tu correo"
                required
                fullWidth
                margin="normal"
                type="email"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextFieldElement
                name="contrasena"
                placeholder="Ingresa tu contraseña"
                required
                fullWidth
                margin="normal"
                type={showPassword ? "text" : "password"}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
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
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Grid
                  size={{ xs: 12, sm: 6 }}
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "end", sm: "start" },
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={recordar}
                        onChange={(e) => setRecordar(e.target.checked)}
                      />
                    }
                    label="Recuerdame"
                    sx={{ color: "primary.main" }}
                  />
                </Grid>
                <Grid
                  size={{ xs: 12, sm: 6 }}
                  sx={{ display: "flex", justifyContent: "end" }}
                >
                  <Link to="/restablecer">
                    <Button
                      variant="text"
                      size="small"
                      color="primary"
                      sx={{
                        textDecoration: "none",
                        fontWeight: "normal",
                        fontSize: "1rem",
                        textTransform: "none",
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </Link>
                </Grid>
              </Grid>

              <Button
                disabled={!formContext.formState.isValid}
                type="submit"
                fullWidth
                variant="contained"
                sx={{ my: 2 }}
              >
                Iniciar sesión
              </Button>
            </FormContainer>
            <Copyright sx={{ mt: 5, mb: 2 }} />
          </Box>
        </CardContent>
      )}
    </AuthContainer>
  );
}
