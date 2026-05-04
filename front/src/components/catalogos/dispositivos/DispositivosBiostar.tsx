import { useEffect, useMemo, useState } from "react";
import {
  DataGrid,
  type GridDataSource,
  type GridInitialState,
  GridActionsCellItem,
  useGridApiRef,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, NetworkCheck, Sync, Visibility } from "@mui/icons-material";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import DataGridToolbar from "../../utils/DataGridToolbar";
import ErrorOverlay from "../../error/DataGridError";
import Swal from "sweetalert2";

const pageSizeOptions = [10, 25, 50];

export default function DispositivosBiostar() {
  const apiRef = useGridApiRef();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [conexionGlobal, setConexionGlobal] = useState<null | {
    direccion_ip: string;
    puerto: number;
    usuario: string;
    session_activa: boolean;
  }>(null);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get("/api/dispositivos-biostar?" + urlParams.toString());
          if (!res.data.estado) return { rows: [], rowCount: 0 };
          return {
            rows: res.data.datos.paginatedResults || [],
            rowCount: res.data.datos.totalCount[0]?.count || 0,
          };
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        }
      },
    }),
    [navigate]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: { pageSize: 10 },
        rowCount: 0,
      },
    }),
    []
  );

  const cargarConexionGlobal = async () => {
    try {
      const res = await clienteAxios.get("/api/dispositivos-biostar/conexion-global");
      if (res.data.estado) {
        setConexionGlobal(res.data.datos);
      }
    } catch (error) {
      handlingError(error);
    }
  };

  const eliminarDispositivo = async (ID: string, ip: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Confirmar borrado",
      text: `Seguro que quieres borrar ${ip}?`,
      showCancelButton: true,
      confirmButtonText: "Si, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await clienteAxios.delete(`/api/dispositivos-biostar/${ID}`);
      if (res.data.estado) {
        await Swal.fire({
          icon: "success",
          title: "Eliminado",
          text: "Dispositivo eliminado correctamente.",
        });
        apiRef.current?.dataSource?.fetchRows?.();
      } else {
        await Swal.fire({
          icon: "error",
          title: "No se pudo eliminar",
          text: res.data.mensaje || "No se pudo eliminar el dispositivo.",
        });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrio un error al eliminar el dispositivo.",
      });
    }
  };

  const probarConexion = async (ID: string, ip: string) => {
    try {
      Swal.fire({
        title: `Probando conexion ${ip}...`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await clienteAxios.post(`/api/dispositivos-biostar/probar-conexion/${ID}`, {});
      Swal.close();

      if (res.data.estado) {
        await Swal.fire({
          icon: "success",
          title: "Conexion correcta",
          text: res.data.mensaje || "El dispositivo se conecto correctamente.",
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Sin conexion",
          text: res.data.mensaje || "No se pudo conectar con el dispositivo.",
        });
      }

      apiRef.current?.dataSource?.fetchRows?.();
    } catch (error) {
      Swal.close();
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrio un error al probar la conexion.",
      });
    }
  };

  const configurarConexionGlobal = async () => {
    const resActual = await clienteAxios.get("/api/dispositivos-biostar/conexion-global");
    const actual = resActual.data?.datos;

    const result = await Swal.fire({
      title: "Conexion Global BioStar",
      html: `
        <input id="bio-ip" class="swal2-input" placeholder="Direccion IP" value="${actual?.direccion_ip || ""}">
        <input id="bio-port" class="swal2-input" placeholder="Puerto" value="${actual?.puerto || 443}">
        <input id="bio-user" class="swal2-input" placeholder="Usuario" value="${actual?.usuario || ""}">
        <input id="bio-pass" class="swal2-input" placeholder="Contrasena" type="password">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const direccion_ip = (document.getElementById("bio-ip") as HTMLInputElement)?.value?.trim();
        const puerto = Number((document.getElementById("bio-port") as HTMLInputElement)?.value || 443);
        const usuario = (document.getElementById("bio-user") as HTMLInputElement)?.value?.trim();
        const contrasena = (document.getElementById("bio-pass") as HTMLInputElement)?.value || "";
        if (!direccion_ip || !usuario) {
          Swal.showValidationMessage("IP y usuario son obligatorios.");
          return null;
        }
        return { direccion_ip, puerto, usuario, contrasena };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const payload = result.value;
    Swal.fire({
      title: "Validando conexion...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const saveRes = await clienteAxios.put("/api/dispositivos-biostar/conexion-global", payload);
      if (!saveRes.data.estado) {
        Swal.close();
        await Swal.fire({ icon: "error", title: "No se pudo guardar", text: saveRes.data.mensaje || "" });
        return;
      }

      const testRes = await clienteAxios.post("/api/dispositivos-biostar/conexion-global/probar", {});
      Swal.close();
      if (!testRes.data.estado) {
        await Swal.fire({ icon: "error", title: "Sin conexion", text: testRes.data.mensaje || "No se pudo conectar." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Guardado", text: "Conexion global activa." });
      await cargarConexionGlobal();
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const sincronizarDispositivos = async () => {
    Swal.fire({
      title: "Sincronizando dispositivos...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await clienteAxios.post("/api/dispositivos-biostar/sincronizar-dispositivos", {});
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Sincronizacion completa", text: res.data.mensaje || "" });
        apiRef.current?.dataSource?.fetchRows?.();
        await cargarConexionGlobal();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo sincronizar", text: res.data.mensaje || "" });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  useEffect(() => {
    cargarConexionGlobal();
  }, []);

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <Box sx={{ mb: 2, p: 2, border: "1px solid #e6e6e6", borderRadius: 1 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "start", sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline"><strong>Conexion Global BioStar</strong></Typography>
            <Typography variant="body2">
              {conexionGlobal
                ? `${conexionGlobal.direccion_ip}:${conexionGlobal.puerto} - ${conexionGlobal.usuario}`
                : "Sin configurar"}
            </Typography>
            <Chip
              label={conexionGlobal?.session_activa ? "Sesion activa" : "Sin sesion"}
              color={conexionGlobal?.session_activa ? "success" : "default"}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={configurarConexionGlobal} startIcon={<NetworkCheck />}>
              Configurar conexion
            </Button>
            <Button variant="contained" onClick={sincronizarDispositivos} startIcon={<Sync />}>
              Sincronizar dispositivos
            </Button>
          </Stack>
        </Stack>
      </Box>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          { headerName: "Nombre", field: "nombre", flex: 1, minWidth: 180 },
          { headerName: "IP", field: "direccion_ip", flex: 1, minWidth: 150 },
          { headerName: "Puerto", field: "puerto", flex: 0.5, minWidth: 90 },
          { headerName: "Usuario", field: "usuario", flex: 1, minWidth: 130 },
          {
            headerName: "Sesion",
            field: "session_activa",
            flex: 0.7,
            minWidth: 120,
            renderCell: (params) => (
              <Chip
                label={params.value ? "Activa" : "Sin sesion"}
                color={params.value ? "success" : "default"}
                size="small"
                sx={{ width: "100%" }}
              />
            ),
          },
          {
            headerName: "Acciones",
            field: "acciones",
            type: "actions",
            align: "center",
            flex: 1,
            minWidth: 170,
            getActions: ({ row }) => [
              <GridActionsCellItem icon={<Visibility color="primary" />} label="Ver" onClick={() => navigate(`detalle-dispositivo/${row._id}`)} />,
              <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => navigate(`editar-dispositivo/${row._id}`)} />,
              <GridActionsCellItem icon={<NetworkCheck color="info" />} label="Probar conexion" onClick={() => probarConexion(row._id, row.direccion_ip)} />,
              <GridActionsCellItem icon={<Delete color="error" />} label="Borrar" onClick={() => eliminarDispositivo(row._id, row.direccion_ip)} />,
            ],
          },
        ]}
        disableRowSelectionOnClick
        disableColumnFilter
        filterDebounceMs={1000}
        dataSource={dataSource}
        dataSourceCache={null}
        onDataSourceError={(dataSourceError) => {
          const axiosCause = (dataSourceError as any).cause as AxiosError | undefined;
          if (axiosCause?.code) {
            setError(axiosCause.code);
            return;
          }
          setError((dataSourceError as Error).message);
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
              tableTitle="Gestion de Dispositivos BioStar"
              customActionButtons={
                <Tooltip title="Agregar">
                  <IconButton size="small" onClick={() => navigate("nuevo-dispositivo")}>
                    <Add />
                  </IconButton>
                </Tooltip>
              }
            />
          ),
        }}
      />
      {error && <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
