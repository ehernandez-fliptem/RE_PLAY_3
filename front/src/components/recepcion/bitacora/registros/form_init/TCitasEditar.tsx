import * as yup from "yup";
import {
  REGEX_BASE64,
  REGEX_NAME,
} from "../../../../../app/constants/CommonRegex";

export type FormEditCitasVisitante = {
  // Generales
  tipo_registro: number;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;

  img_usuario: string;
  img_ide_a: string;
  img_ide_b: string;
  tipo_ide: number;
  numero_ide: string;
  id_pase?: string;

  //Adicionales
  comentarios?: string;
  placas?: string;
  desc_vehiculo?: string;
};

export const resolverCitas = yup.object().shape({
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
  id_pase: yup.string().nullable(),
  comentarios: yup.string(),
  placas: yup.string(),
  desc_vehiculo: yup.string(),
}) as yup.ObjectSchema<FormEditCitasVisitante>;

export const initialValue: FormEditCitasVisitante = {
  tipo_registro: 0,
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  img_usuario: "",
  img_ide_a: "",
  img_ide_b: "",
  tipo_ide: 1,
  numero_ide: "",
  id_pase: "",
  comentarios: "",
  placas: "",
  desc_vehiculo: "",
};
