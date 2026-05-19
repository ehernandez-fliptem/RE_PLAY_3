import { Fragment, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateAuth } from "../app/features/auth/authSlice";
import MenuApplication from "./MenuApplication";
import { useLocation, useNavigate } from "react-router-dom";
import { addConfig } from "../app/features/config/configSlice";
import Routes from "./Routes";
import { clienteAxios, handlingError } from "../app/config/axios";
import { enqueueSnackbar } from "notistack";
import {
  addWsConnection,
  deleteWsConnection,
} from "../app/features/ws/wsSlice";
import io from "socket.io-client";
import type { IRootState } from "../app/store";
import type { AxiosError } from "axios";
import Notificaciones from "./Notificaciones";

export default function Application() {
  const { tipos_documentos, tipos_registros, tipos_eventos, roles } =
    useSelector((state: IRootState) => state.config.data);
  const { token, rol } = useSelector((state: IRootState) => state.auth.data);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const DIRTY_KEY = "CONFIG_UNSAVED_CHANGES";

  const rolesRef = useRef<number[]>(Array.isArray(rol) ? rol : []);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    rolesRef.current = Array.isArray(rol) ? rol : [];
  }, [rol]);

  const cargarSesionYConfig = async (opts?: { force?: boolean }) => {
    const now = Date.now();
    if (!opts?.force && now - lastFetchRef.current < 5000) return;
    if (inFlightRef.current) return inFlightRef.current;

    inFlightRef.current = (async () => {
      try {
        const res = await clienteAxios.get("/api/validacion/session-config");
        if (res.data.estado) {
          const {
            configuracion,
            usuario,
            roles,
            tipos_eventos,
            tipos_registros,
            tipos_dispositivos,
            tipos_documentos,
          } = res.data.datos;

          const obj_tipos_eventos = tipos_eventos
            ? tipos_eventos.reduce(
                (
                  a: object,
                  v: { tipo: number; nombre: string; color: string }
                ) => ({
                  ...a,
                  [v.tipo]: { nombre: v.nombre, color: v.color },
                }),
                {}
              )
            : null;

          const obj_roles = roles
            ? roles.reduce(
                (a: object, v: { rol: number; nombre: string; color: string }) => ({
                  ...a,
                  [v.rol]: { nombre: v.nombre, color: v.color },
                }),
                {}
              )
            : null;

          const obj_tipos_registros = tipos_registros
            ? tipos_registros.reduce(
                (
                  a: object,
                  v: {
                    tipo: number;
                    nombre: string;
                    descripcion: string;
                    color: string;
                  }
                ) => ({
                  ...a,
                  [v.tipo]: {
                    nombre: v.nombre,
                    descripcion: v.descripcion,
                    color: v.color,
                  },
                }),
                {}
              )
            : null;

          const obj_tipos_dispositivos = tipos_dispositivos
            ? tipos_dispositivos.reduce(
                (
                  a: object,
                  v: { tipo: number; nombre: string; color: string }
                ) => ({
                  ...a,
                  [v.tipo]: {
                    nombre: v.nombre,
                    color: v.color,
                  },
                }),
                {}
              )
            : null;

          const obj_tipos_documentos = tipos_documentos
            ? tipos_documentos.reduce(
                (
                  a: object,
                  v: {
                    tipo: number;
                    nombre: string;
                    descripcion: string;
                    extensiones: string;
                    color: string;
                  }
                ) => ({
                  ...a,
                  [v.tipo]: {
                    nombre: v.nombre,
                    descripcion: v.descripcion,
                    extensiones: v.extensiones,
                    color: v.color,
                  },
                }),
                {}
              )
            : null;

          dispatch(
            addConfig({
              ...configuracion,
              tipos_eventos: obj_tipos_eventos,
              roles: obj_roles,
              tipos_registros: obj_tipos_registros,
              tipos_dispositivos: obj_tipos_dispositivos,
              tipos_documentos: obj_tipos_documentos,
            })
          );
          dispatch(updateAuth(usuario));
          lastFetchRef.current = Date.now();
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error as Error | AxiosError);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        inFlightRef.current = null;
      }
    })();

    return inFlightRef.current;
  };

  useEffect(() => {
    if (token) void cargarSesionYConfig({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      const isOnConfig = location.pathname.startsWith("/configuracion");
      const hasUnsaved = localStorage.getItem(DIRTY_KEY) === "true";
      if (isOnConfig && hasUnsaved) return;
      void cargarSesionYConfig();
    }, 30000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  useEffect(() => {
    if (!token) return;

    const socket = io("/", {
      auth: { token },
      transports: ["websocket"],
    });

    dispatch(addWsConnection(socket));

    socket.on("connect_error", (err) => {
      console.log(err);
      socket.connect();
    });

    socket.on("configuracion:permisos-actualizados", (payload: { roles?: number[] }) => {
      const changedRoles = Array.isArray(payload?.roles)
        ? payload.roles.map((r) => Number(r))
        : [];
      const currentRoles = Array.isArray(rolesRef.current)
        ? rolesRef.current.map((r) => Number(r))
        : [];
      const affected =
        changedRoles.length === 0 ||
        currentRoles.some((r) => changedRoles.includes(r));
      if (affected) {
        void cargarSesionYConfig({ force: true });
      }
    });

    socket.io.on("reconnect_attempt", () => {
      console.log("Reconexión intentada");
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    return () => {
      dispatch(deleteWsConnection());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Fragment>
      {!isEmpty(tipos_eventos) &&
        !isEmpty(roles) &&
        !isEmpty(tipos_registros) &&
        !isEmpty(tipos_documentos) &&
        token && (
          <MenuApplication>
            <Routes />
            <Notificaciones />
          </MenuApplication>
        )}
    </Fragment>
  );
}

function isEmpty(obj: object) {
  return Object.keys(obj).length === 0;
}
