import { useState, useMemo, Fragment } from "react";
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
  Chip,
  Divider,
  Grid,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import Spinner from "../../utils/Spinner";
import { AutocompleteElement, FormContainer } from "react-hook-form-mui";
import { ClearAll, Edit, Search, Visibility } from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import InfiniteAutocomplete from "../../utils/InfiniteAutocomplete";

const pageSizeOptions = [10, 25, 50];

type FormValues = {
  fecha_inicio: Dayjs;
  fecha_final: Dayjs;
  visitantes?: string[];
  tipo?: number[];
  estatus?: number[];
  usuarios?: string[];
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
  visitantes: yup.array().of(yup.string()),
  tipo: yup.array().of(yup.number()),
  estatus: yup.array().of(yup.number()),
  usuarios: yup.array().of(yup.string()),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  fecha_inicio: dayjs().startOf("week"),
  fecha_final: dayjs().endOf("week"),
  visitantes: [],
  tipo: [],
  estatus: [],
  usuarios: [],
};

const ESTATUS: Record<
  number,
  { nombre: string; color: "warning" | "error" | "success" }
> = {
  1: { nombre: "Por validar", color: "warning" },
  2: { nombre: "Rechazado", color: "error" },
  3: { nombre: "Aceptado", color: "success" },
};

export default function ValidarDocumentos() {
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );

  const TIPOS_DOCUMENTOS = Object.entries(tipos_documentos).map((item) => {
    return {
      id: item[0],
      label: item[1].nombre,
    };
  });

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
  const [isLoadingData, setIsLoadingData] = useState(false);

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
          const res = await clienteAxios.post(
            "/api/documentos/reportes?" + urlParams.toString(),
            {
              datos: formContext.getValues(),
            }
          );
          if (res.data.estado) {
            setError("");
            rows = res.data.datos.paginatedResults || [];
            rowCount = res.data.datos.totalCount[0]?.count || 0;
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

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setIsLoadingData(true);
    apiRef.current?.dataSource.fetchRows();
  };

  const clearForm = () => {
    formContext.reset();
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-documento/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-documento/${ID}`);
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
            <FormContainer formContext={formContext} onSuccess={onSubmit}>
              <Typography variant="h4" component="h2" textAlign="center">
                Validar documentación
              </Typography>

              <Grid container rowSpacing={0} columnSpacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="fecha_inicio"
                    render={({ field, fieldState }) => (
                      <DateTimePicker
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
                      <DateTimePicker
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
                    name="visitantes"
                    control={formContext.control}
                    render={({ field }) => (
                      <InfiniteAutocomplete
                        urlApiSearch="/api/visitantes/activos?"
                        autocompleteProps={{
                          onChange: (_event, newValue) => {
                            field.onChange(newValue.map((item) => item.id));
                          },
                          multiple: true,
                          limitTags: 2,
                        }}
                        textFieldProps={{
                          label: "Visitantes",
                          margin: "normal",
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AutocompleteElement
                    name="tipo"
                    label="Tipo de documento"
                    multiple
                    matchId
                    options={TIPOS_DOCUMENTOS}
                    textFieldProps={{
                      margin: "normal",
                    }}
                    autocompleteProps={{
                      noOptionsText: "No hay opciones.",
                      limitTags: 2,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AutocompleteElement
                    name="estatus"
                    label="Estatus"
                    multiple
                    matchId
                    options={Object.entries(ESTATUS).map((item) => {
                      return {
                        id: item[0],
                        label: item[1].nombre,
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
                          label: "Validado por",
                          margin: "normal",
                        }}
                      />
                    )}
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
          </CardContent>
        </Card>
      </Box>
      <div style={{ position: "relative" }}>
        <DataGrid
          apiRef={apiRef}
          initialState={initialState}
          getRowId={(row) => row._id}
          columns={[
            {
              headerName: "Visitante",
              field: "visitante",
              flex: 1,
              display: "flex",
              minWidth: 180,
            },
            {
              headerName: "Fecha de Creación",
              field: "fecha_creacion",
              type: "date",
              flex: 1,
              display: "flex",
              minWidth: 180,
              valueGetter: (value) => {
                return new Date(value);
              },
              valueFormatter: (value) => {
                return dayjs(value).format("DD/MM/YYYY, HH:mm:ss a");
              },
            },
            {
              headerName: "Documento",
              field: "tipo",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 150,
              renderCell: ({ value }) => (
                <Chip
                  label={tipos_documentos[value].nombre}
                  size="small"
                  sx={(theme) => ({
                    width: "100%",
                    bgcolor: tipos_documentos[value].color || "secondary.main",
                    color: theme.palette.getContrastText(
                      tipos_documentos[value].color || "secondary.main"
                    ),
                  })}
                />
              ),
              valueFormatter: (value) => {
                return tipos_documentos[value].nombre;
              },
            },
            {
              headerName: "Estatus",
              field: "estatus",
              flex: 1,
              display: "flex",
              minWidth: 150,
              renderCell: ({ value }) => (
                <Chip
                  label={ESTATUS[value as keyof typeof ESTATUS].nombre}
                  color={ESTATUS[value as keyof typeof ESTATUS].color}
                  size="small"
                  sx={{
                    width: "100%",
                  }}
                />
              ),
              valueFormatter: (value: 1 | 2 | 3) => {
                return ESTATUS[value].nombre;
              },
            },
            {
              headerName: "Acciones",
              field: "activo",
              type: "actions",
              align: "center",
              flex: 1,
              display: "flex",
              minWidth: 150,
              sortable: false,
              getActions: ({ row }) => {
                const gridActions = [];
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Visibility color="primary" />}
                    onClick={() => verRegistro(row._id)}
                    label="Ver"
                    title="Ver"
                  />
                );
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Edit color="primary" />}
                    onClick={() => editarRegistro(row._id)}
                    label="Editar"
                    title="Editar"
                  />
                );
                return gridActions;
              },
            },
            {
              headerName: "Fecha de Modificación",
              field: "fecha_modificacion",
              type: "date",
              flex: 1,
              display: "flex",
              minWidth: 180,
              valueGetter: (value) => {
                return value ? new Date(value) : null;
              },
              valueFormatter: (value) => {
                return value
                  ? dayjs(value).format("DD/MM/YYYY, HH:mm:ss a")
                  : "-";
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
              <DataGridToolbar
                showSearchButton={false}
                tableTitle="Documentos"
              />
            ),
          }}
        />
        {error && (
          <ErrorOverlay
            error={error}
            gridDataRef={apiRef.current?.dataSource}
          />
        )}
        <Outlet context={apiRef.current?.dataSource} />
      </div>
    </Fragment>
  );
}
