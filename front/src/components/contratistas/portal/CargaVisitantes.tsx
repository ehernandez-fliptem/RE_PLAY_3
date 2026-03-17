import { Fragment, useState } from "react";
import { useNavigate } from "react-router";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import {
  Build,
  Check,
  ChevronLeft,
  Close,
  CloudDownload,
  PriorityHigh,
} from "@mui/icons-material";

import { clienteAxios, handlingError } from "../../../app/config/axios";
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
import InputFileUpload from "../../utils/FileUpload";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import ModalContainer from "../../utils/ModalContainer";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { esES } from "@mui/x-data-grid/locales";

type Errores = {
  nombre?: string;
  apellido_pat?: string;
  apellido_mat?: string;
  correo?: string;
  telefono?: string;
};

type TUsuarios = {
  _id: string;
  correo: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  telefono?: string;
  errores?: Errores;
};

const pageSizeOptions = [10, 25, 50];

export default function CargaVisitantesContratistas() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<TUsuarios[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sePuedeEnviar, setSePuedeEnviar] = useState(false);
  const [error, setError] = useState(false);
  const [usuariosGuardados, setUsuariosGuardados] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errores, setErrores] = useState<Errores>({
    nombre: "",
    apellido_pat: "",
    apellido_mat: "",
    correo: "",
    telefono: "",
  });

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
      const res = await clienteAxios.post(
        "/api/contratistas-visitantes/cargar-formato",
        data
      );

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
      setUsuariosGuardados(false);
    }
  };

  const descargarFormato = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDescargando(true);
    try {
      const res = await clienteAxios.get(
        "/api/contratistas-visitantes/descargar-formato",
        {
          responseType: "blob",
        }
      );
      if (res.data) {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `VisitantesContratistas.xlsx`);
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
      setUsuariosGuardados(false);
      key = enqueueSnackbar(`Guardando registros`, {
        variant: "info",
      });
      const res = await clienteAxios.post("/api/contratistas-visitantes/programacion", {
        registros,
      });
      if (key) closeSnackbar(key);
      if (res.data.estado) {
        const { visitantes, registros } = res.data.datos;
        enqueueSnackbar(`Visitantes creados: ${visitantes}`, {
          variant: "success",
        });
        setUsuariosGuardados(true);
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
    navigate(`/portal-contratistas/visitantes`);
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
            headerName: "Correo",
            field: "correo",
            flex: 1,
            display: "flex",
            minWidth: 200,
          },
          {
            headerName: "Teléfono",
            field: "telefono",
            flex: 1,
            display: "flex",
            minWidth: 140,
          },
          {
            headerName: "Errores",
            field: "errores",
            flex: 1,
            display: "flex",
            minWidth: 100,
            type: "actions",
            getActions: ({ row }) => [
              row.errores ? (
                <GridActionsCellItem
                  icon={<PriorityHigh color="error" />}
                  onClick={() => verError(row._id)}
                  label="Ver errores"
                />
              ) : (
                <GridActionsCellItem
                  icon={<Check color="success" />}
                  label="Ok"
                />
              ),
            ],
          },
        ]}
        disableColumnFilter
        disableRowSelectionOnClick
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
              tableTitle="Carga Masiva de Visitantes"
              customActionButtons={
                <Fragment>
                  <InputFileUpload
                    name="document"
                    label="Subir archivo"
                    onUpload={onChange}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={descargarFormato}
                    disabled={descargando}
                  >
                    <CloudDownload fontSize="small" /> Formato
                  </Button>
                </Fragment>
              }
            />
          ),
        }}
      />
      {showError && (
        <ModalContainer containerProps={{ maxWidth: "md" }}>
          <Card elevation={5}>
            <CardContent>
              <Typography variant="h5" component="h5" textAlign="center">
                Errores del registro
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {Object.entries(errores).map(([key, value]) => (
                  <Grid size={12} key={key}>
                    <Box
                      component="div"
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: alpha("#F00", 0.1),
                        border: `1px solid ${lighten("#F00", 0.4)}`,
                      }}
                    >
                      <strong>{key}:</strong> {value || "-"}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Box
                component="footer"
                sx={{
                  display: "flex",
                  justifyContent: "end",
                  mt: 3,
                  mb: 0.5,
                }}
              >
                <Button
                  type="button"
                  size="medium"
                  variant="contained"
                  color="secondary"
                  onClick={() => setShowError(false)}
                >
                  <Close /> Cerrar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </ModalContainer>
      )}
      <Box component="div" sx={{ mt: 2 }}>
        <Card elevation={0}>
          <CardContent>
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={regresar}
              >
                <ChevronLeft /> Regresar
              </Button>
              <Button
                type="button"
                size="medium"
                variant="contained"
                disabled={!sePuedeEnviar || isLoading || error}
                onClick={enviar}
              >
                <Build /> Guardar
              </Button>
            </Stack>
            {usuariosGuardados && (
              <Typography sx={{ mt: 2 }} color="success.main">
                Registros guardados correctamente.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
