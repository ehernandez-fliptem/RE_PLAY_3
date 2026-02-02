import { Fragment, useState } from "react";
import { useNavigate } from "react-router";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Build,
  Check,
  ChevronLeft,
  Close,
  CloudDownload,
  Mail,
  PriorityHigh,
} from "@mui/icons-material";

import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import InputFileUpload from "../../utils/FileUpload";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import ModalContainer from "../../utils/ModalContainer";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { esES } from "@mui/x-data-grid/locales";
import Spinner from "../../utils/Spinner";

type Errores = {
  nombre: string;
  correo: string;
  usuario: string;
  contrasena: string;
  rol: string;
};

type TEmpleados = {
  _id: string;
  usuario: string;
  correo: string;
  contrasena: string;
  rol: number[];
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  movil?: string;
  telefono?: string;
  extension?: string;
  id_empresa: string;
  piso: string;
  puesto?: string;
  departamento?: string;
  cubiculo?: string;
  envioHabilitado?: boolean;
  correoEnviado?: boolean;
  errores?: Errores;
};

const pageSizeOptions = [10, 25, 50];

export default function CargaEmpleados() {
  const navigate = useNavigate();
  const { roles } = useSelector((state: IRootState) => state.config.data);
  const [registros, setRegistros] = useState<TEmpleados[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sePuedeEnviar, setSePuedeEnviar] = useState(false);
  const [error, setError] = useState(false);
  const [envioCorreos, setEnvioCorreos] = useState(true);
  const [empleadosGuardados, setEmpleadosGuardados] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errores, setErrores] = useState<Errores>({
    nombre: "",
    correo: "",
    usuario: "",
    contrasena: "",
    rol: "",
  });
  const presetDatos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setEnvioCorreos(checked);
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(false);
    setIsLoading(true);
    setRegistros([]);
    try {
      const allowFiles = ["csv", "xlsx", "xls"];
      const file = (e.target.files as FileList)[0];
      if (!file) {
        enqueueSnackbar("No subiste ningún archivo.", { variant: "warning" });
      }
      const type_file = file.name.split(".")[1];
      if (!allowFiles.find((item) => item === type_file)) {
        enqueueSnackbar(`El tipo de archivo ${type_file} no está permitido.`, {
          variant: "warning",
        });
        return;
      }
      const data = new FormData();
      data.append("document", file, file.name);
      const res = await clienteAxios.post("/api/empleados/cargar-formato", data);

      if (res.data.estado) {
        setRegistros(res.data.datos);
        setSePuedeEnviar(true);
      } else {
        setError(true);
        setRegistros(res.data.datos);
        setSePuedeEnviar(false);
        enqueueSnackbar("Revisa los valores en tu archivo.", {
          variant: "warning",
        });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoading(false);
      setEmpleadosGuardados(false);
    }
  };

  const descargarFormato = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDescargando(true);
    try {
      const res = await clienteAxios.get("/api/empleados/descargar-formato", {
        responseType: "blob",
      });
      if (res.data) {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Empleados.xlsx`);
        document.body.appendChild(link);
        link.click();
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setDescargando(false);
    }
  };

  const enviar = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      e.preventDefault();
      let key;
      setIsLoading(true);
      setEmpleadosGuardados(false);
      if (envioCorreos) {
        key = enqueueSnackbar(`Enviando correos`, {
          variant: "info",
        });
      }
      const res = await clienteAxios.post("/api/empleados/programacion", {
        registros,
        envioCorreos,
      });
      if (envioCorreos && key) closeSnackbar(key);
      if (res.data.estado) {
        const { empleados, correos, registros } = res.data.datos;
        enqueueSnackbar(`Empleados creados: ${empleados}`, {
          variant: "success",
        });
        if (envioCorreos)
          enqueueSnackbar(`Correo enviados: ${correos}`, {
            variant: "success",
          });
        setEmpleadosGuardados(true);
        setRegistros(registros);
      } else {
        setError(true);
        setRegistros(res.data.datos);
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoading(false);
      setSePuedeEnviar(false);
    }
  };

  const verError = (id: string) => {
    const datos = registros.find((item) => item._id === id);
    setErrores(datos?.errores || { ...errores });
    setShowError(true);
  };

  const regresar = () => {
    navigate(`/empleados`);
  };

  return (
    <Box component="div" sx={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        getRowId={(rows) => rows._id}
        getRowHeight={() => "auto"}
        loading={isLoading}
        rows={registros}
        columns={[
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
            renderCell: ({ row }) =>
              `${row.nombre || ""} ${row.apellido_pat || ""} ${
                row.apellido_mat || ""
              }`,
          },
          {
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 120,
          },
          {
            headerName: "Piso",
            field: "piso",
            flex: 1,
            display: "flex",
            minWidth: 120,
          },
          {
            headerName: "Acceso",
            field: "accesos",
            flex: 1,
            display: "flex",
            minWidth: 120,
            valueFormatter: (value: { identificador: string }[] = []) =>
              value.map((item) => item.identificador).join(" / "),
          },
          {
            headerName: "Correo",
            field: "correo",
            flex: 1,
            display: "flex",
            minWidth: 200,
          },
          {
            headerName: "Contraseña",
            field: "contrasena",
            flex: 1,
            display: "flex",
            minWidth: 120,
            valueGetter: () => "**********",
          },
          {
            headerName: "Roles",
            field: "rol",
            flex: 1,
            display: "flex",
            minWidth: 150,
            cellClassName: "d-flex flex-wrap",
            renderCell: ({ value }) => (
              <Grid container spacing={1} sx={{ width: "100%", my: 1 }}>
                {value.map((item: number) => (
                  <Grid key={item} size={12}>
                    <Chip
                      label={roles[item]?.nombre}
                      size="small"
                      sx={{
                        width: "100%",
                        bgcolor: roles[item]?.color || "#C4C4C4",
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            ),
          },
          {
            headerName: "Estado",
            field: "errores",
            filterable: true,
            type: "actions",
            flex: 1,
            display: "flex",
            minWidth: 100,
            getActions: ({ row }) => [
              empleadosGuardados ? (
                <>
                  {row.envioHabilitado ? (
                    <>
                      {row.correoEnviado ? (
                        <GridActionsCellItem
                          icon={<Mail color="success" />}
                          label="Correo enviado"
                        />
                      ) : (
                        <GridActionsCellItem
                          icon={<Mail color="error" />}
                          label="Correo no enviado"
                        />
                      )}
                    </>
                  ) : (
                    <GridActionsCellItem
                      icon={<Check color="success" />}
                      label="Sin errores"
                    />
                  )}
                </>
              ) : (
                <>
                  {row.errores ? (
                    <GridActionsCellItem
                      icon={<PriorityHigh color="error" />}
                      onClick={() => verError(row._id)}
                      label="Error"
                    />
                  ) : (
                    <GridActionsCellItem
                      icon={<Check color="success" />}
                      label="Sin errores"
                    />
                  )}
                </>
              ),
            ],
          },
        ]}
        disableRowSelectionOnClick
        rowSelection={false}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
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
            <Fragment>
              <DataGridToolbar
                tableTitle="Carga masiva de empleados"
                showExportButton={false}
              />
              {descargando ? (
                <Spinner size="small" />
              ) : (
                <Stack
                  spacing={2}
                  display="flex"
                  direction={{ xs: "column", sm: "row" }}
                  sx={{ p: 1 }}
                >
                  <Box sx={{ width: "100%" }}>
                    <FormControlLabel
                      label="Enviar correos a empleados"
                      control={
                        <Checkbox
                          name="envioCorreos"
                          checked={envioCorreos}
                          onChange={presetDatos}
                        />
                      }
                    />
                  </Box>
                  <Stack
                    spacing={2}
                    direction={{ xs: "column", sm: "row" }}
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    sx={{ width: "100%" }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      onClick={descargarFormato}
                      startIcon={<CloudDownload fontSize="small" />}
                      sx={{ width: "100%", mr: 1 }}
                    >
                      Descargar
                    </Button>
                    <InputFileUpload
                      buttonProps={{
                        sx: { width: "100%" },
                        size: "small",
                        variant: "contained",
                      }}
                      name="envioCorreos"
                      onUpload={onChange}
                      label="Subir"
                    />
                  </Stack>
                </Stack>
              )}
              <Divider
                sx={(theme) => ({
                  borderBottom: `1px solid ${lighten(
                    alpha(theme.palette.divider, 0.3),
                    0.88
                  )}`,
                })}
              />
            </Fragment>
          ),
        }}
      />
      <Divider sx={{ my: 2 }} />
      <Box
        component="footer"
        sx={{
          display: "flex",
          justifyContent: "end",
          mt: 2,
          mb: 0.5,
        }}
      >
        {!isLoading && (
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
              onClick={regresar}
              startIcon={<Close />}
            >
              Cancelar
            </Button>
            {sePuedeEnviar && (
              <Button
                variant="contained"
                color="primary"
                onClick={enviar}
                disabled={error}
                startIcon={<Build />}
              >
                Procesar
              </Button>
            )}
          </Stack>
        )}
      </Box>
      {showError && <ModalErrores errores={errores} setOpen={setShowError} />}
    </Box>
  );
}

type PropsModalError = {
  errores: Errores;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};
type ErrorEntry = Record<string, string>;

const ModalErrores = ({ errores, setOpen }: PropsModalError) => {
  const erroresArr = Object.entries(errores).reduce(
    (acc: ErrorEntry[], [key, value]) => {
      acc.push({ [key]: value });
      return acc;
    },
    []
  );

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Errores
          </Typography>
          <Grid container spacing={1} sx={{ my: 2 }}>
            {erroresArr.map((item) => {
              const [key, value] = Object.entries(item)[0];
              return (
                <>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Typography variant="subtitle1">
                      <strong>{key.toUpperCase()}:</strong>
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 10 }}>
                    <Typography color="error" variant="subtitle1">
                      {value}
                    </Typography>
                  </Grid>
                </>
              );
            })}
          </Grid>
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "end",
            }}
          >
            <Stack
              spacing={2}
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="end"
              sx={{ width: "100%" }}
            >
              <Button
                sx={{ width: { xs: "100%", sm: "auto" } }}
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={() => setOpen(false)}
              >
                <ChevronLeft /> Regresar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </ModalContainer>
  );
};
