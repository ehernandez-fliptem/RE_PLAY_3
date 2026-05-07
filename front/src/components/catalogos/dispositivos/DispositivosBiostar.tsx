import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridDataSource,
  type GridInitialState,
  GridActionsCellItem,
  useGridApiRef,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, NetworkCheck, Star, StarBorder, Visibility } from "@mui/icons-material";
import { Chip, IconButton, Tooltip } from "@mui/material";
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

  const establecerMain = async (ID: string, nombre: string) => {
    try {
      const res = await clienteAxios.patch(`/api/dispositivos-biostar/${ID}/main`, {});
      if (res.data.estado) {
        await Swal.fire({
          icon: "success",
          title: "Conexion principal",
          text: `Se establecio '${nombre}' como conexion main.`,
        });
        apiRef.current?.dataSource?.fetchRows?.();
      } else {
        await Swal.fire({
          icon: "warning",
          title: "No se pudo actualizar",
          text: res.data.mensaje || "No se pudo establecer como main.",
        });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    }
  };

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
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
            headerName: "Main",
            field: "es_main",
            flex: 0.5,
            minWidth: 90,
            align: "center",
            headerAlign: "center",
            renderCell: (params) => (
              <Chip
                label={params.value ? "Si" : "No"}
                color={params.value ? "warning" : "default"}
                size="small"
                sx={{ width: "100%" }}
              />
            ),
          },
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
              <GridActionsCellItem
                icon={row.es_main ? <Star color="warning" /> : <StarBorder color="warning" />}
                label="Establecer main"
                onClick={() => establecerMain(row._id, row.nombre)}
              />,
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
              tableTitle="Gestion de Conexiones BioStar"
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
