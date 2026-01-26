import { createTheme } from "@mui/material/styles";
import { esES } from '@mui/material/locale';
import { defaultColorPalette } from "./defaultTheme";
import type { ColorPalette } from "../types/theme";

export const globalTheme = (mode: "light" | "dark", paletteParam?: ColorPalette) => {
    const mainPalette = paletteParam?.primary.main ? paletteParam : defaultColorPalette;
    return createTheme({
        palette: {
            mode,
            ...mainPalette
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: (theme) => ({
                    "*::-webkit-scrollbar": {
                        width: 5,
                        height: 5,
                    },
                    "*::-webkit-scrollbar-track": {
                        WebkitBoxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
                    },
                    "*::-webkit-scrollbar-thumb": {
                        WebkitBoxShadow: `inset 0 0 50rem ${theme.palette.primary.main}`,
                    },
                }),
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        fontSize: 11
                    }
                }
            },
            MuiTextField: {
                defaultProps: {
                    autoComplete: "one-time-code",
                    size: "small",
                },
            },
            MuiContainer: {
                styleOverrides: {
                    root: {
                        backgroundColor: "transparent",
                    },
                },
            },
            MuiModal: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        top: 0,
                        margin: "auto",
                        width: "100%",
                        paddingLeft: 20,
                        paddingRight: 20,
                        [theme.breakpoints.up("md")]: {
                            paddingLeft: 150,
                            paddingRight: 150,
                        },
                        paddingTop: 20,
                        paddingBottom: 20,
                        outline: "none",
                    }),
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        ":hover": {
                            backgroundColor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText,

                            ".MuiListItemIcon-root": {
                                color: theme.palette.primary.contrastText,
                            },
                        },
                        "&.Mui-selected": {
                            "&:hover": {
                                backgroundColor: theme.palette.primary.light,
                            },
                            backgroundColor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText,

                            ".MuiListItemIcon-root": {
                                color: theme.palette.primary.contrastText,
                            },
                        },
                        borderRadius: theme.spacing(0.8),
                        marginLeft: theme.spacing(0.5),
                        marginRight: theme.spacing(0.5),
                        marginTop: theme.spacing(0.5),
                        marginBottom: theme.spacing(0.5),
                        paddingLeft: theme.spacing(1),
                        paddingRight: theme.spacing(1),
                        paddingTop: theme.spacing(0.2),
                        paddingBottom: theme.spacing(0.2),
                    }),
                },
            }
        },
    }, esES)
}