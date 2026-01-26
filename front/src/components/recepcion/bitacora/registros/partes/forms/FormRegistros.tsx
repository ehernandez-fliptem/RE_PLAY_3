import { Box, Button, Stack } from "@mui/material";
import { Fragment, Suspense, useEffect, useState } from "react";
import {
  AutocompleteElement,
  Controller,
  FormProvider,
  SelectElement,
  TextFieldElement,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form-mui";
import ProfilePicturePreview from "../../../../../utils/fallbackRender/ProfilePicturePreview";
import ProfilePicture from "../../../../../utils/ProfilePicture";
import { MuiTelInput } from "mui-tel-input";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  REGEX_BASE64,
  REGEX_NAME,
} from "../../../../../../app/constants/CommonRegex";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { Delete, Add, Image } from "@mui/icons-material";
import { esES } from "@mui/x-data-grid/locales";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import AutocompleteInput from "../utils/AutocompleteInput";
import AutocompleteOcrInput from "../utils/AutocompleteOcrInput";
const pageSizeOptions = [5, 10, 25];

type Pases = {
  _id: string;
  codigo: string;
};

type FormValues = {
  id: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
  img_usuario: string;
  tipo_ide: number | null;
  img_ide_a: string;
  img_ide_b: string;
  numero_ide: string;
  empresa?: string;
  id_pase?: string;
};

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
  telefono: yup.string(),
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
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  id: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  correo: "",
  telefono: "",
  img_usuario: "",
  tipo_ide: null,
  img_ide_a: "",
  img_ide_b: "",
  numero_ide: "",
  empresa: "",
  id_pase: "",
};

type Props = {
  name: string;
};

export default function FormRegistros({ name }: Props) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name,
  });
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolverVisitantes),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [pases, setPases] = useState<Pases[]>([]);

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const res = await clienteAxios.get("/api/pases/activos");
        if (res.data.estado) {
          setPases(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistros();
  }, []);

  const handleAdd = async (data: FormValues) => {
    try {
      await resolverVisitantes.validate(data);
      const existCorreo = (fields as FormValues[]).some(
        (item) => item.correo === data.correo
      );
      if (existCorreo) {
        if (existCorreo)
          formContext.setError("correo", {
            type: "manual",
            message: "El correo ya existe.",
          });
        formContext.setFocus("correo");
        return;
      }
      if (data.id_pase) {
        setPases(pases.filter((item) => item._id !== data.id_pase));
      }
      append(data);
      formContext.reset(initialValue);
    } catch (error: unknown) {
      handlingError(error);
    }
  };

  const handleDelete = (ID: string) => {
    const index = fields.map((item) => item.id).indexOf(ID);
    remove(index);
  };

  const handleChange = async (value: string, name: "telefono") => {
    formContext.setValue(name, value, { shouldValidate: true });
  };

  return (
    <Fragment>
      <FormProvider {...formContext}>
        <AutocompleteInput
          extraQueries="tipo=2"
          searchValueName="correo"
          textFieldProps={{
            name: "correo",
            label: "Correo",
            required: true,
            fullWidth: true,
            margin: "normal",
          }}
        />
        <SelectElement
          name="tipo_ide"
          label="Tipo de Identificación"
          required
          fullWidth
          margin="normal"
          options={[
            {
              id: "1",
              label: "Oficial",
            },
            {
              id: "2",
              label: "Licencia de Conducir",
            },
            {
              id: "3",
              label: "Pasaporte",
            },
            {
              id: "4",
              label: "Otro",
            },
          ]}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
          }}
        >
          <Suspense fallback={<ProfilePicturePreview />}>
            <ProfilePicture
              required
              label="Visitante"
              name="img_usuario"
              allowFiles={["png", "jpeg", "jpg"]}
            />
          </Suspense>
          <Suspense fallback={<ProfilePicturePreview />}>
            <ProfilePicture
              required
              adjustImageToBox
              backgroundIcon={<Image />}
              variant="square"
              label="Identificación Frontal"
              name="img_ide_a"
              allowFiles={["png", "jpeg", "jpg"]}
            />
          </Suspense>
          <Suspense fallback={<ProfilePicturePreview />}>
            <ProfilePicture
              required
              adjustImageToBox
              backgroundIcon={<Image />}
              variant="square"
              label="Identificación Reverso"
              name="img_ide_b"
              allowFiles={["png", "jpeg", "jpg"]}
            />
          </Suspense>
        </Stack>
        <AutocompleteOcrInput
          parentImgName="img_ide_b"
          textFieldProps={{
            name: "numero_ide",
            label: "Número de identificación",
            required: true,
            fullWidth: true,
            margin: "normal",
          }}
        />
        <AutocompleteElement
          name="id_pase"
          label="Pase"
          matchId
          loading={isLoading}
          options={pases.map((item) => {
            return { id: item._id, label: item.codigo };
          })}
          textFieldProps={{
            defaultValue: "",
            margin: "normal",
          }}
          autocompleteProps={{
            noOptionsText: "No hay opciones.",
          }}
        />
        <TextFieldElement
          name="nombre"
          label="Nombre"
          required
          fullWidth
          margin="normal"
        />
        <TextFieldElement
          name="apellido_pat"
          label="Apellido Paterno"
          required
          fullWidth
          margin="normal"
        />
        <TextFieldElement
          name="apellido_mat"
          label="Apellido Materno"
          fullWidth
          margin="normal"
        />
        <Controller
          name="telefono"
          render={({ field, fieldState }) => (
            <MuiTelInput
              name="telefono"
              label="Teléfono"
              fullWidth
              margin="normal"
              value={field.value}
              onChange={(value: string) => handleChange(value, "telefono")}
              defaultCountry="MX"
              continents={["SA", "NA"]}
              langOfCountryName="es"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              disableFormatting
            />
          )}
        />
        <TextFieldElement
          name="empresa"
          label="Empresa"
          fullWidth
          margin="normal"
        />
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
              onClick={formContext.handleSubmit(handleAdd)}
              startIcon={<Add />}
            >
              Agregar {fields.length ? `(${fields.length})` : ""}
            </Button>
          </Stack>
        </Box>
      </FormProvider>
      <Box sx={{ mt: 2 }}>
        <DataGrid
          loading={formContext.formState.isLoading}
          rows={fields as FormValues[]}
          columns={[
            {
              field: "nombre",
              headerName: "Nombre",
              flex: 1,
              display: "flex",
              minWidth: 250,
              renderCell: ({ row }) =>
                `${row.nombre} ${row.apellido_pat} ${String(row.apellido_mat)}`,
            },
            {
              field: "correo",
              headerName: "Correo",
              flex: 1,
              display: "flex",
              minWidth: 250,
            },
            {
              headerName: "Acciones",
              field: "actions",
              type: "actions",
              flex: 1,
              display: "flex",
              minWidth: 150,
              getActions: ({ row }) => {
                const gridActions = [];
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Delete color="error" />}
                    onClick={() => handleDelete(row.id)}
                    label="Eliminar"
                    title="Eliminar"
                  />
                );
                return gridActions;
              },
            },
          ]}
          disableRowSelectionOnClick
          pagination
          pageSizeOptions={pageSizeOptions}
          localeText={{
            ...esES.components.MuiDataGrid.defaultProps.localeText,
            toolbarColumns: "",
            toolbarFilters: "",
            toolbarDensity: "",
            toolbarExport: "",
            noRowsLabel: "Sin registros",
          }}
        />
      </Box>
    </Fragment>
  );
}
