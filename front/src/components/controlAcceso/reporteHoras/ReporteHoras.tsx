import { useState, useMemo, Fragment, useEffect } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { Outlet, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import type { Dayjs } from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import Spinner from "../../utils/Spinner";
import { AutocompleteElement, FormContainer } from "react-hook-form-mui";
import { ClearAll, Search, Visibility } from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { DatePicker } from "@mui/x-date-pickers";
import InfiniteAutocomplete from "../../utils/InfiniteAutocomplete";

const pageSizeOptions = [10, 25, 50];

type Empresas = {
  _id?: string;
  nombre?: string;
};

type FormValues = {
  fecha_inicio: Dayjs;
  fecha_final: Dayjs;
  usuarios?: string[];
  empresas?: string[];
};

const resolver = yup.object().shape({
  fecha_inicio: yup
    .mixed()
    .test(
      "isDayjs",
      "La hora de entrada debe ser menor a la hora de salida.",
      (value) => {
        return dayjs.isDayjs(value) && value.isValid();
      }
    )
    .required("Este campo es obligatorio."),
  fecha_final: yup
    .mixed()
    .test(
      "isDayjs",
      "La hora de entrada debe ser menor a la hora de salida.",
      (value) => {
        return dayjs.isDayjs(value) && value.isValid();
      }
    )
    .required("Este campo es obligatorio."),
  usuarios: yup.array().of(yup.string()),
  empresas: yup.array().of(yup.string()),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  fecha_inicio: dayjs().startOf("day"),
  fecha_final: dayjs().endOf("day"),
  usuarios: [],
  empresas: [],
};

export default function ReporteHoras() {
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });

  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresas[]>([]);
  const [canSearch, setCanSearch] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get("/api/eventos/form-reporte-horas");
        if (res.data.estado) {
          setEmpresas(res.data.datos.empresas);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistro();
  }, [formContext]);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          if (canSearch) {
            const urlParams = new URLSearchParams({
              filter: JSON.stringify(params.filterModel.quickFilterValues),
              pagination: JSON.stringify(params.paginationModel),
              sort: JSON.stringify(params.sortModel),
            });
            const res = await clienteAxios.post(
              "/api/eventos/reportes-horas?" + urlParams.toString(),
              {
                datos: formContext.getValues(),
              }
            );
            if (res.data.estado) {
              setError("");
              rows = res.data.datos.paginatedResults || [];
              rowCount = res.data.datos.totalCount[0]?.count || 0;
            }
          }
          setIsLoadingData(false);
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        }

        return {
          rows,
          rowCount,
        };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSearch]
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

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setCanSearch(true);
    setIsLoadingData(true);
    if (canSearch) apiRef.current?.dataSource.fetchRows();
  };

  const clearForm = () => {
    formContext.reset();
  };

  const verRegistro = (row: {
    dias_laborados: string[];
    id_usuario: string;
  }) => {
    const { dias_laborados, id_usuario } = row;
    const inicio = dias_laborados[0]
      ? dayjs(dias_laborados[0]).valueOf()
      : formContext.getValues("fecha_inicio").valueOf();
    const final = dias_laborados[dias_laborados.length - 1]
      ? dayjs(dias_laborados[dias_laborados.length - 1]).valueOf()
      : formContext.getValues("fecha_final").valueOf();
    navigate(`detalle-reporte/${id_usuario}?inicio=${inicio}&final=${final}`);
  };

  return (
    <Fragment>
      <Box component="section" sx={{ mb: 4 }}>
        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${lighten(
              alpha(theme.palette.divider, 0.3),
              0.88
            )}`,
          })}
        >
          <CardContent>
            {isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Reporte de Horas
                </Typography>
                <Grid container rowSpacing={0} columnSpacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="fecha_inicio"
                      render={({ field, fieldState }) => (
                        <DatePicker
                          {...field}
                          label="Fecha de Inicio"
                          name={field.name}
                          value={field.value || dayjs()}
                          onChange={(value) => field.onChange(value)}
                          slotProps={{
                            textField: {
                              required: true,
                              margin: "normal",
                              fullWidth: true,
                              size: "small",
                              error: !!fieldState.error?.message,
                              helperText: fieldState.error?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="fecha_final"
                      render={({ field, fieldState }) => (
                        <DatePicker
                          {...field}
                          label="Fecha de Fin"
                          name={field.name}
                          value={field.value || dayjs()}
                          onChange={(value) => field.onChange(value)}
                          slotProps={{
                            textField: {
                              required: true,
                              margin: "normal",
                              fullWidth: true,
                              size: "small",
                              error: !!fieldState.error?.message,
                              helperText: fieldState.error?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="usuarios"
                      control={formContext.control}
                      render={({ field }) => (
                        <InfiniteAutocomplete
                          urlApiSearch="/api/usuarios/activos?"
                          autocompleteProps={{
                            onChange: (_event, newValue) => {
                              field.onChange(newValue.map((item) => item.id));
                            },
                            multiple: true,
                            limitTags: 2,
                          }}
                          textFieldProps={{
                            label: "Usuarios",
                            margin: "normal",
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AutocompleteElement
                      name="empresas"
                      label="Empresas"
                      multiple
                      matchId
                      options={empresas.map((item) => {
                        return {
                          id: item._id,
                          label: item.nombre,
                        };
                      })}
                      textFieldProps={{
                        margin: "normal",
                      }}
                      autocompleteProps={{
                        noOptionsText: "No hay opciones.",
                        limitTags: 2,
                      }}
                    />
                  </Grid>
                </Grid>
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
                  {isLoadingData ? (
                    <Spinner />
                  ) : (
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
                        color="secondary"
                        onClick={clearForm}
                        startIcon={<ClearAll />}
                      >
                        Limpiar
                      </Button>
                      <Button
                        disabled={!formContext.formState.isValid}
                        type="submit"
                        size="medium"
                        variant="contained"
                        startIcon={<Search />}
                      >
                        Buscar
                      </Button>
                    </Stack>
                  )}
                </Box>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
      <div style={{ position: "relative" }}>
        <DataGrid
          apiRef={apiRef}
          initialState={initialState}
          getRowId={(row) => row.id_general}
          columns={[
            {
              headerName: "ID",
              field: "id_general",
              flex: 1,
              display: "flex",
            },
            {
              headerName: "Usuario",
              field: "nombre",
              flex: 1,
              display: "flex",
              minWidth: 180,
            },
            {
              headerName: "Tiempo total",
              field: "total_horas",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 120,
              valueGetter: (value) =>
                dayjs.duration(value).format("HH:mm:ss") + " hrs.",
            },
            {
              headerName: "Días laborados",
              field: "dias_laborados",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 120,
              valueGetter: (value: []) => value?.length || 0,
            },
            {
              headerName: "Alertas",
              field: "alertas",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 100,
              valueGetter: (value: []) => value?.length || 0,
            },
            {
              headerName: "Acciones",
              field: "activo",
              type: "actions",
              align: "center",
              flex: 1,
              display: "flex",
              minWidth: 120,
              getActions: ({ row }) => {
                const gridActions = [];
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Visibility color="primary" />}
                    onClick={() => verRegistro(row)}
                    label="Ver"
                    title="Ver"
                  />
                );
                return gridActions;
              },
            },
          ]}
          disableRowSelectionOnClick
          disableColumnFilter
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
            toolbar: () => (
              <DataGridToolbar showSearchButton={false} tableTitle="Resúmen" />
            ),
          }}
        />
        {error && (
          <ErrorOverlay
            error={error}
            gridDataRef={apiRef.current?.dataSource}
          />
        )}
        <Outlet />
      </div>
    </Fragment>
  );
}
