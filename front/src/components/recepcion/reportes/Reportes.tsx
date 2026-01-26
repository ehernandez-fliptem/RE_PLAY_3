import { useState, useMemo, Fragment } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
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
import {
  AutocompleteElement,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import { ClearAll, Search } from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { MuiTelInput } from "mui-tel-input";
import InfiniteAutocomplete from "../../utils/InfiniteAutocomplete";

const pageSizeOptions = [10, 25, 50];

type FormValues = {
  fecha_inicio: Dayjs;
  fecha_final: Dayjs;
  correo?: string;
  nombre?: string;
  telefono?: string;
  empresa?: string;
  estatus?: number[];
  anfitriones?: string[];
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
  nombre: yup.string(),
  correo: yup.string(),
  telefono: yup.string(),
  empresa: yup.string(),
  estatus: yup.array().of(yup.number()),
  anfitriones: yup.array().of(yup.string()),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  fecha_inicio: dayjs().startOf("day"),
  fecha_final: dayjs().endOf("day"),
  correo: "",
  nombre: "",
  telefono: "",
  empresa: "",
  estatus: [],
  anfitriones: [],
};

export default function Reportes() {
  const { tipos_eventos, tipos_registros } = useSelector(
    (state: IRootState) => state.config.data
  );

  const TIPOS_EVENTOS = Object.entries(tipos_eventos)
    .filter((item) => ![0, 5, 6, 7].includes(Number(item[0])))
    .map((item) => {
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
            "/api/registros/reportes?" + urlParams.toString(),
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

  const handleChange = async (value: string, name: "telefono") => {
    formContext.setValue(name, value, { shouldValidate: true });
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
                Reportes
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
                  <TextFieldElement
                    name="correo"
                    label="Correo"
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextFieldElement
                    name="nombre"
                    label="Nombre"
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="telefono"
                    render={({ field, fieldState }) => (
                      <MuiTelInput
                        name="movil"
                        label="Teléfono"
                        fullWidth
                        margin="normal"
                        value={field.value}
                        onChange={(value: string) =>
                          handleChange(value, "telefono")
                        }
                        defaultCountry="MX"
                        continents={["SA", "NA"]}
                        langOfCountryName="es"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disableFormatting
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextFieldElement
                    name="empresa"
                    label="Empresa"
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <AutocompleteElement
                    name="estatus"
                    label="Estatus"
                    multiple
                    matchId
                    options={TIPOS_EVENTOS}
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
                    name="anfitriones"
                    control={formContext.control}
                    render={({ field }) => (
                      <InfiniteAutocomplete
                        urlApiSearch="/api/usuarios/anfitriones?"
                        autocompleteProps={{
                          onChange: (_event, newValue) => {
                            field.onChange(newValue.map((item) => item.id));
                          },
                          multiple: true,
                          limitTags: 2,
                        }}
                        textFieldProps={{
                          label: "Anfitriones",
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
              headerName: "Fecha de Acceso",
              field: "fecha_entrada",
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
              headerName: "Acceso",
              field: "tipo_registro",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 100,
              renderCell: ({ value }) => (
                <Chip
                  label={tipos_registros[value].nombre}
                  size="small"
                  sx={(theme) => ({
                    width: "100%",
                    bgcolor: tipos_registros[value].color || "secondary.main",
                    color: theme.palette.getContrastText(
                      tipos_registros[value].color || "secondary.main"
                    ),
                  })}
                />
              ),
              valueFormatter: (value) => {
                return tipos_registros[value].nombre;
              },
            },
            {
              headerName: "Correo",
              field: "correo",
              flex: 1,
              display: "flex",
              minWidth: 250,
            },
            {
              headerName: "Nombre",
              field: "nombre",
              flex: 1,
              display: "flex",
              minWidth: 180,
            },
            {
              headerName: "Teléfono",
              field: "telefono",
              flex: 1,
              display: "flex",
              minWidth: 120,
            },
            {
              headerName: "Empresa",
              field: "empresa",
              flex: 1,
              display: "flex",
              minWidth: 180,
            },
            {
              headerName: "Anfitrión",
              field: "anfitrion",
              flex: 1,
              display: "flex",
              minWidth: 180,
            },
            {
              headerName: "Estado",
              field: "estatus",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 150,
              renderCell: ({ value }) => (
                <Chip
                  label={tipos_eventos[value].nombre}
                  size="small"
                  sx={(theme) => ({
                    width: "100%",
                    bgcolor: tipos_eventos[value].color || "secondary.main",
                    color: theme.palette.getContrastText(
                      tipos_eventos[value].color || "secondary.main"
                    ),
                  })}
                />
              ),
              valueFormatter: (value) => {
                return tipos_eventos[value].nombre;
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
        <Outlet context={apiRef.current?.dataSource} />
      </div>
    </Fragment>
  );
}
