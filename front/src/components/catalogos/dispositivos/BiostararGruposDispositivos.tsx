import { useEffect, useMemo, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { IconButton, Tooltip } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import Swal from "sweetalert2";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type GrupoDispositivo = {
  id_externo: string;
  nombre: string;
  depth: number;
  parent_id: string;
};

export default function BiostararGruposDispositivos() {
  const [rows, setRows] = useState<GrupoDispositivo[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/grupos-dispositivos");
      if (res.data.estado) setRows(res.data.datos || []);
      else await Swal.fire({ icon: "warning", title: "Sin datos", text: res.data.mensaje || "No se pudieron cargar los grupos." });
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
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
