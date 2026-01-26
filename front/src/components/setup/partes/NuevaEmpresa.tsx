import { lazy, Suspense, useEffect, useState } from "react";
import { Image, Save } from "@mui/icons-material";
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AutocompleteElement,
  CheckboxButtonGroup,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import {
  REGEX_BASE64,
  REGEX_FABRI,
  REGEX_RFC,
} from "../../../app/constants/CommonRegex";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ProfilePicturePreview from "../../utils/fallbackRender/ProfilePicturePreview";
import Telefonos from "../../catalogos/empresas/telefonos/Telefonos";
import { setFormErrors } from "../../helpers/formHelper";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type Pisos = {
  _id: string;
  nombre: string;
  identificador: string;
};

type Accesos = {
  _id: string;
  nombre: string;
  identificador: string;
};

type Documentos = {
  _id: string;
  tipo: number;
  nombre: string;
};

type IContacto = {
  numero: string;
  extension?: string;
};

type FormValues = {
  img_empresa: string;
  nombre: string;
  rfc: string;
  pisos: string[];
  accesos: string[];
  telefonos: IContacto[];
  documentos: number[];
};

const resolverContactos = yup.object().shape({
  numero: yup.string().required("El número de télefono es obligatorio."),
  extension: yup.string(),
}) as yup.ObjectSchema<IContacto>;

const resolver = yup.object().shape({
  img_empresa: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de la empresa debe ser una URL válida.",
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
  nombre: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_FABRI, "Este campo solo acepta letras y espacios."),
  rfc: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_RFC, "Formato de RFC inválido."),
  pisos: yup.array().of(yup.string()).min(1, "Debes agregar al menos un piso."),
  accesos: yup
    .array()
    .of(yup.string())
    .min(1, "Debes agregar al menos un acceso."),
  telefonos: yup
    .array()
    .of(resolverContactos)
    .min(1, "Debes agregar al menos un contacto.")
    .test("unique-contacto", "El número debe ser único.", (pisos) => {
      if (!pisos) return true;
      const existNumero = pisos.map((p) => p.numero);
      return new Set(existNumero).size === existNumero.length;
    }),
  documentos: yup.array().of(yup.number()),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_empresa: "",
  nombre: "",
  rfc: "",
  pisos: [],
  accesos: [],
  telefonos: [],
  documentos: [],
};

type Props = {
  setEmpresas: React.Dispatch<React.SetStateAction<number>>;
};

export default function NuevaEmpresa({ setEmpresas }: Props) {
  const theme = useTheme();
  const isTinyMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pisos, setPisos] = useState<Pisos[]>([]);
  const [accesos, setAccesos] = useState<Accesos[]>([]);
  const [tiposDocumentos, setTiposDocumentos] = useState<Documentos[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(
          "/api/validacion/empresa/form-nuevo"
        );
        if (res.data.estado) {
          const { pisos, accesos, tipos_documentos } = res.data.datos;
          setPisos(pisos);
          setAccesos(accesos);
          setTiposDocumentos(tipos_documentos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistro();
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/validacion/empresa", data);
      if (res.data.estado) {
        enqueueSnackbar("La empreas se creó correctamente.", {
          variant: "success",
        });
        setEmpresas(1);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  return (
    <Container component="div" maxWidth="lg" sx={{ height: "100%" }}>
      <Box component="section" sx={{ paddingY: 5 }}>
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Empresa Maestra
                </Typography>
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    required
                    variant="square"
                    name="img_empresa"
                    label="Imagen de la empresa"
                    backgroundIcon={<Image />}
                    allowFiles={["png", "jpeg", "jpg"]}
                    adjustImageToBox
                  />
                </Suspense>
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="rfc"
                  label="RFC"
                  required
                  fullWidth
                  margin="normal"
                />
                <AutocompleteElement
                  name="pisos"
                  label="Pisos"
                  required
                  multiple
                  matchId
                  options={pisos.map((item) => {
                    return {
                      id: item._id,
                      label: `${item.identificador} - ${item.nombre}`,
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                    limitTags: 4,
                  }}
                />
                <AutocompleteElement
                  name="accesos"
                  label="Accesos"
                  required
                  multiple
                  matchId
                  options={accesos.map((item) => {
                    return {
                      id: item._id,
                      label: `${item.identificador} - ${item.nombre}`,
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                    limitTags: 4,
                  }}
                />
                <Telefonos name="telefonos" label="Contacto(s)" required />
                <CheckboxButtonGroup
                  name="documentos"
                  label="Documentos requeridos para visitantes"
                  row={!isTinyMobile}
                  options={tiposDocumentos.map((item) => {
                    return {
                      id: item.tipo,
                      label: item.nombre,
                    };
                  })}
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
    </Container>
  );
}
