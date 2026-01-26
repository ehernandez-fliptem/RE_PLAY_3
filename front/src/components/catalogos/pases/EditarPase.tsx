import { Close, Save } from "@mui/icons-material";
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
import {
  AutocompleteElement,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

type Empresas = {
  _id: string;
  nombre: string;
};

type FormValues = {
  codigo: string;
  fabricante?: string;
  modelo?: string;
  tipo?: string;
  id_empresa: string;
};

const resolver = yup.object().shape({
  codigo: yup
    .string()
    .max(50, "No puedes superar el máximo de caracteres")
    .required("Este campo es obligatorio."),
  fabricante: yup.string().max(50, "No puedes superar el máximo de caracteres"),
  modelo: yup.string().max(50, "No puedes superar el máximo de caracteres"),
  tipo: yup.string().max(50, "No puedes superar el máximo de caracteres"),
  id_empresa: yup.string().required("Este campo es obligatorio."),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  codigo: "",
  fabricante: "",
  modelo: "",
  tipo: "",
  id_empresa: "",
};

export default function EditarPase() {
  const { id: ID } = useParams();
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
  const [empresas, setEmpresas] = useState<Empresas[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/pases/form-editar/${ID}`);
        if (res.data.estado) {
          const { empresas, pase } = res.data.datos;
          setEmpresas(empresas);
          formContext.reset(pase);
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
      const res = await clienteAxios.put(`/api/pases/${ID}`, data);
      if (res.data.estado) {
        enqueueSnackbar("El pase se modificó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/pases");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/pases");
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
                  Editar Pase
                </Typography>
                <TextFieldElement
                  name="codigo"
                  label="Código"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="fabricante"
                  label="Fabricante"
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="modelo"
                  label="Modelo"
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="tipo"
                  label="Tipo"
                  fullWidth
                  margin="normal"
                />
                <AutocompleteElement
                  name="id_empresa"
                  label="Empresa"
                  required
                  matchId
                  options={empresas.map((item) => {
                    return { id: item._id, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
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
