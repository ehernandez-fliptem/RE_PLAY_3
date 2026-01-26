import { Fragment, useState } from "react";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormHelperText,
  IconButton,
  Modal,
  Stack,
  Tooltip,
} from "@mui/material";
import * as yup from "yup";
import { MuiTelInput } from "mui-tel-input";

import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../../utils/DataGridToolbar";
import { Add, ChevronLeft, Delete } from "@mui/icons-material";
import { TextFieldElement } from "react-hook-form-mui";
import { yupResolver } from "@hookform/resolvers/yup";
import { handlingError } from "../../../../app/config/axios";
import Spinner from "../../../utils/Spinner";

type FormValues = {
  numero: string;
  extension: string;
};

const resolverContactos = yup.object().shape({
  numero: yup.string().required("El número de télefono es obligatorio."),
  extension: yup.string(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  numero: "",
  extension: "",
};

type Props = {
  name: string;
  label?: string;
  required?: boolean;
};

export default function Telefonos({ name, label, required }: Props) {
  const { control } = useFormContext();
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolverContactos),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: name,
  });
  const [open, setOpen] = useState(false);

  const handleAdd = async (data: FormValues) => {
    try {
      await resolverContactos.validate(data);
      const existNumero = (fields as unknown as FormValues[]).some(
        (item) => item.numero === data.numero
      );
      if (existNumero) {
        if (existNumero)
          formContext.setError("numero", {
            type: "manual",
            message: "El número de teléfono ya existe.",
          });
        return;
      }
      append(data);
      setOpen(false);
      formContext.reset(initialValue);
    } catch (error: unknown) {
      handlingError(error);
    }
  };

  const handleDelete = (ID: string) => {
    const index = (fields as unknown as FormValues[])
      .map((item) => item.numero)
      .indexOf(ID);
    remove(index);
  };

  const handleChange = async (value: string) => {
    formContext.setValue("numero", value, { shouldValidate: true });
  };

  return (
    <Box
      component="div"
      sx={{
        py: 3,
      }}
    >
      <Modal disableEscapeKeyDown open={open}>
        <Card
          elevation={5}
          sx={{
            position: "absolute",
            width: { xs: "90%", md: "50%", lg: "40%", xl: "30%" },
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <CardContent>
            <FormProvider {...formContext}>
              <Controller
                name="numero"
                render={({ field, fieldState }) => (
                  <MuiTelInput
                    label="Número"
                    required
                    fullWidth
                    margin="normal"
                    value={field.value}
                    onChange={handleChange}
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
                name="extension"
                label="Extensión"
                fullWidth
                margin="normal"
              />
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
                {formContext.formState.isSubmitting ? (
                  <Spinner />
                ) : (
                  <Stack
                    spacing={2}
                    direction={{ xs: "column-reverse", sm: "row" }}
                    justifyContent="end"
                    sx={{ width: "100%" }}
                  >
                    <Button
                      size="small"
                      type="button"
                      variant="contained"
                      color="secondary"
                      onClick={() => setOpen(false)}
                      startIcon={<ChevronLeft />}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      type="button"
                      variant="contained"
                      color="primary"
                      startIcon={<Add />}
                      onClick={formContext.handleSubmit(handleAdd)}
                    >
                      Agregar
                    </Button>
                  </Stack>
                )}
              </Box>
            </FormProvider>
          </CardContent>
        </Card>
      </Modal>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          return (
            <Fragment>
              <Box component="div" sx={{ height: 300, width: "100%" }}>
                <DataGrid
                  sx={(theme) => ({
                    border: fieldState.error
                      ? `1px solid ${theme.palette.error.main}`
                      : `1px solid ${theme.palette.divider}`,
                  })}
                  density="compact"
                  getRowId={(row) => row.numero}
                  getRowHeight={() => "auto"}
                  columns={[
                    {
                      headerName: "Número",
                      field: "numero",
                      flex: 1,
                      display: "flex",
                    },
                    {
                      headerName: "Extensión",
                      field: "extension",
                      flex: 1,
                      display: "flex",
                    },
                    {
                      headerName: "Acciones",
                      field: "actions",
                      type: "actions",
                      align: "center",
                      flex: 1,
                      getActions: ({ row }) => [
                        <GridActionsCellItem
                          icon={<Delete />}
                          onClick={() => handleDelete(row.numero)}
                          label="Eliminar"
                          title="Eliminar"
                        />,
                      ],
                    },
                  ]}
                  disableRowSelectionOnClick
                  rows={field.value}
                  showToolbar
                  localeText={{
                    ...esES.components.MuiDataGrid.defaultProps.localeText,
                    toolbarColumns: "",
                    toolbarFilters: "",
                    toolbarDensity: "",
                    toolbarExport: "",
                    noRowsLabel: "Sin registros",
                  }}
                  slots={{
                    toolbar: () => (
                      <DataGridToolbar
                        tableTitle={`${label} ${required ? "*" : ""}`}
                        customActionButtons={
                          <Tooltip title="Agregar">
                            <IconButton onClick={() => setOpen(true)}>
                              <Add fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      />
                    ),
                  }}
                />
                {fieldState.error && (
                  <FormHelperText error sx={{ pl: 2 }}>
                    {fieldState.error.message}
                  </FormHelperText>
                )}
                {!fieldState.error && required && (
                  <FormHelperText sx={{ pl: 2 }}>
                    * Debes agregar al menos 1 contacto
                  </FormHelperText>
                )}
              </Box>
            </Fragment>
          );
        }}
      />
    </Box>
  );
}
