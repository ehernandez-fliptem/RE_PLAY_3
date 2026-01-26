import { useEffect, useState } from "react";
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

import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../../../../../utils/DataGridToolbar";
import { Add, ChevronLeft, Delete } from "@mui/icons-material";
import { AutocompleteElement } from "react-hook-form-mui";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../../app/config/axios";
import Spinner from "../../../../../../utils/Spinner";
import { enqueueSnackbar } from "notistack";

type Accesos = {
  _id: string;
  identificador: string;
  nombre: string;
  modos: [1];
};

type FormValues = {
  id_acceso: string;
  modo: number;
};

const resolverAccesos = yup.object().shape({
  id_acceso: yup.string().required("Este campo es obligatorio."),
  modo: yup.number(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  id_acceso: "",
  modo: 1,
};

type Props = {
  name: string;
  label?: string;
  required?: boolean;
};

const MODO: { [key: number]: string } = {
  1: "Manual",
  2: "Automático",
  3: "Ambos",
};

export default function Accesos({ name, label, required }: Props) {
  const { control, watch, setValue } = useFormContext();
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolverAccesos),
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
  const [modosAccesos, setModosAccesos] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accesos, setAccesos] = useState<Accesos[]>([]);
  const [prevAnfitrion, setPrevAnfitrion] = useState("");
  const id_anfitrion = watch("id_anfitrion");

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const res = await clienteAxios.post(
          `/api/registros/accesos-anfitrion`,
          { id_anfitrion }
        );
        if (res.data.estado) {
          const { accesos } = res.data.datos;
          setAccesos(accesos);
          setPrevAnfitrion(id_anfitrion);
          if (prevAnfitrion) {
            if (prevAnfitrion !== id_anfitrion) {
              setValue("accesos", []);
            }
          }
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    if (id_anfitrion) obtenerRegistros();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_anfitrion]);

  const handleAdd = async (data: FormValues) => {
    try {
      await resolverAccesos.validate(data);
      const existAcceso = (fields as unknown as FormValues[]).some(
        (item) => item.id_acceso === data.id_acceso
      );
      if (existAcceso) {
        if (existAcceso)
          formContext.setError("id_acceso", {
            type: "manual",
            message: "El acceso ya fue seleccionado.",
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
      .map((item) => item.id_acceso)
      .indexOf(ID);
    remove(index);
  };

  return (
    <Box
      component="div"
      sx={{
        py: 2,
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
            {isLoading ? (
              <Spinner />
            ) : (
              <FormProvider {...formContext}>
                <AutocompleteElement
                  name="id_acceso"
                  label="Acceso"
                  required
                  matchId
                  options={accesos.map((item) => {
                    return {
                      id: item._id,
                      label: `${item.identificador} - ${item.nombre}`,
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                    onChange: (_, value) => {
                      formContext.setValue("id_acceso", value?.id || "");
                      const accesoSeleccionado = accesos.find(
                        (e) => e._id === value?.id
                      );
                      setModosAccesos(
                        accesoSeleccionado?.modos.length
                          ? accesoSeleccionado?.modos
                          : [1]
                      );
                    },
                  }}
                />
                <AutocompleteElement
                  name="modo"
                  label="Modo"
                  required
                  matchId
                  options={modosAccesos.map((item) => {
                    return {
                      id: item,
                      label: MODO[item],
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
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
                        Regresar
                      </Button>
                      <Button
                        disabled={!formContext.formState.isValid}
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
            )}
          </CardContent>
        </Card>
      </Modal>

      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          return (
            <Box component="div" sx={{ height: 300, width: "100%" }}>
              <DataGrid
                sx={(theme) => ({
                  border: fieldState.error
                    ? `1px solid ${theme.palette.error.main}`
                    : `1px solid ${theme.palette.divider}`,
                })}
                density="compact"
                getRowId={(row) => row.id_acceso}
                //   getRowHeight={() => "auto"}
                columns={[
                  {
                    headerName: "Acceso",
                    field: "id_acceso",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                    valueGetter: (value) =>
                      accesos.find((item) => item._id === value)?.nombre,
                  },
                  {
                    headerName: "Modo",
                    field: "modo",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                    valueGetter: (value) => MODO[value],
                  },
                  {
                    headerName: "Acciones",
                    field: "actions",
                    type: "actions",
                    align: "center",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                    getActions: ({ row }) => {
                      const gridActions = [];
                      gridActions.push(
                        <GridActionsCellItem
                          icon={<Delete />}
                          onClick={() => handleDelete(row.numero)}
                          label="Eliminar"
                          title="Eliminar"
                        />
                      );
                      return gridActions;
                    },
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
                      showExportButton={false}
                      showSearchButton={false}
                      customActionButtons={
                        <Tooltip title="Agregar">
                          <IconButton
                            disabled={!id_anfitrion}
                            onClick={() => setOpen(true)}
                          >
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
                  * Debes seleccionar al menos 1 acceso
                </FormHelperText>
              )}
            </Box>
          );
        }}
      />
    </Box>
  );
}
