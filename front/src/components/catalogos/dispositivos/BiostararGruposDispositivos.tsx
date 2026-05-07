import { useEffect, useMemo, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { IconButton, Tooltip } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import Swal from "sweetalert2";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { useNavigate } from "react-router-dom";

type GrupoDispositivo = {
  id_externo: string;
  nombre: string;
  depth: number;
  parent_id: string;
};

export default function BiostararGruposDispositivos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<GrupoDispositivo[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/grupos-dispositivos");
      if (res.data.estado) setRows(res.data.datos || []);
      else {
        const message = String(res.data.mensaje || "").toLowerCase();
        const isBiostarUnavailable =
          message.includes("no se pudo iniciar sesion en biostar") ||
          message.includes("primero configura la conexion global de biostar");
        if (isBiostarUnavailable) {
          const action = await Swal.fire({
            icon: "error",
            title: "No se pudo consultar",
            text: "No se pudo iniciar sesion en BioStar.",
            confirmButtonText: "Ir a configuracion",
          });
          if (action.isConfirmed) navigate("/biostarar/conexion");
        } else {
          await Swal.fire({ icon: "error", title: "No se pudo consultar", text: res.data.mensaje || "No se pudieron cargar los grupos." });
        }
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    return () => {
      Swal.close();
    };
  }, []);

  const columns = useMemo<GridColDef<GrupoDispositivo>[]>(
    () => [
      { field: "nombre", headerName: "Grupo de dispositivo", flex: 1, minWidth: 240 },
      { field: "id_externo", headerName: "ID", flex: 0.5, minWidth: 120 },
      { field: "depth", headerName: "Nivel", flex: 0.4, minWidth: 100 },
    ],
    []
  );

  return (
    <div style={{ minHeight: 420 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id_externo || row.nombre}
        loading={loading}
        disableColumnFilter
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          toolbarColumns: "",
          toolbarFilters: "",
          toolbarDensity: "",
          toolbarExport: "",
          noRowsLabel: "Sin registros",
        }}
        showToolbar
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Grupos de Dispositivos BioStar"
              customActionButtons={
                <Tooltip title="Recargar">
                  <IconButton size="small" onClick={cargar}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
              }
            />
          ),
        }}
      />
    </div>
  );
}
