import { createSlice } from "@reduxjs/toolkit";
import type { ColorPalette } from "../../../types/theme";
import { defaultColorPalette } from "../../../themes/defaultTheme";

interface ConfigState {
  data: {
    appNombre: string;
    img_empresa: string;
    zonaHoraria: string;
    imgCorreo: string;
    saludaCorreo: string;
    despedidaCorreo: string;
    tiempoFotoVisita: number;
    delayProximaFoto: number;
    tiempoCancelacionRegistros: string;
    tiempoToleranciaEntrada: string;
    tiempoToleranciaSalida: string;
    habilitarIntegracionHv: boolean;
    habilitarIntegracionCdvi: boolean;
    habilitarCamaras: boolean;
    tipos_dispositivos: { [key: number]: { nombre: string; color: string } };
    tipos_eventos: { [key: number]: { nombre: string; color: string } };
    roles: { [key: number]: { nombre: string; color: string } };
    tipos_registros: {
      [key: number]: { nombre: string; descripcion: string; color: string };
    };
    tipos_documentos: {
      [key: number]: {
        nombre: string;
        descripcion: string;
        extensiones: string[];
        color: string;
      };
    };
    palette: ColorPalette;
  };
  status: "idle" | "pending" | "succeeded" | "failed";
  error: string;
}

const initialState = {
  data: {
    appNombre: "",
    img_empresa: "",
    zonaHoraria: "",
    imgCorreo: "",
    saludaCorreo: "",
    despedidaCorreo: "",
    tiempoFotoVisita: 0,
    delayProximaFoto: 0,
    tiempoCancelacionRegistros: "",
    tiempoToleranciaEntrada: "",
    tiempoToleranciaSalida: "",
    habilitarIntegracionHv: false,
    habilitarIntegracionCdvi: false,
    habilitarCamaras: false,
    tipos_dispositivos: {} as {
      [key: number]: { nombre: string; color: string };
    },
    tipos_eventos: {} as { [key: number]: { nombre: string; color: string } },
    roles: {} as { [key: number]: { nombre: string; color: string } },
    tipos_registros: {} as {
      [key: number]: { nombre: string; descripcion: string; color: string };
    },
    tipos_documentos: {} as {
      [key: number]: {
        nombre: string;
        descripcion: string;
        extensiones: string[];
        color: string;
      };
    },
    palette: defaultColorPalette,
  },
  status: "idle",
  error: "",
} satisfies ConfigState as ConfigState;

export const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    addConfig: (state, action) => {
      state.data = action.payload;
      document.title = state.data.appNombre || "Flipbot";
    },
    updateConfig: (state, action) => {
      state.data = {
        ...action.payload,
        tipos_dispositivos: action.payload.tipos_dispositivos || state.data.tipos_dispositivos,
        tipos_eventos: action.payload.tipos_eventos || state.data.tipos_eventos,
        roles: action.payload.roles || state.data.roles,
        tipos_registros: action.payload.tipos_registros || state.data.tipos_registros,
        tipos_documentos: action.payload.tipos_documentos || state.data.tipos_documentos,
      };
    },
    updateColorPalette: (state, action) => {
      state.data.palette = action.payload;
    },
    deleteConfig: (state) => {
      state.data = initialState.data;
      state.status = "idle";
      state.error = "";
    },
  },
});

export const { addConfig, updateConfig, updateColorPalette, deleteConfig } =
  configSlice.actions;

export const selectCurrentData = (state: ConfigState) => state.data;
export const selectCurrentStatus = (state: ConfigState) => state.status;
export const selectCurrentError = (state: ConfigState) => state.error;

export default configSlice.reducer;
