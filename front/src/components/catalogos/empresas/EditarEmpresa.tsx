import { lazy, Suspense, useEffect, useState } from "react";
import { Close, Image, Save } from "@mui/icons-material";
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
import Telefonos from "./telefonos/Telefonos";
import { setFormErrors } from "../../helpers/formHelper";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import ModalContainer from "../../utils/ModalContainer";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type IAcceso = {
  _id: string;
  identificador: string;
  nombre: string;
};

type IPiso = {
  _id: string;
  identificador: string;
  nombre: string;
};

type IContacto = {
  numero: string;
  extension?: string;
};

type TPuestos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TDepartamentos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TCubiculos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type FormValues = {
  img_empresa: string;
  nombre: string;
  rfc: string;
  pisos: string[];
  accesos: string[];
  puestos?: string[];
  departamentos?: string[];
  cubiculos?: string[];
  telefonos: IContacto[];
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
          return true;
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
  accesos: yup.array().of(yup.string()),
  puestos: yup.array().of(yup.string()),
  departamentos: yup.array().of(yup.string()),
  cubiculos: yup.array().of(yup.string()),
  telefonos: yup
    .array()
    .of(resolverContactos)
    .min(1, "Debes agregar al menos un contacto.")
    .test("unique-contacto", "El número debe ser único.", (pisos) => {
      if (!pisos) return true;
      const existNumero = pisos.map((p) => p.numero);
      return new Set(existNumero).size === existNumero.length;
    }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_empresa: "",
  nombre: "",
  rfc: "",
  pisos: [],
  accesos: [],
  puestos: [],
  departamentos: [],
  cubiculos: [],
  telefonos: [],
};

export default function EditarEmpresa() {
  const { id: ID } = useParams();
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
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
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [pisos, setPisos] = useState<IPiso[]>([]);
  const [accesos, setAccesos] = useState<IAcceso[]>([]);
  const [puestos, setPuestos] = useState<TPuestos[]>([]);
  const [departamentos, setDepartamentos] = useState<TDepartamentos[]>([]);
  const [cubiculos, setCubiculos] = useState<TCubiculos[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/empresas/form-editar/${ID}`);
        if (res.data.estado) {
          const { empresa, pisos, accesos, puestos, departamentos, cubiculos } = res.data.datos;
          setPisos(pisos);
          setAccesos(accesos);
          setPuestos(puestos);
          setDepartamentos(departamentos);
          setCubiculos(cubiculos);
          formContext.reset(empresa);
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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.put(`api/empresas/${ID}`, data);
      if (res.data.estado) {
        enqueueSnackbar("La empresa se creó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/empresas");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/empresas");
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
                  Editar Empresa
                </Typography>
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    variant="square"
                    name="img_empresa"
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
                <AutocompleteElement
                  name="puestos"
                  label="Puestos"
                  multiple
                  matchId
                  options={puestos.map((item) => {
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
                  }}
                />
                <AutocompleteElement
                  name="departamentos"
                  label="Departamentos"
                  multiple
                  matchId
                  options={departamentos.map((item) => {
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
                  }}
                />
                <AutocompleteElement
                  name="cubiculos"
                  label="Cubiculos"
                  multiple
                  matchId
                  options={cubiculos.map((item) => {
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
                  }}
                />
                <Telefonos name="telefonos" label="Contacto(s)" required />
                <CheckboxButtonGroup
                  name="documentos"
                  label="Documentos requeridos para visitantes"
                  row={!isTinyMobile}
                  options={Object.entries(tipos_documentos).map((item) => {
                    return {
                      id: Number(item[0]),
                      label: item[1].nombre,
                    };
                  })}
                />
                <Divider />
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
