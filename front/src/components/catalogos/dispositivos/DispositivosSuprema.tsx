import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridDataSource,
  type GridInitialState,
  GridActionsCellItem,
  useGridApiRef,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, NetworkCheck, RestoreFromTrash, Visibility } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import DataGridToolbar from "../../utils/DataGridToolbar";
import ErrorOverlay from "../../error/DataGridError";
import Swal from "sweetalert2";

const pageSizeOptions = [10, 25, 50];

export default function DispositivosSuprema() {
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
          const res = await clienteAxios.get("/api/dispositivos-suprema?" + urlParams.toString());
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

  const cambiarEstado = async (ID: string, activo: boolean) => {
    try {
      const res = await clienteAxios.patch(`/api/dispositivos-suprema/${ID}`, { activo });
      if (res.data.estado) {
        apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
      } else {
        await Swal.fire({
          icon: "warning",
          title: "No se pudo actualizar",
          text: res.data.mensaje || "No se pudo cambiar el estado del dispositivo.",
        });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    }
  };

  const probarConexion = async (ID: string, ip: string) => {
    try {
      Swal.fire({
        title: `Probando conexion ${ip}...`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await clienteAxios.post(`/api/dispositivos-suprema/probar-conexion/${ID}`, {});
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

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          { headerName: "Nombre", field: "nombre", flex: 1, minWidth: 180 },
          { headerName: "IP", field: "direccion_ip", flex: 1, minWidth: 150 },
          { headerName: "Puerto", field: "puerto", flex: 0.6, minWidth: 100 },
          { headerName: "Usuario", field: "usuario", flex: 1, minWidth: 140 },
          {
            headerName: "Acciones",
            field: "activo",
            type: "actions",
            align: "center",
            flex: 1,
            minWidth: 190,
            getActions: ({ row }) => [
              <GridActionsCellItem icon={<Visibility color="primary" />} label="Ver" onClick={() => navigate(`detalle-dispositivo/${row._id}`)} />,
              ...(row.activo
                ? [<GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => navigate(`editar-dispositivo/${row._id}`)} />]
                : []),
              <GridActionsCellItem icon={<NetworkCheck color="info" />} label="Probar conexion" onClick={() => probarConexion(row._id, row.direccion_ip)} />,
              row.activo ? (
                <GridActionsCellItem icon={<Delete color="success" />} label="Desactivar" onClick={() => cambiarEstado(row._id, row.activo)} />
              ) : (
                <GridActionsCellItem icon={<RestoreFromTrash color="error" />} label="Restaurar" onClick={() => cambiarEstado(row._id, row.activo)} />
              ),
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
              tableTitle="Gestion de Dispositivos Suprema"
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


