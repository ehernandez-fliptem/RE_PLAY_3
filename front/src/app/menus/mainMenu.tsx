import {
  // AccessTime, // FLAG: Reporte de horas oculto temporalmente - No borrar
  Devices,
  VideoLabel,
  // Apps, // FLAG: Checador oculto temporalmente - No borrar
  // Assignment, // FLAG: Bitácora oculta temporalmente - No borrar
  Business,
  Security,
  Contacts,
  // DynamicFeed, // FLAG: Pases oculto temporalmente - No borrar
  // DynamicFeed, // FLAG: Pases oculto temporalmente - No borrar
  AccountTree,
  EventNote,
  //ExitToApp,
  Folder,
  // HowToReg, // FLAG: Recepción oculta temporalmente - No borrar
  Badge,
  Group,
  PeopleAlt,
  // PieChart, // FLAG: Reportes oculto temporalmente - No borrar
  Settings,
  // Help, // FLAG: Ayuda oculta temporalmente - No borrar
  // Quiz, // FLAG: Ayuda oculta temporalmente - No borrar
  LibraryBooks,
  LibraryAddCheck,
  AutoStories,
  // Duo, // FLAG: Ayuda oculta temporalmente - No borrar
  AssignmentInd,
  MeetingRoom,
  Margin,
  // WebStories, // FLAG: Kiosco oculto temporalmente - No borrar
  VideoCameraFront,
} from "@mui/icons-material";

const mainMenu = [
  // FLAG: Bitácora oculta temporalmente - No borrar
  // {
  //   id: 0,
  //   title: "Bitácora",
  //   rol: [1, 2, 4, 5, 6, 7, 10],
  //   icon: <Assignment fontSize="small" />,
  //   path: "/bitacora",
  // },
  {
    id: 0.5,
    title: "Usuarios",
    rol: [1],
    icon: <PeopleAlt fontSize="small" />,
    path: "/usuarios",
  },
  {
    id: 0.6,
    title: "Empleados",
    rol: [1],
    icon: <Badge fontSize="small" />,
    path: "/empleados",
  },
  // --- Catálogos movido abajo de Directorio ---
  // FLAG: Recepción oculto temporalmente - Lo que interesa ya está afuera
  /*
  {
    id: 2,
    title: "Recepción",
    rol: [1, 2, 4, 5, 6, 7],
    icon: <HowToReg fontSize="small" />,
    submenu: [
      {
        id: 2.1,
        title: "Visitantes",
        rol: [1, 2],
        icon: <PeopleAlt fontSize="small" />,
        path: "/visitantes",
      },
      {
        id: 2.3,
        title: "Directorio",
        rol: [1, 2, 4, 5, 6, 7],
        icon: <Contacts fontSize="small" />,
        path: "/directorio",
      },
      {
        id: 2.4,
        title: "Reportes",
        rol: [1, 2, 5],
        icon: <PieChart fontSize="small" />,
        path: "/reportes",
      },
    ],
  },
  */
  {
    id: 0.7,
    title: "Visitantes",
    rol: [1, 2],
    icon: <Group fontSize="small" />,
    path: "/visitantes",
  },
  {
    id: 0.8,
    title: "Directorio",
    rol: [1, 2, 4, 5, 6, 7],
    icon: <Contacts fontSize="small" />,
    path: "/directorio",
  },
  {
    id: 0.9,
    title: "Eventos",
    rol: [1, 2, 5, 6],
    icon: <EventNote fontSize="small" />,
    path: "/eventos",
  },
  {
    id: 1,
    title: "Catálogos",
    rol: [1],
    icon: <Folder fontSize="small" />,
    submenu: [
      {
        id: 1.1,
        title: "Pisos",
        rol: [0],
        icon: <AccountTree fontSize="small" />,
        path: "/pisos",
      },
      {
        id: 1.2,
        title: "Accesos",
        rol: [0],
        icon: <Security fontSize="small" />,
        path: "/accesos",
      },
      {
        id: 1.3,
        title: "Puestos",
        rol: [0],
        icon: <AssignmentInd fontSize="small" />,
        path: "/puestos",
      },
      {
        id: 1.4,
        title: "Departamentos",
        rol: [0],
        icon: <MeetingRoom fontSize="small" />,
        path: "/departamentos",
      },
      {
        id: 1.5,
        title: "Cubiculos",
        rol: [0],
        icon: <Margin fontSize="small" />,
        path: "/cubiculos",
      },
      {
        id: 1.6,
        title: "Empresas",
        rol: [1],
        icon: <Business fontSize="small" />,
        path: "/empresas",
      },
      // FLAG: Pases oculto temporalmente - No borrar
      // {
      //   id: 1.8,
      //   title: "Pases",
      //   rol: [1, 2],
      //   icon: <DynamicFeed fontSize="small" />,
      //   path: "/pases",
      // },
    ],
  },
  {
    id: 3,
    title: "Documentos",
    rol: [7, 10],
    icon: <LibraryBooks fontSize="small" />,
    submenu: [
      {
        id: 3.1,
        title: "Validación",
        rol: [7],
        icon: <LibraryAddCheck fontSize="small" />,
        path: "/validacion-documentos",
      },
      {
        id: 3.2,
        title: "Documentos",
        rol: [10],
        icon: <AutoStories fontSize="small" />,
        path: "/documentos",
      },
    ],
  },
  // FLAG: Checador oculto temporalmente - Se sacó Eventos
  /*
  {
    id: 4,
    title: "Checador",
    rol: [1, 2, 4, 5, 6],
    icon: <Apps fontSize="small" />,
    submenu: [
      {
        id: 4.1,
        title: "Eventos",
        rol: [1, 2, 5, 6],
        icon: <EventNote fontSize="small" />,
        path: "/eventos",
      },
      {
        id: 4.2,
        title: "Reporte de Horas",
        rol: [1, 2, 6],
        icon: <AccessTime fontSize="small" />,
        path: "/reporte-horas",
      },
      // FLAG: Check oculto temporalmente - No borrar
      // {
      //   id: 4.3,
      //   title: "Check",
      //   rol: [1, 2, 4, 5, 6],
      //   icon: <ExitToApp fontSize="small" />,
      //   path: "/check",
      // },
      // {
      //   id: 4.4,
      //   title: "Bot",
      //   rol: [1, 2, 4, 5, 6, 7, 8],
      //   icon: <SmartToy fontSize="small" />,
      //   path: "/bot",
      // },
    ],
  },
  */
  // FLAG: Kiosco oculto temporalmente - No borrar
  // {
  //   id: 5,
  //   title: "Kiosco",
  //   rol: [1, 2],
  //   icon: <WebStories fontSize="small" />,
  //   path: "/kiosco",
  // },
  // FLAG: Ayuda oculto temporalmente
  /*
  {
    id: 6,
    title: "Ayuda",
    rol: [1, 2, 4, 5, 6, 7, 10],
    icon: <Quiz fontSize="small" />,
    submenu: [
      {
        id: 6.1,
        title: "Manual de usuario",
        rol: [1, 2, 4, 5, 6, 7],
        icon: <Help fontSize="small" />,
        path: "/manual-usuario",
      },
      {
        id: 6.2,
        title: "Videotutoriales",
        rol: [1, 2, 4, 5, 6, 7, 10],
        icon: <Duo fontSize="small" />,
        path: "/videotutoriales",
      },
    ],
  },
  */
  {
    id: 99,
    title: "Dispositivos",
    rol: [1],
    icon: <Devices fontSize="small" />,
    path: "/dispositivos",
    submenu: [
      {
        id: 99.1,
        title: "Hikvision",
        rol: [1],
        icon: <VideoLabel fontSize="small" />,
        path: "/dispositivos-hikvision",
      },
      {
        id: 99.2,
        title: "Cámaras",
        rol: [1],
        icon: <VideoCameraFront fontSize="small" />,
        path: "/camaras",
      },
    ],
  },

  {
    id: 100,
    title: "Configuración",
    rol: [0],
    icon: <Settings fontSize="small" />,
    path: "/configuracion",
  },
];

export default mainMenu;


