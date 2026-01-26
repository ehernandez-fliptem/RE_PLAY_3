import { createSlice } from "@reduxjs/toolkit";
import { clienteAxios } from "../../config/axios";

interface AuthState {
  data: {
    token: string;
    nombre: string;
    img_usuario: string;
    esRoot: boolean;
    rol: number[];
    accesos: { _id: string; nombre: string; identificador: string }[];
    empresa?: { _id: string; nombre: string; img_empresa: string };
  };
  status: "idle" | "pending" | "succeeded" | "failed";
  error: string;
}

const initialState = {
  data: {
    token: "",
    nombre: "",
    img_usuario: "",
    esRoot: false,
    rol: [],
    accesos: [],
    empresa: undefined
  },
  status: "idle",
  error: "",
} satisfies AuthState as AuthState;

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    addAuth: (state, action) => {
      const session = action.payload;
      if (session) {
        localStorage.setItem("SESSION", JSON.stringify(session));
        const acceso = localStorage.getItem("SELECTED_ACCESS");
        state.data = session;
        if (Object.entries(session).length > 0) {
          const esVisit = session.rol.includes(10);
          if (!esVisit && session?.accesos) {
            localStorage.setItem(
              "SELECTED_ACCESS",
              acceso || session?.accesos[0]._id || null
            );
            clienteAxios.defaults.headers.common["x-access-default-entrance"] =
              acceso || session?.accesos[0]._id || null;
          }
        }
        clienteAxios.defaults.headers.common["x-access-token"] = session.token;
      }
    },
    updateAuth: (state, action) => {
      const { nombre, img_usuario, rol, esRoot, accesos, empresa } = action.payload;
      const session = JSON.parse(localStorage.getItem("SESSION") || "{}");
      const acceso = localStorage.getItem("SELECTED_ACCESS");
      session.nombre = nombre;
      session.img_usuario = img_usuario;
      session.rol = rol;
      session.esRoot = !!esRoot;
      session.accesos = accesos;
      session.empresa = empresa;

      state.data.nombre = nombre;
      state.data.img_usuario = img_usuario;
      state.data.rol = rol;
      state.data.esRoot = !!esRoot;
      state.data.accesos = accesos;
      state.data.empresa = empresa;
      localStorage.setItem("SESSION", JSON.stringify(session));
      const esVisit = session.rol.includes(10);
      if (!esVisit && accesos) {
        localStorage.setItem("SELECTED_ACCESS", acceso || accesos[0]._id);
        clienteAxios.defaults.headers.common["x-access-default-entrance"] =
          acceso || session?.accesos[0]._id || null;
      }
    },
    deleteAuth: (state) => {
      localStorage.removeItem("SESSION");
      localStorage.removeItem("PAGE_INDEX");
      localStorage.removeItem("SELECTED_ACCESS");
      state.data = initialState.data;
      state.status = "idle";
      state.error = "";
    },
  },
});

export const { addAuth, deleteAuth, updateAuth } = authSlice.actions;

export const selectCurrentData = (state: AuthState) => state.data;
export const selectCurrentStatus = (state: AuthState) => state.status;
export const selectCurrentError = (state: AuthState) => state.error;

export default authSlice.reducer;
