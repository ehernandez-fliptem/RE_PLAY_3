import { Box, Button, Stack } from "@mui/material";
import { Fragment } from "react";
import {
  Controller,
  FormProvider,
  TextFieldElement,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form-mui";
import { MuiTelInput } from "mui-tel-input";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { REGEX_NAME } from "../../../../../../app/constants/CommonRegex";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { Delete, Add } from "@mui/icons-material";
import { esES } from "@mui/x-data-grid/locales";
import { handlingError } from "../../../../../../app/config/axios";
import AutocompleteInput from "../utils/AutocompleteInput";
const pageSizeOptions = [5, 10, 25];

type FormValues = {
  id: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
  empresa?: string;
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
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  id: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  correo: "",
  telefono: "",
  empresa: "",
};

type Props = {
  name: string;
};

export default function FormCitas({ name }: Props) {
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
          extraQueries="tipo=1"
          searchValueName="correo"
          textFieldProps={{
            name: "correo",
            label: "Correo",
            required: true,
            fullWidth: true,
            margin: "normal",
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
