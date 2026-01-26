import type { Dayjs } from "dayjs";
import * as yup from "yup";
import { REGEX_NAME } from "../../../../../app/constants/CommonRegex";
import dayjs from "dayjs";

type TAccesos = {
  id_acceso: string;
  modo: number;
};

export type TCitaVisitante = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
  empresa?: string;
};

export type FormCitaVisitante = {
  // Generales
  tipo_registro: number;
  visitantes: TCitaVisitante[];

  // Acceso
  id_anfitrion: string;
  actividades?: string;
  accesos: TAccesos[];
  fecha_entrada: Dayjs;
  fechas?: { fecha_entrada: Dayjs }[];

  //Adicionales
  comentarios?: string;
};

const resolverAccesos = yup.object().shape({
  id_acceso: yup.string().required("Este campo es obligatorio."),
  modo: yup.number(),
}) as yup.ObjectSchema<TAccesos>;

const resolverVisitantes = yup.object().shape({
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
  correo: yup
    .string()
    .email("Formato de correo inválido.")
    .required("Este campo es obligatorio."),
  telefono: yup.string(),
  empresa: yup.string(),
}) as yup.ObjectSchema<TCitaVisitante>;

const resolverFechas = yup.object().shape({
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
});

export const resolverCitas = yup.object().shape({
  tipo_registro: yup
    .number()
    .required("Este campo es obligatorio")
    .min(1)
    .max(3),
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
  fechas: yup
    .array()
    .of(resolverFechas)
    .test(
      "intervalo-24-horas",
      "Cada fecha debe tener al menos 18 horas de diferencia con las demás.",
      (value) => {
        if (!value || value.length < 1) return true;
        const fechasOrdenadas = value
          .map((p) => p.fecha_entrada as Dayjs)
          .sort((a, b) => (a && b ? a.valueOf() - b.valueOf() : 0));
        for (let i = 1; i < fechasOrdenadas.length; i++) {
          if (fechasOrdenadas[i].diff(fechasOrdenadas[i - 1], "hour") < 18) {
            return false;
          }
        }
        return true;
      }
    ),
  comentarios: yup.string(),
  visitantes: yup
    .array()
    .of(resolverVisitantes)
    .min(1, "Debes agregar al menos un visitante.")
    .test("unique-correos", "El número debe ser único.", (value) => {
      if (!value) return true;
      const existCorreo = value.map((p) => p.correo);
      return new Set(existCorreo).size === existCorreo.length;
    }),
}) as yup.ObjectSchema<FormCitaVisitante>;

export const initialValue: FormCitaVisitante = {
  tipo_registro: 0,
  visitantes: [],
  id_anfitrion: "",
  accesos: [],
  actividades: "",
  fecha_entrada: dayjs().add(1, "hours").startOf("hour"),
  fechas: [],
  comentarios: "",
};
