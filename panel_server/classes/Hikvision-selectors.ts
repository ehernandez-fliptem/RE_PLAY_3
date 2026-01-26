export const PANEL_SELECTORS: Record<string, {
    url: (ip: string) => string;
    username: string;
    password: string;
    button: string;
    wait: string;
}> = {
    // Panel viejo
    default: {
        url: (ip) => `http://${ip}/#/login`,
        username: "#username",
        password: "#password",
        button: "button.login-btn",
        wait: "button.login-btn"
    },

    // Panel nuevo
    DS_K1T342EFWX_E1: {
        url: (ip) => `https://${ip}/doc/index.html#/portal/login`,
        username: 'input[placeholder="Nombre de usuario"]',
        password: 'input[placeholder="Contraseña"]',
        button: 'button.el-button--primary.el-button--large',
        wait: 'button.el-button--primary.el-button--large'
    }
};

// Diccionario rápido basado en IP
export const PANEL_BY_IP: Record<string, string> = {
    "172.18.0.31": "DS_K1T342EFWX_E1",
    "192.168.1.60": "DS_K1T342EFWX_E1",
    "192.168.1.127": "DS_K1T342EFWX_E1",
    "192.168.1.128": "DS_K1T342EFWX_E1",
    // Agrega aquí las IP de los paneles nuevos
};
