import { enqueueSnackbar } from "notistack";
import { Fragment, useEffect, useState } from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../app/config/axios";
import { AutocompleteElement, TextFieldElement } from "react-hook-form-mui";
import Accesos from "./Accesos/Accesos";
import type { IRootState } from "../../../../../../app/store";
import { useSelector } from "react-redux";
import MultipleDates from "../utils/MultipleDates";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

type Accesos = {
  _id: string;
  identificador: string;
  nombre: string;
  modo: number;
  modos: [1, 2, 3];
};

type Usuarios = {
  _id: string;
  nombre: string;
};

type Props = {
  type: number;
};
const startDay = dayjs().startOf("day");
const endDay = dayjs().endOf("day");

export default function Acceso({ type }: Props) {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esRecep = rol.includes(2);
  const esVisit = rol.includes(10);
  const formContext = useFormContext();
  const [isLoading, setIsLoading] = useState(true);
  const [anfitriones, setAnfitriones] = useState<Usuarios[]>([]);
  const fecha_entrada = formContext.watch("fecha_entrada");
  const beetweenToday = dayjs(fecha_entrada).isBetween(startDay, endDay);

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const res = await clienteAxios.get(`/api/registros/form-nuevo`);
        if (res.data.estado) {
          const { anfitriones } = res.data.datos;
          setAnfitriones(anfitriones);
          if (anfitriones.length === 1) {
            formContext.setValue("id_anfitrion", anfitriones[0]._id);
            formContext.clearErrors("id_anfitrion");
          }
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistros();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <FormProvider {...formContext}>
        {type == 2 ? (
          <Controller
            name="fecha_entrada"
            render={({ field, fieldState }) => (
              <DateTimePicker
                {...field}
                disabled={[2, 3].includes(type)}
                label="Fecha de Entrada"
                minDate={dayjs()}
                minTime={beetweenToday ? dayjs() : startDay}
                onChange={(value) => field.onChange(value)}
                slotProps={{
                  textField: {
                    required: true,
                    margin: "normal",
                    fullWidth: true,
                    size: "small",
                    error: !!fieldState.error?.message,
                    helperText: fieldState.error?.message,
                  },
                }}
              />
            )}
          />
        ) : (
          <MultipleDates
            name="fecha_entrada"
            nameArray="fechas"
            dateTimeProps={{
              label: "Fecha de Entrada",
              disabled: [2, 3].includes(type),
            }}
          />
        )}
        <AutocompleteElement
          name="id_anfitrion"
          label="Persona a Visitar"
          required={type != 3}
          matchId
          loading={isLoading}
          options={anfitriones.map((item) => {
            return { id: item._id, label: item.nombre };
          })}
          textFieldProps={{
            margin: "normal",
          }}
          autocompleteProps={{
            disabled: !esVisit && !esRecep,
            noOptionsText: "No hay opciones.",
          }}
        />
        <TextFieldElement
          name="actividades"
          label="Actividades"
          fullWidth
          margin="normal"
        />
        {!esVisit && <Accesos name="accesos" label="Acceso(s)" required />}
      </FormProvider>
    </Fragment>
  );
}
