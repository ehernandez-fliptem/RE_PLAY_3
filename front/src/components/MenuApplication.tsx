import React, { useState, useEffect, Fragment } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { darken, styled, useTheme } from "@mui/material/styles";
import {
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Logout,
  AccountCircle,
} from "@mui/icons-material";

import {
  Box,
  Drawer,
  Toolbar,
  List,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Collapse,
  Menu,
  MenuItem,
  Divider,
  CssBaseline,
  Stack,
  useMediaQuery,
} from "@mui/material";
import MuiAppBar, {
  type AppBarProps as MuiAppBarProps,
} from "@mui/material/AppBar";
import mainMenu from "../app/menus/mainMenu";
import Copyright from "./utils/Copyright";
import ThemeButton from "../themes/ThemeButton";
import type { IRootState } from "../app/store";
import useNetworkStatus from "./NetworkStatus";
import KioscoPanel from "./utils/KioscoPanel";
import { getRoleLabel } from "../app/utils/roleLabels";
// import Access from "./utils/Access"; // FLAG: Selector de acceso oculto temporalmente - No borrar

const drawerWidth = 200;
const appBarHeight = 64;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  height: "auto",
  minHeight: "100dvh",
  width: `calc(${drawerWidth}px - 100%)`,
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  backgroundColor: theme.palette.mode === "light" ? "#E6E6E6" : "transparent",
  variants: [
    {
      props: ({ open }) => open,
      style: {
        transition: theme.transitions.create("margin", {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
      },
    },
  ],
}));

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
  variants: [
    {
      props: ({ open }) => open,
      style: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(["margin", "width"], {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

type MenuProps = {
  children?: React.ReactNode;
};

export default function MenuApplication({ children }: MenuProps) {
  const pageIndex = localStorage.getItem("PAGE_INDEX");
  const { habilitarIntegracionHv, habilitarCamaras, habilitarContratistas, roles } =
    useSelector(
    (state: IRootState) => state.config.data
  );
  const { rol, nombre, img_usuario, empresa } = useSelector(
    (state: IRootState) => state.auth.data
  );
  const esAnfitrion = rol.includes(4);
  const esRecep = rol.includes(5);
  const esVisit = rol.includes(10);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isKioscoRoute = location.pathname.startsWith("/kiosco");
  const isMobileSize = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(
    pageIndex ? Number(pageIndex) : 0
  );
  const [openItemList, setOpenItemList] = useState(
    selectedIndex > 100
      ? { [Math.trunc(selectedIndex)]: true }
      : { [Math.trunc(selectedIndex)]: false }
  );
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { isOnline, NetworkBadge } = useNetworkStatus();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (location) {
      const { pathname } = location;
      const path = pathname.split("/")[1];
      if (path === "perfil") {
        setSelectedIndex(0.1);
        return;
      }
      // FLAG: Bitácora oculta temporalmente - No borrar
      // if (!path) navigate("/bitacora");
      if (!path) {
        if (esAnfitrion) {
          navigate("/visitantes");
        } else if (esRecep) {
          navigate("/eventos");
        } else {
          navigate("/eventos");
        }
      }
      let matched = false;
      for (const menu of mainMenu) {
        if (menu.submenu) {
          const foundSubMenu = menu.submenu.find(
            (subM) => pathname.startsWith(subM.path)
          );
          if (foundSubMenu) {
            setOpenItemList({ [Math.trunc(foundSubMenu.id)]: true });
            setSelectedIndex(foundSubMenu.id);
            matched = true;
            break;
          }
        } else if (pathname.startsWith(menu.path)) {
          setSelectedIndex(menu.id);
          matched = true;
          break;
        }
      }
      if (!matched && pathname === "/") {
        setSelectedIndex(0);
      }

      const currentPageIndex = localStorage.getItem("PAGE_INDEX");
      if (currentPageIndex !== String(selectedIndex)) {
        if (isMobileSize) setOpen(false);
        localStorage.setItem("PAGE_INDEX", String(selectedIndex));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isMobileSize]);

  const handleListItemClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClick = (id: number) => {
    setOpenItemList((prevState) => ({ ...prevState, [id]: !prevState[id] }));
  };

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleMenu = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[
              {
                color: "primary.contrastText",
              },
              open && { display: "none" },
            ]}
          >
            <MenuIcon />
          </IconButton>
          {!esVisit && (
            <Box
              component="div"
              position="absolute"
              display={{ xs: "none", md: "flex" }}
              sx={{
                left: open ? 20 : 60,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {empresa?.img_empresa && (
                <Box
                  component="img"
                  src={empresa?.img_empresa}
                  height={appBarHeight - 25}
                  sx={{ filter: "drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.3))" }}
                />
              )}
              {empresa?.nombre && (
                <Typography
                  variant="overline"
                  component="h6"
                  align="center"
                  fontWeight={700}
                  fontSize={14}
                  sx={{ ml: 1, textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2);" }}
                >
                  {empresa?.nombre}
                </Typography>
              )}
            </Box>
          )}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isKioscoRoute && <KioscoPanel />}
            {/* FLAG: Selector de acceso oculto temporalmente - No borrar */}
            {/* {esRecep && <Access />} */}
          </Box>
          <Box component="div">
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{ p: 0 }}
            >
              <Avatar alt={nombre} src={img_usuario} />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={() => navigate("/perfil")}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Perfil</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => navigate("/logout")}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Cerrar sesión</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        slotProps={{
          paper: {
            sx: {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark"
                  ? darken(theme.palette.primary.main, 0.8)
                  : darken(theme.palette.primary.main, 0.6),
              color: "primary.contrastText",
            },
          },
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            [theme.breakpoints.down("sm")]: {
              width: "100%",
            },
            boxSizing: "border-box",
            border: "none",
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader sx={{ justifyContent: "space-between" }}>
          <ThemeButton mode={theme.palette.mode} />
          <IconButton
            onClick={handleDrawerClose}
            sx={{
              color: "primary.contrastText",
            }}
          >
            {theme.direction === "ltr" ? <ChevronLeft /> : <ChevronRight />}
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
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
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
                      {getRoleLabel(item, roles[item]?.nombre)}
                    </Typography>
                  ))}
                </Stack>
              }
              secondary={<Fragment>{isOnline}</Fragment>}
            />
          </ListItem>
        </List>
        <List
          //   component="nav"
          sx={{
            height: "100%",
            overflow: "auto",
          }}
        >
          {mainMenu.map((item) => {
            let seeItem = obtenerDuplicados(rol, item.rol);
            if (item.id === 100) seeItem = rol.includes(1);
            if (item.id === 99)
              seeItem =
                rol.includes(1) &&
                (habilitarIntegracionHv || habilitarCamaras);
            if (item.id === 8 || item.id === 9) {
              seeItem = seeItem && habilitarContratistas;
            }
            return !item.submenu && seeItem ? (
              <RouterLink
                key={item.id}
                to={item.path}
                style={{ textDecoration: "none" }}
              >
                <ListItem disablePadding disableGutters>
                  <ListItemButton
                    selected={!item.submenu && selectedIndex === item.id}
                    onClick={() => handleListItemClick(item.id)}
                  >
                    <ListItemIcon
                      sx={{
                        color: "primary.contrastText",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      sx={{
                        color: "primary.contrastText",
                      }}
                      primary={
                        <Typography variant="subtitle2" component="h6">
                          {item.title}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </RouterLink>
            ) : (
              <Fragment key={item.id}>
                {seeItem && (
                  <Fragment>
                    <ListItem disablePadding disableGutters>
                      <ListItemButton
                        key={item.id}
                        selected={false}
                        onClick={() => handleClick(item.id)}
                      >
                        <ListItemIcon
                          sx={{
                            color: "primary.contrastText",
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          sx={{
                            color: "primary.contrastText",
                          }}
                          primary={
                            <Typography variant="subtitle2" component="h6">
                              {item.title}
                            </Typography>
                          }
                        />
                        {openItemList[item.id] ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        )}
                      </ListItemButton>
                    </ListItem>
                    {item.submenu?.map((subItem) => {
                      const activeSubId = item.submenu
                        ? item.submenu.reduce((acc, sub) => {
                            const isMatch =
                              location.pathname === sub.path ||
                              location.pathname.startsWith(`${sub.path}/`);
                            if (!isMatch) return acc;
                            if (!acc) return sub;
                            return sub.path.length > acc.path.length ? sub : acc;
                          }, null as null | { id: number; path: string })
                        : null;
                      let seeSubItem = obtenerDuplicados(rol, subItem.rol);
                      if (subItem.id === 99.1 && rol.includes(1))
                        seeSubItem = habilitarIntegracionHv;
                      if (subItem.id === 99.2 && rol.includes(1))
                        seeSubItem = habilitarCamaras;
                      if (subItem.id === 8.1 || subItem.id === 8.2 || subItem.id === 9.1 || subItem.id === 9.2) {
                        seeSubItem = seeSubItem && habilitarContratistas;
                      }
                      if (rol.includes(1) && subItem.rol.includes(0))
                        seeSubItem = true;
                      return (
                        <Fragment key={subItem.id}>
                          {seeSubItem && (
                            <Collapse
                              in={openItemList[item.id]}
                              timeout="auto"
                              unmountOnExit
                            >
                              <List component="nav" disablePadding>
                                <RouterLink
                                  to={subItem.path}
                                  style={{ textDecoration: "none" }}
                                >
                                  <ListItem disablePadding disableGutters>
                                    <ListItemButton
                                      sx={{ pl: 3 }}
                                      selected={activeSubId?.id === subItem.id}
                                      onClick={() =>
                                        handleListItemClick(subItem.id)
                                      }
                                    >
                                      <ListItemIcon
                                        sx={{
                                          color: "primary.contrastText",
                                        }}
                                      >
                                        {subItem.icon}
                                      </ListItemIcon>
                                      <ListItemText
                                        sx={{
                                          color: "primary.contrastText",
                                        }}
                                        primary={
                                          <Typography
                                            variant="subtitle2"
                                            component="h6"
                                          >
                                            {subItem.title}
                                          </Typography>
                                        }
                                      />
                                    </ListItemButton>
                                  </ListItem>
                                </RouterLink>
                              </List>
                            </Collapse>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                )}
              </Fragment>
            );
          })}
        </List>
        <Divider />
        <Copyright sx={{ my: 2, color: "primary.contrastText" }} />
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
}

function obtenerDuplicados(array1: number[], array2: number[]): boolean {
  const set1 = new Set(array1);
  const set2 = new Set(array2);
  const duplicados = [...set1].filter((x) => set2.has(x));
  return duplicados.length > 0;
}


