import * as yup from "yup";
import { REGEX_NAME } from "../../../../../app/constants/CommonRegex";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

type TAccesos = {
  id_acceso: string;
  modo: number;
};

export type FormModificarCitasVisitante = {
  // Generales
  tipo_registro: number;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  telefono?: string;
  empresa?: string;

  id_anfitrion: string;
  actividades?: string;
  accesos: TAccesos[];
  fecha_entrada: Dayjs;

  //Adicionales
  comentarios?: string;
  placas?: string;
  desc_vehiculo?: string;
};

const resolverAccesos = yup.object().shape({
  id_acceso: yup.string().required("Este campo es obligatorio."),
  modo: yup.number(),
}) as yup.ObjectSchema<TAccesos>;

export const resolverModifiCitas = yup.object().shape({
  tipo_registro: yup
    .number()
    .required("Este campo es obligatorio")
    .min(1)
    .max(3),
  nombre: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_pat: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_mat: yup
    .string()
    .notRequired()
    .test(
      "isValidName",
      "Este campo solo acepta letras y espacios.",
      (value) => {
        if (value) {
          const hasUri = REGEX_NAME.test(value);
          if (hasUri) {
            return true;
          }
          return false;
        } else {
          return true;
        }
      }
    ),
  telefono: yup.string(),
  empresa: yup.string(),
  id_anfitrion: yup.string().required("Este campo es obligatorio."),
  accesos: yup
    .array()
    .of(resolverAccesos)
    .min(1, "Debes agregar al menos un acceso")
    .test("unique-accesos", "El número debe ser único.", (value) => {
      if (!value) return true;
      const existAcceso = value.map((p) => p.id_acceso);
      return new Set(existAcceso).size === existAcceso.length;
    }),
  actividades: yup
    .string()
    .max(250, "Este campo solo acepta un máximo de 250 caracteres."),
  fecha_entrada: yup
    .mixed()
    .test(
      "isFurther",
      "La fecha no puede ser menor a la fecha actual.",
      (value) => {
        if (dayjs.isDayjs(value) && value.isValid()) {
          return !dayjs(value).isBefore(dayjs());
        } else {
          return false;
        }
      }
    )
    .required("Este campo es obligatorio"),
  comentarios: yup.string(),
  placas: yup.string(),
  desc_vehiculo: yup.string(),
}) as yup.ObjectSchema<FormModificarCitasVisitante>;

export const initialValue: FormModificarCitasVisitante = {
  tipo_registro: 0,
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  empresa: "",
  telefono: "",
  id_anfitrion: "",
  accesos: [],
  actividades: "",
  fecha_entrada: dayjs().add(1, "hours").startOf("hour"),
  comentarios: "",
  placas: "",
  desc_vehiculo: "",
};
