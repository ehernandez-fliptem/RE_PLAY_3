import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import configReducer from './features/config/configSlice';
import wsReducer from './features/ws/wsSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        config: configReducer,
        ws: wsReducer
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false })
});

export type IRootState = ReturnType<typeof store.getState>;
export default store;