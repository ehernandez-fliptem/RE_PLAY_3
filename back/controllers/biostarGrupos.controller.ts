import { Request, Response } from "express";
import BiostarConexion from "../models/BiostarConexion";
import DispositivosBiostar from "../models/DispositivosBiostar";
import { biostarRequest } from "../classes/Biostar";
import { fecha, log } from "../middlewares/log";

type GrupoBiostar = {
  id_externo: string;
  nombre: string;
  total_usuarios: number;
  es_all_users: boolean;
};

function extractGroups(payload: any): GrupoBiostar[] {
  const buckets = [
    payload?.UserGroupCollection?.rows,
    payload?.UserGroupCollection?.user_groups,
    payload?.user_groups,
    payload?.rows,
    payload?.data?.user_groups,
  ];

  const rows = (buckets.find((b) => Array.isArray(b)) || []) as any[];

  const parsed = rows
    .map((item) => {
      const idRaw = item?.id ?? item?.user_group_id ?? item?.group_id ?? item?.UserGroup?.id;
      const nameRaw =
        item?.name ??
        item?.user_group_name ??
        item?.UserGroup?.name ??
        item?.title;
      const countRaw =
        item?.user_count ??
        item?.users_count ??
        item?.count ??
        item?.total_users ??
        item?.UserGroup?.user_count;

      const id_externo = String(idRaw ?? "").trim();
      const nombre = String(nameRaw ?? "").trim();
      if (!id_externo || !nombre) return null;

      const total_usuarios = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 0;
      const normalized = nombre.toLowerCase();
      const es_all_users =
        normalized === "all users" ||
        normalized === "alluser" ||
        normalized === "all_users";

      return { id_externo, nombre, total_usuarios, es_all_users };
    })
    .filter(Boolean) as GrupoBiostar[];

  const hasAllUsers = parsed.some((g) => g.es_all_users);
  if (!hasAllUsers) {
    parsed.unshift({
      id_externo: "all-users",
      nombre: "All Users",
      total_usuarios: 0,
      es_all_users: true,
    });
  }

  return parsed.sort((a, b) => {
    if (a.es_all_users) return -1;
    if (b.es_all_users) return 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

function extractBiostarMessage(payload: any): string {
  return (
    payload?.Response?.message ||
    payload?.message ||
    payload?.error ||
    "No se pudo completar la operacion en BioStar."
  );
}

async function getConexionGlobal() {
  const main = await DispositivosBiostar.findOne({ activo: true, es_main: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });
  if (main) return main;

  return BiostarConexion.findOne({ activo: true }).sort({
    fecha_modificacion: -1,
    fecha_creacion: -1,
    _id: -1,
  });
}

async function requestWithEndpointFallback(
  conexion: any,
  method: "POST" | "PUT" | "DELETE",
  path: string,
  data?: any
) {
  const endpoints = [`/api${path}`, `/api/v2${path}`];
  let result: { ok: boolean; data?: any; status?: number; message?: string } = { ok: false };
  for (const url of endpoints) {
    result = await biostarRequest(conexion, { method, url, data });
    if (result.ok) break;
  }
  return result;
}

export async function listarGruposBiostar(_req: Request, res: Response): Promise<void> {
  try {
    const conexion = await getConexionGlobal();
    if (!conexion) {
      res.status(200).json({
        estado: false,
        mensaje: "Primero configura la conexion global de BioStar.",
      });
      return;
    }

    const gruposRes = await biostarRequest(conexion as any, {
      method: "GET",
      url: "/api/user_groups?limit=1000",
    });

    if (!gruposRes.ok) {
      res.status(200).json({
        estado: false,
        mensaje: gruposRes.message || extractBiostarMessage(gruposRes.data),
      });
      return;
    }

    const grupos = extractGroups(gruposRes.data);
    res.status(200).json({ estado: true, datos: grupos });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function crearGrupoBiostar(req: Request, res: Response): Promise<void> {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre del grupo es obligatorio." });
      return;
    }

    const conexion = await getConexionGlobal();
    if (!conexion) {
      res.status(200).json({
        estado: false,
        mensaje: "Primero configura la conexion global de BioStar.",
      });
      return;
    }

    const payloads = [
      {
        UserGroup: {
          name: nombre,
          parent_id: { id: 1 },
          depth: 1,
        },
      },
      {
        UserGroupCollection: {
          rows: [
            {
              name: nombre,
              parent_id: { id: 1 },
              depth: 1,
            },
          ],
        },
      },
      {
        user_group: {
          name: nombre,
          parent_id: { id: 1 },
          depth: 1,
        },
      },
      { name: nombre, parent_id: { id: 1 }, depth: 1 },
    ];

    let lastError = "No se pudo crear el grupo en BioStar.";
    for (const body of payloads) {
      const createRes = await requestWithEndpointFallback(conexion as any, "POST", "/user_groups", body);

      if (createRes.ok) {
        res.status(200).json({ estado: true, mensaje: "Grupo creado correctamente." });
        return;
      }

      lastError = createRes.message || extractBiostarMessage(createRes.data);
    }

    res.status(200).json({ estado: false, mensaje: lastError });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function editarGrupoBiostar(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    const nombre = String(req.body?.nombre || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id del grupo es obligatorio." });
      return;
    }
    if (!nombre) {
      res.status(400).json({ estado: false, mensaje: "El nombre del grupo es obligatorio." });
      return;
    }

    const conexion = await getConexionGlobal();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const payloads = [
      { UserGroup: { id: Number(id), name: nombre } },
      { user_group: { id: Number(id), name: nombre } },
      { id: Number(id), name: nombre },
    ];

    let lastError = "No se pudo editar el grupo en BioStar.";
    for (const body of payloads) {
      const editRes = await requestWithEndpointFallback(conexion as any, "PUT", `/user_groups/${id}`, body);
      if (editRes.ok) {
        res.status(200).json({ estado: true, mensaje: "Grupo editado correctamente." });
        return;
      }
      lastError = editRes.message || extractBiostarMessage(editRes.data);
    }

    res.status(200).json({ estado: false, mensaje: lastError });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}

export async function eliminarGrupoBiostar(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ estado: false, mensaje: "El id del grupo es obligatorio." });
      return;
    }

    const conexion = await getConexionGlobal();
    if (!conexion) {
      res.status(200).json({ estado: false, mensaje: "Primero configura la conexion global de BioStar." });
      return;
    }

    const deleteRes = await requestWithEndpointFallback(conexion as any, "DELETE", `/user_groups/${id}`);
    if (deleteRes.ok) {
      res.status(200).json({ estado: true, mensaje: "Grupo eliminado correctamente." });
      return;
    }

    res.status(200).json({
      estado: false,
      mensaje: deleteRes.message || extractBiostarMessage(deleteRes.data) || "No se pudo eliminar el grupo.",
    });
  } catch (error: any) {
    log(`${fecha()} ERROR: ${error.name}: ${error.message}\n`);
    res.status(500).send({ estado: false, mensaje: `${error.name}: ${error.message}` });
  }
}
