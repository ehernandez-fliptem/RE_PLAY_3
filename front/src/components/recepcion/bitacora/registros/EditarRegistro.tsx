import { Fragment, useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalContainer from "../../../utils/ModalContainer";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { FormContainer } from "react-hook-form-mui";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import { type GridDataSourceApiBase } from "@mui/x-data-grid";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../../app/store";
import {
  initialValue as initCitasForm,
  type FormEditCitasVisitante,
  resolverCitas,
} from "./form_init/TCitasEditar";
import { useErrorBoundary } from "react-error-boundary";
import Spinner from "../../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import { setFormErrors } from "../../../helpers/formHelper";
import FormEditarCitas from "./partes/forms/FormEditarCitas";
import FormModificar from "./partes/forms/FormModificar";
import {
  initialValue as initModifCitas,
  type FormModificarCitasVisitante,
  resolverModifiCitas,
} from "./form_init/TCitasModificar";
import dayjs from "dayjs";

type FormTypes = {
  1: FormEditCitasVisitante;
  4: FormModificarCitasVisitante;
};

function getFormConfig<T extends 1 | 2 | 3 | 4>(tipo: T) {
  switch (tipo) {
    case 1:
      return {
        defaultValues: { ...initCitasForm, tipo_registro: tipo },
        resolver: yupResolver(resolverCitas),
      };
    case 4:
      return {
        defaultValues: { ...initModifCitas, tipo_registro: tipo },
        resolver: yupResolver(resolverModifiCitas),
      };
    default:
      throw new Error("Tipo inválido");
  }
}

export default function EditarRegistro() {
  const { id: ID } = useParams();
  //   const { tipos_registros } = useSelector(
  //     (state: IRootState) => state.config.data
  //   );
  const socket = useSelector((state: IRootState) => state.ws.data);
  const [searchParams] = useSearchParams({
    t: ["1", "2", "3", "4"],
  });
  const { showBoundary } = useErrorBoundary();
  const TIPO = Number(searchParams.get("t")) as 1 | 4;
  if (!TIPO || ![1, 4].includes(TIPO)) {
    showBoundary(Error("El tipo de registro no es válido."));
  }
  const [type, setType] = useState<0 | 1>(0);
  const { defaultValues, resolver } = getFormConfig(type === 1 ? 4 : TIPO);
  const formContext = useForm({
    defaultValues,
    resolver: resolver as Resolver<FormTypes[typeof TIPO]>,
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (location) {
      const { pathname } = location;
      const path = pathname.split("/")[2];
      if (path === "editar-registro") {
        setType(1);
      }
    }
  }, [location]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/registros/form-editar/${ID}`);
        if (res.data.estado) {
          formContext.reset({...res.data.datos, fecha_entrada: dayjs(res.data.datos.fecha_entrada)});
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

  const onSubmit: SubmitHandler<FormTypes[typeof TIPO]> = async (data) => {
    try {
      const url =
        type === 1 ? `/api/registros/modificar/${ID}` : `/api/registros/${ID}`;
      const res = await clienteAxios.put(url, data);
      if (res.data.estado) {
        if (type === 1) {
          const {
            correos_enviados: { anfitrion, visitante },
          } = res.data.datos;
          enqueueSnackbar(
            "Los datos de la cita se modificaron correctamente.",
            {
              variant: "success",
            }
          );
          enqueueSnackbar(
            anfitrion
              ? "Se notificó correctamente al anfitrión."
              : "Hubo un problema al enviar el correo al anfitrión",
            {
              variant: anfitrion ? "success" : "warning",
            }
          );
          enqueueSnackbar(
            visitante
              ? "Se notificó correctamente al visitante."
              : "Hubo un problema al enviar el correo al visitante",
            {
              variant: visitante ? "success" : "warning",
            }
          );
        } else {
          enqueueSnackbar("Los datos de la cita se guardaron correctamente.", {
            variant: "success",
          });
        }

        parentGridDataRef.fetchRows();
        parentGridDataRef.fetchRows();
        socket?.emit("registros:modificar-estado", { id_registro: ID });
        navigate("/bitacora", { replace: true });
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {(isLoading || formContext.formState.isSubmitting) ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Fragment>
                  <Typography variant="h4" component="h2" textAlign="center">
                    {type === 1 ? "Modificar" : "Permitir entrada"}
                    {/* {tipos_registros[TIPO].nombre} */}
                  </Typography>

                  {type === 0 && (
                    <Fragment>
                      <Typography
                        variant="body2"
                        component="span"
                        color="textDisabled"
                        textAlign="center"
                      >
                        * Debes completar los datos faltantes para darle acceso
                        al visitante.
                      </Typography>
                      <FormEditarCitas />
                    </Fragment>
                  )}
                  {type === 1 && <FormModificar />}
                </Fragment>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
