import { Fragment, lazy, Suspense, useEffect, useRef, useState } from "react";
import { Close, Save } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { AutocompleteElement, FormContainer, SwitchElement, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import Swal from "sweetalert2";
import { REGEX_BASE64, REGEX_NAME } from "../../../app/constants/CommonRegex";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ProfilePicturePreview from "../../utils/fallbackRender/ProfilePicturePreview";
import { MuiTelInput } from "mui-tel-input";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type TAccesos = {
  _id?: string;
  nombre?: string;
};

type TPuestos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TDepartamentos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TCubiculos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TEmpresas = {
  _id: string;
  nombre: string;
  activo: boolean;
  pisos: TPisos[];
  puestos: TPuestos[];
  departamentos: TDepartamentos[];
  cubiculos: TCubiculos[];
  accesos: TAccesos[];
};
type TPisos = { _id: string; identificador: string; nombre: string };

type FormValues = {
  img_usuario: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  id_empresa: string;
  id_piso: string;
  accesos: string[];
  movil?: string;
  telefono?: string;
  extension?: string;
  id_puesto?: string;
  id_departamento?: string;
  id_cubiculo?: string;
  correo: string;
  acceso_campo: boolean;
  biostar_group_id?: string;
};

const resolver = yup.object().shape({
  img_usuario: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de usuario debe ser una URL válida.",
      (value) => {
        if (value) {
          const hasUri = REGEX_BASE64.test(value);
          if (hasUri) {
            return true;
          }
          return false;
        } else {
          return true;
        }
      }
    ),
  nombre: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_pat: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_mat: yup
    .string()
    .notRequired()
    .test(
      "isValidLastName",
      "Este campo solo acepta letras y espacios.",
      (value) => {
        if (value) {
          const hasUpperCase = REGEX_NAME.test(value);
          if (hasUpperCase) {
            return true;
          }
          return false;
        } else {
          return true;
        }
      }
    ),
  id_empresa: yup.string().required("Este campo es obligatorio."),
  id_piso: yup.string().required("Este campo es obligatorio."),
  accesos: yup
    .array()
    .of(yup.string())
    .min(1, "Debes seleccionar al menos un acceso"),
  id_puesto: yup.string(),
  id_departamento: yup.string(),
  id_cubiculo: yup.string(),
  movil: yup.string(),
  telefono: yup.string(),
  extension: yup.string(),
  correo: yup
    .string()
    .required("Este campo es obligatorio.")
    .email("Formato de correo inválido."),
  acceso_campo: yup.boolean().required(),
  biostar_group_id: yup.string().optional(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_usuario: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  id_empresa: "",
  id_piso: "",
  accesos: [],
  id_puesto: "",
  id_departamento: "",
  id_cubiculo: "",
  movil: "",
  telefono: "",
  extension: "",
  correo: "",
  acceso_campo: false,
  biostar_group_id: "",
};

export default function EditarEmpleado() {
  const { habilitarRegistroCampo } = useSelector(
    (state: IRootState) => state.config.data
  );
  const { habilitarIntegracionBiostar, habilitarIntegracionHv } = useSelector(
    (state: IRootState) => state.config.data
  );
  const { id: ID } = useParams();
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [empresas, setEmpresas] = useState<TEmpresas[]>([]);
  const [pisos, setPisos] = useState<TPisos[]>([]);
  const [accesos, setAccesos] = useState<TAccesos[]>([]);
  const [puestos, setPuestos] = useState<TPuestos[]>([]);
  const [departamentos, setDepartamentos] = useState<TDepartamentos[]>([]);
  const [cubiculos, setCubiculos] = useState<TCubiculos[]>([]);
  const [esUsuarioMaestro, setEsUsuarioMaestro] = useState(false);
  const [biostarGrupos, setBiostarGrupos] = useState<Array<{ id_externo: string; nombre: string }>>([]);
  const [modalGrupoOpen, setModalGrupoOpen] = useState(false);
  const [nuevoGrupo, setNuevoGrupo] = useState("");
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const initialFormRef = useRef<FormValues | null>(null);
  const [postSaveOpen, setPostSaveOpen] = useState(false);
  const [postSaveStep, setPostSaveStep] = useState<"huella" | "tarjeta">(
    "huella"
  );

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/empleados/form-editar/${ID}`);
        if (res.data.estado) {
          const { usuario, empresas, biostarGrupos } = res.data.datos;
          setEsUsuarioMaestro(usuario.id_empleado === 1);
          setEmpresas(empresas);
          setPuestos(puestos);
          setDepartamentos(departamentos);
          setCubiculos(cubiculos);
          const empresaSeleccionada = (empresas as TEmpresas[]).find(
            (e) => e._id === usuario?.id_empresa
          );
          setPisos(empresaSeleccionada?.pisos || []);
          setPuestos(empresaSeleccionada?.puestos || []);
          setDepartamentos(empresaSeleccionada?.departamentos || []);
          setCubiculos(empresaSeleccionada?.cubiculos || []);
          setAccesos(empresaSeleccionada?.accesos || []);
          setBiostarGrupos(Array.isArray(biostarGrupos) ? biostarGrupos : []);
          const usuarioForm = {
            ...usuario,
            id_empresa: usuario?.id_empresa ?? "",
            id_piso: usuario?.id_piso ?? "",
            accesos: Array.isArray(usuario?.accesos)
              ? usuario.accesos
                  .map((item: any) =>
                    typeof item === "string" ? item : item?._id
                  )
                  .filter(Boolean)
              : [],
            id_puesto: usuario?.id_puesto ?? "",
            id_departamento: usuario?.id_departamento ?? "",
            id_cubiculo: usuario?.id_cubiculo ?? "",
            acceso_campo: habilitarRegistroCampo ? !!usuario?.acceso_campo : false,
          };
          formContext.reset(usuarioForm);
          formContext.trigger();
          initialFormRef.current = formContext.getValues();
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { erroresForm } = handlingError(error);
        if (erroresForm) setFormErrors(formContext.setError, erroresForm);
      }
    };
    obtenerRegistro();
  }, [formContext, ID, habilitarRegistroCampo]);

  useEffect(() => {
    if (!habilitarIntegracionBiostar) return;
    if (!biostarGrupos.length) return;
    const current = String(formContext.getValues("biostar_group_id") || "").trim();
    if (current) return;
    const allUsers =
      biostarGrupos.find((g) => String(g.nombre || "").trim().toLowerCase() === "all users") ||
      biostarGrupos.find((g) => String(g.id_externo) === "1") ||
      biostarGrupos[0];
    if (allUsers?.id_externo) {
      formContext.setValue("biostar_group_id", String(allUsers.id_externo), { shouldValidate: true });
    }
  }, [habilitarIntegracionBiostar, biostarGrupos, formContext]);

  useEffect(() => {
    if (!habilitarRegistroCampo) {
      formContext.setValue("acceso_campo", false, { shouldValidate: true });
    }
  }, [habilitarRegistroCampo, formContext]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      if (habilitarIntegracionBiostar && !esUsuarioMaestro && !String(data.biostar_group_id || "").trim()) {
        formContext.setError("biostar_group_id", { type: "manual", message: "Este campo es obligatorio." });
        return;
      }
      const initial = initialFormRef.current;
      if (initial) {
        const sameAccesos =
          (initial.accesos || []).slice().sort().join(",") ===
          (data.accesos || []).slice().sort().join(",");
        const noChanges =
          initial.img_usuario === data.img_usuario &&
          initial.nombre === data.nombre &&
          initial.apellido_pat === data.apellido_pat &&
          initial.apellido_mat === data.apellido_mat &&
          initial.id_empresa === data.id_empresa &&
          initial.id_piso === data.id_piso &&
          initial.id_puesto === data.id_puesto &&
          initial.id_departamento === data.id_departamento &&
          initial.id_cubiculo === data.id_cubiculo &&
          initial.movil === data.movil &&
          initial.telefono === data.telefono &&
          initial.extension === data.extension &&
          initial.correo === data.correo &&
          initial.acceso_campo === data.acceso_campo &&
          String(initial.biostar_group_id || "").trim() ===
            String(data.biostar_group_id || "").trim() &&
          sameAccesos;
        if (noChanges) {
          navigate("/empleados");
          return;
        }
      }
      setIsSaving(true);
      const res = await clienteAxios.put(`/api/empleados/${ID}`, data);
      if (res.data.estado) {
        const pendientes: string[] = Array.isArray(res.data?.sync?.pendiente)
          ? res.data.sync.pendiente
          : [];
        if (pendientes.length > 0) {
          enqueueSnackbar(
            `Empleado guardado, pero quedó pendiente sincronizar en: ${pendientes.join(", ")}.`,
            { variant: "warning" }
          );
        }
        enqueueSnackbar("El empleado se modificó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        if (habilitarIntegracionHv) {
          setPostSaveStep("huella");
          setPostSaveOpen(true);
        } else {
          navigate("/empleados");
        }
      } else if (res.data.codigo === "PANEL_SYNC_FAILED") {
        setIsSaving(false);
        setShowForm(false);
        await Swal.fire({
          icon: "error",
          title: "No se pudo subir la foto",
          text:
            res.data.mensaje ||
            "El panel no aceptó la foto. Intenta con otra imagen.",
          showConfirmButton: true,
          allowOutsideClick: false,
          didOpen: () => {
            const container = Swal.getContainer();
            if (container) {
              container.style.zIndex = "20000";
              if (container.parentElement) container.parentElement.style.zIndex = "20000";
            }
          },
          showClass: { popup: "swal2-show" },
          hideClass: { popup: "swal2-hide" },
        });
        setShowForm(true);
        return;
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = async (value: string, name: "telefono" | "movil") => {
    formContext.setValue(name, value, { shouldValidate: true });
  };

  const regresar = () => {
    navigate("/empleados");
  };

  const cerrarFlujoPostSave = () => {
    setPostSaveOpen(false);
    navigate("/empleados");
  };

  const abrirConfigHuella = () => {
    setPostSaveOpen(false);
    navigate("/empleados", {
      state: { openBiometriaFor: ID, biometriaStep: "huella" },
    });
  };

  const abrirConfigTarjeta = () => {
    setPostSaveOpen(false);
    navigate("/empleados", {
      state: { openBiometriaFor: ID, biometriaStep: "tarjeta" },
    });
  };
  const swalTop = {
    zIndex: 2400,
    didOpen: () => {
      const container = Swal.getContainer();
      if (container) container.style.zIndex = "2400";
    },
  };

  const crearGrupoBiostarDesdeForm = async () => {
    if (creandoGrupo) return;
    const base = nuevoGrupo.trim();
    const nombre = base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
    if (!nombre) return;
    setCreandoGrupo(true);
    setModalGrupoOpen(false);

    Swal.fire({
      title: "Creando grupo",
      text: "Espera un momento...",
      allowOutsideClick: false,
      showConfirmButton: false,
      ...swalTop,
      didOpen: () => {
        const container = Swal.getContainer();
        if (container) container.style.zIndex = "2400";
        Swal.showLoading();
      },
      showClass: { popup: "swal2-show" },
      hideClass: { popup: "swal2-hide" },
    });

    try {
      const res = await clienteAxios.post("/api/biostar-grupos", { nombre });
      Swal.close();

      if (!res.data?.estado) {
        await Swal.fire({
          icon: "error",
          title: "No se pudo crear",
          text: res.data?.mensaje || "No se pudo crear el grupo.",
          showConfirmButton: true,
          allowOutsideClick: false,
          ...swalTop,
          showClass: { popup: "swal2-show" },
          hideClass: { popup: "swal2-hide" },
        });
        return;
      }

      const gruposRes = await clienteAxios.get("/api/biostar-grupos");
      if (gruposRes.data?.estado) {
        const list = Array.isArray(gruposRes.data?.datos) ? gruposRes.data.datos : [];
        setBiostarGrupos(list);
        const creado = list.find((g: any) => String(g.nombre || "").toLowerCase() === nombre.toLowerCase());
        if (creado?.id_externo) {
          formContext.setValue("biostar_group_id", String(creado.id_externo), { shouldValidate: true });
        }
      }

      await Swal.fire({
        icon: "success",
        title: "Grupo creado",
        text: "El grupo se creó correctamente.",
        showConfirmButton: true,
        allowOutsideClick: false,
        ...swalTop,
        showClass: { popup: "swal2-show" },
        hideClass: { popup: "swal2-hide" },
      });
      setNuevoGrupo("");
    } catch (error: any) {
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "No se pudo crear",
        text: error?.response?.data?.mensaje || error?.message || "Ocurrió un error al crear el grupo.",
        showConfirmButton: true,
        allowOutsideClick: false,
        ...swalTop,
        showClass: { popup: "swal2-show" },
        hideClass: { popup: "swal2-hide" },
      });
    } finally {
      setCreandoGrupo(false);
    }
  };

  if (!showForm) {
    return null;
  }

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {isSaving || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Editar Empleado
                </Typography>
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    name="img_usuario"
                    allowFiles={["png", "jpeg", "jpg"]}
                  />
                </Suspense>
                <Typography variant="overline" component="h6">
                  Generales
                </Typography>
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="apellido_pat"
                  label="Apellido Paterno"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="apellido_mat"
                  label="Apellido Materno"
                  fullWidth
                  margin="normal"
                />
                {!esUsuarioMaestro && (
                  <AutocompleteElement
                    name="id_empresa"
                    label="Empresa"
                    required
                    options={empresas.map((item) => {
                      return { id: item._id, label: item.nombre };
                    })}
                    textFieldProps={{
                      margin: "normal",
                    }}
                    autocompleteProps={{
                      noOptionsText: "No hay opciones.",
                      onChange: (_, value) => {
                        formContext.setValue("id_empresa", value?.id || "");
                        const empresaSeleccionada = empresas.find(
                          (e) => e._id === value?.id
                        );
                        setPisos(empresaSeleccionada?.pisos || []);
                        setAccesos(empresaSeleccionada?.accesos || []);
                        setPuestos(empresaSeleccionada?.puestos || []);
                        setDepartamentos(empresaSeleccionada?.departamentos || []);
                        setCubiculos(empresaSeleccionada?.cubiculos || []);
                        formContext.setValue("id_piso", "");
                        formContext.setValue("accesos", []);
                        formContext.setValue("id_puesto", "");
                        formContext.setValue("id_departamento", "");
                        formContext.setValue("id_cubiculo", "");
                      },
                    }}
                  />
                )}
                <AutocompleteElement
                  name="id_piso"
                  label="Piso"
                  required
                  matchId
                  options={pisos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="accesos"
                  label="Acceso"
                  required
                  matchId
                  multiple
                  options={accesos.map((item) => {
                    return {
                      id: item._id,
                      label: item.nombre,
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="id_puesto"
                  label="Puesto"
                  matchId
                  options={puestos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="id_departamento"
                  label="Departamento"
                  matchId
                  options={departamentos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="id_cubiculo"
                  label="Cubículo"
                  matchId
                  options={cubiculos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                {!esUsuarioMaestro && habilitarIntegracionBiostar && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Box sx={{ flex: 1, width: "100%" }}>
                      <AutocompleteElement
                        name="biostar_group_id"
                        label="Grupo BioStar"
                        required
                        matchId
                        options={biostarGrupos.map((item) => ({
                          id: item.id_externo,
                          label:
                            String(item.nombre || "").trim().toLowerCase() === "all users"
                              ? "Predeterminado BioStar"
                              : item.nombre,
                        }))}
                        textFieldProps={{ margin: "normal" }}
                        autocompleteProps={{ noOptionsText: "No hay opciones." }}
                      />
                    </Box>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<Add />}
                      sx={{ mt: { xs: 0, sm: 1 } }}
                      onClick={() => setModalGrupoOpen(true)}
                    >
                      Grupo
                    </Button>
                  </Stack>
                )}
                <Controller
                  name="movil"
                  control={formContext.control}
                  render={({ field, fieldState }) => (
                    <MuiTelInput
                      name="movil"
                      label="Teléfono Móvil"
                      fullWidth
                      margin="normal"
                      value={field.value}
                      onChange={(value: string) => handleChange(value, "movil")}
                      defaultCountry="MX"
                      continents={["SA", "NA"]}
                      langOfCountryName="es"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disableFormatting
                    />
                  )}
                />
                <Controller
                  name="telefono"
                  control={formContext.control}
                  render={({ field, fieldState }) => (
                    <MuiTelInput
                      name="telefono"
                      label="Teléfono de Casa/Oficina"
                      fullWidth
                      margin="normal"
                      value={field.value}
                      onChange={(value: string) =>
                        handleChange(value, "telefono")
                      }
                      defaultCountry="MX"
                      continents={["SA", "NA"]}
                      langOfCountryName="es"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disableFormatting
                    />
                  )}
                />
                <TextFieldElement
                  name="extension"
                  label="Extensión"
                  fullWidth
                  margin="normal"
                  type="text"
                />
                {!esUsuarioMaestro && (
                  <Fragment>
                    <TextFieldElement
                      name="correo"
                      label="Correo"
                      required
                      fullWidth
                      margin="normal"
                      type="email"
                    />
                    {habilitarRegistroCampo && (
                      <SwitchElement
                        name="acceso_campo"
                        label="Habilitar acceso de campo para este empleado"
                        labelPlacement="end"
                      />
                    )}
                  </Fragment>
                )}
                <Divider sx={{ my: 2 }} />
                <Box
                  component="footer"
                  sx={{
                    display: "flex",
                    justifyContent: "end",
                    mt: 3,
                    mb: 0.5,
                  }}
                >
                  <Stack
                    spacing={2}
                    direction={{ xs: "column-reverse", sm: "row" }}
                    justifyContent="end"
                    sx={{ width: "100%" }}
                  >
                    <Button
                      type="button"
                      size="medium"
                      variant="contained"
                      color="secondary"
                      onClick={regresar}
                      startIcon={<Close />}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="medium"
                      variant="contained"
                      startIcon={<Save />}
                    >
                      Guardar
                    </Button>
                  </Stack>
                </Box>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
      <Dialog
        open={postSaveOpen}
        onClose={cerrarFlujoPostSave}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {postSaveStep === "huella"
            ? "Configurar huella"
            : "Configurar tarjeta"}
          <IconButton
            onClick={cerrarFlujoPostSave}
            sx={{ position: "absolute", right: 8, top: 8 }}
            size="small"
            color="error"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {postSaveStep === "huella" ? (
            <Typography>
              El empleado se guardo correctamente. Quieres configurar su huella
              ahora?
            </Typography>
          ) : (
            <Typography>
              Configuracion de tarjeta (esqueleto): este paso se habilitara en
              la siguiente fase.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {postSaveStep === "huella" ? (
            <Fragment>
              <Button onClick={() => setPostSaveStep("tarjeta")}>Omitir</Button>
              <Button variant="contained" onClick={abrirConfigHuella}>
                Configurar huella
              </Button>
            </Fragment>
          ) : (
            <Fragment>
              <Button onClick={cerrarFlujoPostSave}>Omitir</Button>
              <Button variant="contained" onClick={abrirConfigTarjeta}>
                Configurar tarjeta
              </Button>
            </Fragment>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={modalGrupoOpen} onClose={() => setModalGrupoOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          Nuevo Grupo BioStar
          <IconButton onClick={() => setModalGrupoOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre del grupo"
            value={nuevoGrupo}
            onChange={(e) => { const raw = String(e.target.value || ""); const normalized = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : ""; setNuevoGrupo(normalized); }}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalGrupoOpen(false)} disabled={creandoGrupo}>Cancelar</Button>
          <Button variant="contained" onClick={crearGrupoBiostarDesdeForm} disabled={creandoGrupo}>Crear</Button>
        </DialogActions>
      </Dialog>
    </ModalContainer>
  );
}




















