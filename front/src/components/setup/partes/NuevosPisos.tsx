import { useMemo, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  useGridApiRef,
  type GridInitialState,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import * as yup from "yup";

import { FormProvider, useForm, type SubmitHandler } from "react-hook-form";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { Add, ChevronRight, Delete } from "@mui/icons-material";
import { TextFieldElement } from "react-hook-form-mui";
import { yupResolver } from "@hookform/resolvers/yup";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { setFormErrors } from "../../helpers/formHelper";
import Spinner from "../../utils/Spinner";
import type { GridValidRowModel } from "@mui/x-data-grid";
import type { GridDataSource } from "@mui/x-data-grid";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { GridGetRowsError } from "@mui/x-data-grid";

type FormValues = {
  identificador: string;
  nombre: string;
};

const resolver = yup.object().shape({
  identificador: yup.string().required("El identificador es obligatorio."),
  nombre: yup.string().required("El nombre es obligatorio."),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  identificador: "",
  nombre: "",
};

type Props = {
  setPisos: React.Dispatch<React.SetStateAction<number>>;
};

const pageSizeOptions = [10, 25, 50];

export default function Pisos({ setPisos }: Props) {
  const apiRef = useGridApiRef();
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const [error, setError] = useState<string>();
  const [rowCount, setRowCount] = useState(0);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get(
            "/api/validacion/pisos?" + urlParams.toString()
          );
          if (res.data.estado) {
            setError("");
            rows = res.data.datos.paginatedResults || [];
            rowCount = res.data.datos.totalCount[0]?.count || 0;
            setRowCount(rowCount);
          }
        } catch (error) {
          handlingError(error);
          throw error;
        }

        return {
          rows,
          rowCount,
        };
      },
    }),
    []
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: {
          pageSize: 10,
        },
        rowCount: 0,
      },
    }),
    []
  );

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/validacion/piso", data);
      if (res.data.estado) {
        enqueueSnackbar("El piso se creó correctamente.", {
          variant: "success",
        });
        apiRef.current?.dataSource.fetchRows();
        formContext.reset(initialValue);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const handleDelete = async (ID: string) => {
    try {
      const res = await clienteAxios.delete(`api/validacion/piso/${ID}`);
      if (res.data.estado) {
        enqueueSnackbar("El piso se eliminó correctamente.", {
          variant: "success",
        });
        apiRef.current?.dataSource.fetchRows();
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      handlingError(error);
    }
  };

  const crearUsuario = () => {
    setPisos(1);
  };

  return (
    <Container component="div" maxWidth="lg" sx={{ height: "100%" }}>
      <Box component="section" sx={{ paddingY: 5 }}>
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting ? (
              <Spinner />
            ) : (
              <FormProvider {...formContext}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Pisos
                </Typography>
                <TextFieldElement
                  control={formContext.control}
                  name="identificador"
                  label="Identificador"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  control={formContext.control}
                  name="nombre"
                  label="Nombre"
                  required
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
                  <Stack
                    spacing={2}
                    direction={{ xs: "column-reverse", sm: "row" }}
                    justifyContent="end"
                    sx={{ width: "100%" }}
                  >
                    <Button
                      disabled={!formContext.formState.isValid}
                      size="small"
                      type="button"
                      variant="contained"
                      color="primary"
                      startIcon={<Add />}
                      onClick={formContext.handleSubmit(onSubmit)}
                    >
                      Agregar
                    </Button>
                  </Stack>
                </Box>
              </FormProvider>
            )}
            <Box component="div" sx={{ height: 300, width: "100%", mt: 4 }}>
              <DataGrid
                density="compact"
                apiRef={apiRef}
                initialState={initialState}
                getRowId={(row) => row._id}
                columns={[
                  {
                    headerName: "Identificador",
                    field: "identificador",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
                  },
                  {
                    headerName: "Nombre",
                    field: "nombre",
                    flex: 1,
                    display: "flex",
                    minWidth: 150,
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
                        onClick={() => handleDelete(row._id)}
                        label="Eliminar"
                        title="Eliminar"
                      />,
                    ],
                  },
                ]}
                disableColumnFilter
                disableRowSelectionOnClick
                filterDebounceMs={1000}
                dataSource={dataSource}
                dataSourceCache={null}
                onDataSourceError={(dataSourceError) => {
                  if (dataSourceError.cause instanceof AxiosError) {
                    setError(dataSourceError.cause.code);
                    return;
                  }
                  if (dataSourceError instanceof GridGetRowsError) {
                    setError(dataSourceError.message);
                    return;
                  }
                }}
                pagination
                pageSizeOptions={pageSizeOptions}
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
                  toolbar: () => <DataGridToolbar tableTitle="Piso(s)" />,
                }}
              />
              {error && (
                <ErrorOverlay
                  error={error}
                  gridDataRef={apiRef.current?.dataSource}
                />
              )}
            </Box>
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
              {rowCount > 0 && (
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
                    color="primary"
                    startIcon={<ChevronRight />}
                    onClick={crearUsuario}
                  >
                    Siguiente
                  </Button>
                </Stack>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
