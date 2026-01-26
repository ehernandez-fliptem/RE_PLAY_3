import { Fragment, useMemo, useState } from "react";
import {
  Assignment,
  ChevronLeft,
  ColorLens,
  LightMode,
  Preview,
  Refresh,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  createTheme,
  darken,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  styled,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Controller, useFormContext } from "react-hook-form-mui";
import type { ColorPalette } from "../../../../types/theme";
import { defaultColorPalette } from "../../../../themes/defaultTheme";
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from "@mui/material/AppBar";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../../app/store";
import useNetworkStatus from "../../../NetworkStatus";
import Copyright from "../../../utils/Copyright";
import { REGEX_HEX } from "../../../../app/constants/CommonRegex";

const appBarHeight = 64;

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme }) => ({
  height: appBarHeight,
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.primary.main,
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

const COLOR_FIELDS: Array<{
  key: keyof ColorPalette;
  label: string;
  description: string;
}> = [
  {
    key: "primary",
    label: "Primario",
    description: "Color principal de la aplicación",
  },
  {
    key: "secondary",
    label: "Secundario",
    description: "Color que asentua y/o contrasta el color primario",
  },
  { key: "error", label: "Error", description: "Estados de error" },
  {
    key: "warning",
    label: "Advertencia",
    description: "Estados de advertencia",
  },
  { key: "info", label: "Informativo", description: "Estados informativos" },
  {
    key: "success",
    label: "Éxito",
    description: "Estados afirmativos o de éxito",
  },
];

export default function ColorPalette() {
  const { rol, nombre, img_usuario, empresa } = useSelector(
    (state: IRootState) => state.auth.data
  );
  const { roles } = useSelector((state: IRootState) => state.config.data);
  const theme = useTheme();
  const { control, setValue, getValues, trigger } = useFormContext();
  const mainPalette = getValues("palette");
  const [colors, setColors] = useState<ColorPalette>(
    mainPalette || defaultColorPalette
  );
  const { isOnline, NetworkBadge } = useNetworkStatus();

  const handleColorChange = (colorKey: keyof ColorPalette, value: string) => {
    if (REGEX_HEX.test(value)) {
      setColors((prev) => ({
        ...prev,
        [colorKey]: {
          main: value,
        },
      }));
    }
    setValue(`palette.${colorKey}.main`, value);
  };

  const handleReset = () => {
    setValue("palette", defaultColorPalette);
    setColors(defaultColorPalette);
  };

  const newTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme.palette.mode,
          ...colors,
        },
        components: {
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
          },
        },
      }),
    [colors, theme]
  );

  return (
    <Fragment>
      <Stack direction="row" display="flex" alignItems="flex" sx={{ mb: 2 }}>
        <Typography
          variant="overline"
          component="h2"
          display="flex"
          alignItems="center"
        >
          <ColorLens color="primary" sx={{ mr: 1 }} />{" "}
          <strong>Apariencia</strong>
        </Typography>
        <Tooltip title="Restablecer valores predeterminados">
          <IconButton color="primary" onClick={handleReset} size="small">
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Grid container spacing={2}>
        {COLOR_FIELDS.map(({ key, description, label }) => (
          <Grid key={key} size={{ xs: 12, md: 6, xl: 4 }}>
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Controller
                    name={`palette.${key}.main`}
                    control={control}
                    render={({ field: { value } }) => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: value,
                          border: "2px solid",
                          borderColor: "divider",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  />
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight="600">
                      {label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {description}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Controller
                        control={control}
                        name={`palette.${key}.main`}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            type="text"
                            required
                            fullWidth
                            onChange={(event) => {
                              handleColorChange(
                                key as keyof ColorPalette,
                                event.target.value
                              );
                              trigger(`palette.${key}.main`);
                            }}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`palette.${key}.main`}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="color"
                            required
                            fullWidth
                            onChange={(event) => {
                              handleColorChange(
                                key as keyof ColorPalette,
                                event.target.value
                              );
                              trigger(`palette.${key}.main`);
                            }}
                          />
                        )}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Typography
          variant="overline"
          component="h2"
          display="flex"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Preview color="primary" sx={{ mr: 1 }} />{" "}
          <strong>Preview del nuevo tema</strong>
        </Typography>
        <ThemeProvider theme={newTheme}>
          <Grid container spacing={2} size={12}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper variant="outlined" sx={{ height: "100%", p: 2 }}>
                <Typography variant="subtitle2" mb={2} fontWeight="600">
                  Menú
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "94%",
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark"
                        ? darken(theme.palette.primary.main, 0.8)
                        : darken(theme.palette.primary.main, 0.6),
                    color: "primary.contrastText",
                    flexShrink: 0,
                  }}
                >
                  <DrawerHeader sx={{ justifyContent: "space-between" }}>
                    <IconButton
                      sx={{
                        color: "primary.main",
                      }}
                    >
                      <LightMode />
                    </IconButton>
                    <IconButton
                      sx={{
                        color: "primary.contrastText",
                      }}
                    >
                      <ChevronLeft />
                    </IconButton>
                  </DrawerHeader>
                  <Divider />
                  <List
                    sx={{
                      maxHeight: 150,
                    }}
                  >
                    <ListItem sx={{ height: "100%" }}>
                      <ListItemIcon>
                        <NetworkBadge
                          overlap="circular"
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                          }}
                          variant="dot"
                        >
                          <Avatar
                            variant="circular"
                            sx={{
                              bgcolor: "primary.main",
                              color: "primary.contrastText",
                              width: theme.spacing(5),
                              height: theme.spacing(5),
                            }}
                          >
                            <Typography variant="subtitle2">
                              {nombre?.charAt(0)}
                            </Typography>
                          </Avatar>
                        </NetworkBadge>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack spacing={0}>
                            <Typography variant="caption" component="h6">
                              {nombre
                                .split(" ")
                                .map((n, i) => (i === 0 ? n : n[0]))
                                .join("")}
                            </Typography>
                            {rol.map((item) => (
                              <Typography
                                key={item}
                                variant="caption"
                                component="small"
                                color="gray"
                              >
                                {roles[item]?.nombre}
                              </Typography>
                            ))}
                          </Stack>
                        }
                        secondary={<Fragment>{isOnline}</Fragment>}
                      />
                    </ListItem>
                  </List>
                  <List
                    sx={{
                      height: "100%",
                      overflow: "auto",
                    }}
                  >
                    <ListItem disablePadding disableGutters>
                      <ListItemButton>
                        <ListItemIcon
                          sx={{
                            color: "primary.contrastText",
                          }}
                        >
                          <Assignment />
                        </ListItemIcon>
                        <ListItemText
                          sx={{
                            color: "primary.contrastText",
                          }}
                          primary={
                            <Typography variant="subtitle2" component="h6">
                              Ítem menú
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding disableGutters>
                      <ListItemButton selected>
                        <ListItemIcon
                          sx={{
                            color: "primary.contrastText",
                          }}
                        >
                          <Assignment />
                        </ListItemIcon>
                        <ListItemText
                          sx={{
                            color: "primary.contrastText",
                          }}
                          primary={
                            <Typography variant="subtitle2" component="h6">
                              Ítem menú
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  </List>
                  <Divider />
                  <Copyright
                    sx={{
                      my: 2,
                      color: "primary.contrastText",
                    }}
                  />
                </Paper>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" mb={2} fontWeight="600">
                    Barra general
                  </Typography>
                  <AppBar position="relative" open={false}>
                    <Toolbar>
                      <Box
                        component="div"
                        position="absolute"
                        display={{ xs: "none", md: "flex" }}
                        sx={{
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {empresa?.img_empresa && (
                          <Box
                            component="img"
                            src={empresa?.img_empresa}
                            height={appBarHeight - 25}
                            sx={{
                              filter:
                                "drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.3))",
                            }}
                          />
                        )}
                        {empresa?.nombre && (
                          <Typography
                            variant="overline"
                            component="h6"
                            align="center"
                            fontWeight={700}
                            fontSize={14}
                            sx={{
                              ml: 1,
                              textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2);",
                            }}
                          >
                            {empresa?.nombre}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          flexGrow: 1,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      ></Box>
                      <Box component="div">
                        <IconButton
                          size="large"
                          aria-label="account of current user"
                          aria-controls="menu-appbar"
                          aria-haspopup="true"
                          color="inherit"
                          sx={{ p: 0 }}
                        >
                          <Avatar alt={nombre} src={img_usuario} />
                        </IconButton>
                      </Box>
                    </Toolbar>
                  </AppBar>
                </Paper>
                {/* Color Chips */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" mb={2} fontWeight="600">
                    Paleta de colores
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip label="Primary" color="primary" />
                    <Chip label="Secondary" color="secondary" />
                    <Chip label="Error" color="error" />
                    <Chip label="Warning" color="warning" />
                    <Chip label="Info" color="info" />
                    <Chip label="Success" color="success" />
                    <Chip label="Default" />
                  </Stack>
                </Paper>

                {/* Buttons */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" mb={2} fontWeight="600">
                    Botones
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button variant="contained" color="primary">
                      Primario
                    </Button>
                    <Button variant="contained" color="secondary">
                      Secundario
                    </Button>
                  </Stack>
                </Paper>

                {/* Alerts */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" mb={2} fontWeight="600">
                    Estatus
                  </Typography>
                  <Stack spacing={1.5}>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "success.dark"
                            : "success.main",
                        color: "success.contrastText",
                      }}
                    >
                      <Typography variant="body2" fontWeight="500">
                        Success: Mensajes exitosos
                      </Typography>
                    </Paper>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "info.dark"
                            : "info.main",
                        color: "info.contrastText",
                      }}
                    >
                      <Typography variant="body2" fontWeight="500">
                        Info: Mensajes informativos
                      </Typography>
                    </Paper>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "warning.dark"
                            : "warning.main",
                        color: "warning.contrastText",
                      }}
                    >
                      <Typography variant="body2" fontWeight="500">
                        Warning: Mensajes de advertencia
                      </Typography>
                    </Paper>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "error.dark"
                            : "error.main",
                        color: "error.contrastText",
                      }}
                    >
                      <Typography variant="body2" fontWeight="500">
                        Error: Mensajes de error
                      </Typography>
                    </Paper>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </ThemeProvider>
      </Grid>
    </Fragment>
  );
}
