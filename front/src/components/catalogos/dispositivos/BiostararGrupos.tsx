import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Refresh } from "@mui/icons-material";
import { Chip, IconButton, Tooltip } from "@mui/material";
import Swal from "sweetalert2";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type GrupoBiostar = {
  id_externo: string;
  nombre: string;
  total_usuarios: number;
  es_all_users: boolean;
};

export default function BiostararGrupos() {
  const [rows, setRows] = useState<GrupoBiostar[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-grupos");
      if (res.data.estado) setRows(res.data.datos || []);
      else {
        await Swal.fire({ icon: "warning", title: "Sin datos", text: res.data.mensaje || "No se pudieron cargar los grupos." });
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

  const crearGrupo = async () => {
    const result = await Swal.fire({
      title: "Nuevo Grupo",
      input: "text",
      inputLabel: "Nombre del grupo",
      inputPlaceholder: "Ejemplo: Contratistas N1",
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => (!String(value || "").trim() ? "El nombre es obligatorio." : undefined),
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Creando grupo...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await clienteAxios.post("/api/biostar-grupos", { nombre: String(result.value).trim() });
      Swal.close();

      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Grupo creado", text: res.data.mensaje || "Operacion correcta." });
        await cargar();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const columns = useMemo<GridColDef<GrupoBiostar>[]>(
    () => [
      { field: "nombre", headerName: "Grupo", flex: 1, minWidth: 200 },
      {
        field: "total_usuarios",
        headerName: "Usuarios",
        flex: 0.5,
        minWidth: 120,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "es_all_users",
        headerName: "Tipo",
        flex: 0.6,
        minWidth: 160,
        renderCell: ({ value }) =>
          value ? <Chip label="All Users" color="info" size="small" /> : <Chip label="Grupo" size="small" />,
      },
      {
        field: "acciones",
        headerName: "Acciones",
        type: "actions",
        flex: 0.5,
        minWidth: 120,
        getActions: () => [
          <GridActionsCellItem icon={<Refresh color="primary" />} label="Recargar" onClick={cargar} />,
        ],
      },
    ],
    []
  );

  return (
    <div style={{ minHeight: 420 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id_externo}
        loading={loading}
        disableRowSelectionOnClick
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
              tableTitle="Grupos BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar">
                    <IconButton size="small" onClick={cargar}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Agregar grupo">
                    <IconButton size="small" onClick={crearGrupo}>
                      <Add />
                    </IconButton>
                  </Tooltip>
                </>
              }
            />
          ),
        }}
      />
    </div>
  );
}
