import type { Dayjs } from "dayjs";
import * as yup from "yup";
import {
  REGEX_BASE64,
  REGEX_NAME,
} from "../../../../../app/constants/CommonRegex";
import dayjs from "dayjs";

type TAccesos = {
  id_acceso: string;
  modo: number;
};

export type TRegistroVisitante = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;

  img_usuario: string;
  tipo_ide: number;
  img_ide_a: string;
  img_ide_b: string;
  numero_ide: string;
  empresa?: string;
  id_pase?: string;
};

export type FormRegistroVisitante = {
  // Generales
  tipo_registro: number;
  visitantes: TRegistroVisitante[];

  // Acceso
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
  telefono: yup.string().notRequired().nullable(),
  img_usuario: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de usuario debe ser una URL válida.",
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
  tipo_ide: yup.number().min(1).max(5).required("Este campo es obligatorio."),
  img_ide_a: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de usuario debe ser una URL válida.",
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
  img_ide_b: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de usuario debe ser una URL válida.",
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
  numero_ide: yup.string().required("Este campo es obligatorio."),
  empresa: yup.string(),
  id_pase: yup.string().transform((curr, orig) => (!orig ? "" : curr)),
}) as yup.ObjectSchema<TRegistroVisitante>;

export const resolverRegistros = yup.object().shape({
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
  actividades: yup.string().max(250, "Este campo solo acepta un máximo de 250 caracteres."),
  fecha_entrada: yup
    .mixed()
    .test(
      "isFurther",
      "La fecha no es válida.",
      (value) => dayjs.isDayjs(value) && value.isValid()
    )
    .required("Este campo es obligatorio"),
  comentarios: yup.string(),
  placas: yup.string(),
  desc_vehiculo: yup.string(),
  visitantes: yup
    .array()
    .of(resolverVisitantes)
    .min(1, "Debes agregar al menos un visitante.")
    .test("unique-correos", "El número debe ser único.", (value) => {
      if (!value) return true;
      const existCorreo = value.map((p) => p.correo);
      return new Set(existCorreo).size === existCorreo.length;
    }),
}) as yup.ObjectSchema<FormRegistroVisitante>;

export const initialValue: FormRegistroVisitante = {
  tipo_registro: 0,
  visitantes: [],
  id_anfitrion: "",
  actividades: "",
  accesos: [],
  fecha_entrada: dayjs().add(1, "hours").startOf("hour"),
  comentarios: "",
  placas: "",
  desc_vehiculo: "",
};
