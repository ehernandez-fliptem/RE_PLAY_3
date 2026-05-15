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
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { SelectElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

type FormValues = {
  identificador: string;
  nombre: string;
  modo_apertura_biostar: "pulso" | "manual";
  segundos_apertura_biostar: number;
};

const resolver = yup.object().shape({
  identificador: yup.string().required("El identificador es obligatorio."),
  nombre: yup.string().required("El nombre es obligatorio."),
  modo_apertura_biostar: yup
    .mixed<"pulso" | "manual">()
    .oneOf(["pulso", "manual"])
    .required("Este campo es obligatorio."),
  segundos_apertura_biostar: yup
    .number()
    .transform((value) => (Number.isNaN(value) ? undefined : value))
    .when("modo_apertura_biostar", {
      is: "pulso",
      then: (schema) =>
        schema
          .required("Este campo es obligatorio.")
          .min(1, "Mínimo 1 segundo.")
          .max(30, "Máximo 30 segundos."),
      otherwise: (schema) => schema.default(0),
    }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  identificador: "",
  nombre: "",
  modo_apertura_biostar: "pulso",
  segundos_apertura_biostar: 3,
};

export default function EditarAcceso() {
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

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/accesos/${ID}`);
        if (res.data.estado) {
          formContext.reset({
            ...res.data.datos,
            modo_apertura_biostar:
              res.data.datos?.modo_apertura_biostar === "manual"
                ? "manual"
                : "pulso",
            segundos_apertura_biostar: Number(res.data.datos?.segundos_apertura_biostar || 3),
          });
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
      const res = await clienteAxios.put(`/api/accesos/${ID}`, data);
      if (res.data.estado) {
        enqueueSnackbar("El acceso se modificó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/accesos");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/accesos");
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
                  Editar Acceso
                </Typography>
                <TextFieldElement
                  name="identificador"
                  label="Identificador"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <SelectElement
                  name="modo_apertura_biostar"
                  label="Modo de apertura BioStar"
                  required
                  fullWidth
                  margin="normal"
                  options={[
                    { id: "pulso", label: "Pulso" },
                    { id: "manual", label: "Manual (abrir/cerrar)" },
                  ]}
                />
                {formContext.watch("modo_apertura_biostar") === "pulso" && (
                  <TextFieldElement
                    name="segundos_apertura_biostar"
                    label="Segundos de apertura"
                    type="number"
                    required
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 1, max: 30 }}
                  />
                )}
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
