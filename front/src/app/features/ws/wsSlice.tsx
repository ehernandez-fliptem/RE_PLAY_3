import { createSlice } from "@reduxjs/toolkit";
import { Socket } from "socket.io-client";

interface WsState {
  data: Socket | null;
  status: string;
  error: string;
}

const initialState = {
  data: null,
  status: "idle",
  error: "",
} satisfies WsState as WsState;

export const wsSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    addWsConnection: (state, action) => {
      const session = action.payload;
      if (session) {
        state.data = session;
      }
    },
    deleteWsConnection: (state) => {
      if (state.data) {
        state.data.disconnect();
      }
      state.data = null;
    },
  },
});

export const { addWsConnection, deleteWsConnection } = wsSlice.actions;

export const selectCurrentData = (state: WsState) => state.data;
export const selectCurrentStatus = (state: WsState) => state.status;
export const selectCurrentError = (state: WsState) => state.error;

export default wsSlice.reducer;
