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

export type TExpressVisitante = {
  correo?: string;
  nombre?: string;
  apellido_pat?: string;
  apellido_mat?: string;
  img_usuario?: string;
  img_ide_a?: string;
  img_ide_b?: string;
  id_pase?: string;
};

export type FormExpressVisitante = {
  // Generales
  tipo_registro: number;
  visitantes: TExpressVisitante[];

  // Acceso
  id_anfitrion?: string;
  actividades?: string;
  accesos: TAccesos[];
  fecha_entrada: Dayjs;

  //Adicionales
  comentarios?: string;
};

const resolverAccesos = yup.object().shape({
  id_acceso: yup.string().required("Este campo es obligatorio."),
  modo: yup.number(),
}) as yup.ObjectSchema<TAccesos>;

const resolverVisitantes = yup.object().shape({
  correo: yup.string().email("Formato de correo inválido.").notRequired(),
  nombre: yup
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
  apellido_pat: yup
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
          return true;
        }
      }
    ),
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
          return true;
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
          return true;
        }
      }
    ),
  id_pase: yup.string().transform((curr, orig) => (!orig ? "" : curr)),
}) as yup.ObjectSchema<TExpressVisitante>;

export const resolverExpress = yup.object().shape({
  tipo_registro: yup
    .number()
    .required("Este campo es obligatorio")
    .min(1)
    .max(3),
  id_anfitrion: yup.string(),
  accesos: yup
    .array()
    .of(resolverAccesos)
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
  visitantes: yup
    .array()
    .of(resolverVisitantes)
    .min(1, "Debes agregar al menos un visitante."),
}) as yup.ObjectSchema<FormExpressVisitante>;

export const initialValue: FormExpressVisitante = {
  tipo_registro: 0,
  visitantes: [],
  id_anfitrion: "",
  actividades: "",
  accesos: [],
  fecha_entrada: dayjs().add(1, "hours").startOf("hour"),
  comentarios: "",
};
