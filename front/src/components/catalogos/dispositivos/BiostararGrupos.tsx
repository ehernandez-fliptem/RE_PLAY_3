import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
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

function normalizarNombreGrupo(value: string): string {
  const limpio = String(value || "").trim();
  if (!limpio) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

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
      inputAttributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        name: `biostar-grupo-${Date.now()}`,
      },
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => (!String(value || "").trim() ? "El nombre es obligatorio." : undefined),
      didOpen: () => {
        const input = Swal.getInput();
        if (input) input.value = "";
      },
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

      const res = await clienteAxios.post("/api/biostar-grupos", { nombre: normalizarNombreGrupo(String(result.value)) });
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

  const editarGrupo = async (row: GrupoBiostar) => {
    if (row.es_all_users) return;
    const result = await Swal.fire({
      title: "Editar Grupo",
      input: "text",
      inputLabel: "Nombre del grupo",
      inputValue: row.nombre,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => (!String(value || "").trim() ? "El nombre es obligatorio." : undefined),
    });
    if (!result.isConfirmed) return;
    try {
      Swal.fire({
        title: "Guardando cambios...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.put(`/api/biostar-grupos/${row.id_externo}`, {
        nombre: normalizarNombreGrupo(String(result.value)),
      });
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Grupo editado", text: res.data.mensaje || "Operacion correcta." });
        await cargar();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "Operacion fallida." });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const eliminarGrupo = async (row: GrupoBiostar) => {
    if (row.es_all_users) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Eliminar grupo",
      text: `Seguro que quieres eliminar '${row.nombre}'?`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    try {
      Swal.fire({
        title: "Eliminando grupo...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.delete(`/api/biostar-grupos/${row.id_externo}`);
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Grupo eliminado", text: res.data.mensaje || "Operacion correcta." });
        await cargar();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: res.data.mensaje || "Operacion fallida." });
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
        getActions: ({ row }) =>
          row.es_all_users
            ? []
            : [
                <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => editarGrupo(row)} />,
                <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => eliminarGrupo(row)} />,
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
        disableColumnFilter
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{
          "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
        }}
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
