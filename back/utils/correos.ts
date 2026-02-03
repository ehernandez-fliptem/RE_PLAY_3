import { Types } from "mongoose";
import { sendEmail } from "../middlewares/mail";
import Configuracion from "../models/Configuracion";
import Usuarios, { IUsuario } from "../models/Usuarios";
import QRCode from "qrcode";
import dayjs from "dayjs";
import Registros from "../models/Registros";
import { agruparDataParaAnfitrion, agruparDataParaVisitante } from "./utils";
import { CONFIG } from "../config";

/**
 * @function
 * @name enviarCorreoUsuario
 * @description Función para enviar el correo al usuario sobre su nueva cuenta.
 * @param correo - Correo de destino.
 * @param usuario - Nombre de usuario.
 * @param contrasena - Contraseña del usuario.
 * @param rol - Rol del usuario.
 */
export async function enviarCorreoUsuario(
    correo: string,
    contrasena: string,
    rol: string,
    qr: string
): Promise<boolean> {
    try {
        console.log("Entrando a enviarCorreoUsuario");
        const asunto = "Cuenta nueva";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const response = await sendEmail({
            destinatario: correo,
            asunto,
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">${asunto}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                <tr>
                                    <td><br>Se ha creado una nueva cuenta para usted.</td>
                                </tr>
                                <tr>
                                    <td><strong>Correo: </strong> ${correo}</td>
                                </tr>
                                <tr>
                                    <td><strong>Contraseña: </strong> ${contrasena}</td>
                                </tr>
                                ${rol ? `
                                <tr>
                                    <td><strong>Rol: </strong> ${rol}</td>
                                </tr>`: ''}
                                <tr>
                                    <td><br>Para ingresar al sistema haz clic en el siguiente enlace: <a href="${CONFIG.ENDPOINT}"><b>Recepción electrónica</b></a></td>
                                </tr>
                                <tr>
                                    <br>
                                    <br>
                                    <td><strong>Código QR para check-in: </strong></td>
                                    <br>
                                    <br>
                                </tr>
                                <tr>
                                    <td>
                                        <div align="center"><img src="cid:qr" style="width:150px"></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td><div align="center"><p>${despedidaCorreo}</p></div><br></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
            plusAttachments: [
            {
                dataUrl: qr,
                cid: "qr",
                filename: "qr.png",
            },
            ],
        });
        console.log("Correo enviado con respuesta:", response);
        return response;
    } catch (error) {
        console.error("Error en enviarCorreoUsuario:", error);
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoUsuarioNuevaContrasena
 * @description Función para enviar el correo al usuario sobre el restablecimiento de su contraseña.
 * @param correo - Correo de destino.
 * @param contrasena - Nueva contraseña del usuario.
 */
export async function enviarCorreoUsuarioNuevaContrasena(
    correo: string,
    contrasena: string
): Promise<boolean> {
    try {
        const asunto = "Restablecimiento de contraseña";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config

        const response = await sendEmail({
            destinatario: correo,
            asunto,
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">${asunto}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                <tr>
                                    <td><br>Se ha modificado su contraseña para ingresar al sistema de Recepción Electrónica de Coca Cola.</td>
                                </tr>
                                <tr>
                                    <td><br><strong>Contraseña: </strong> ${contrasena}</td>
                                </tr>
                                <tr>
                                    <td><br>Para ingresar al sistema haz clic en el siguiente enlace: <a href="${CONFIG.ENDPOINT}"><b>Recepción electrónica</b></a></td>
                                </tr>
                                <tr>
                                    <td><div align="center"><p>${despedidaCorreo}</p></div><br></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
        });

        return response;
    } catch (error) {
        throw error;
    }
}

/** Correo de nuevo visitante en la seccion de Recepcion Visitantes
     * @function
     * @name enviarCorreoNuevoVisitanteHV
     * @description Envía correo al visitante con su QR de acceso.
     * @param correo - Correo de destino.
     * @param nombreCompleto - Nombre completo del visitante.
     * @param qrDataUrl - QR en formato DataURL (data:image/png;base64,...)
     */
    export async function enviarCorreoNuevoVisitanteHV(
    correo: string,
    nombreCompleto: string,
    qrDataUrl: string
    ): Promise<boolean> {
    try {
        const asunto = "Registro del visitante";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay una configuración establecida.");

        const response = await sendEmail({
        destinatario: correo,
        asunto,
        contenido: `
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td>
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                    
                    <tr>
                    <td bgcolor="#ffffff">
                        <h1 align="center">Registro del visitante</h1>
                    </td>
                    </tr>

                    <tr>
                    <td>
                        <p><strong>Estimado, ${nombreCompleto}</strong></p>
                    </td>
                    </tr>

                    <tr>
                    <td>
                        <p style="font-size:16px; text-align:center;">
                        Presenta este código para poder ingresar a nuestras instalaciones
                        </p>
                    </td>
                    </tr>

                    <tr>
                    <td>
                        <div align="center" style="margin: 20px 0;">
                        <img 
                            src="cid:qr"
                            style="width:320px; height:320px;"
                        />
                        </div>
                    </td>
                    </tr>

                </table>
                </td>
            </tr>
            </table>
        `,
        plusAttachments: [
            {
            dataUrl: qrDataUrl,
            cid: "qr",
            filename: "qr.png",
            },
        ],
        });

        return response;
    } catch (error) {
        throw error;
    }
    }



/**
 * @function
 * @name enviarCorreoCitaVisitante
 * @description Función para enviar el correo al visitante sobre la creación de un registro.
 * @param id_anfitrion - ID del anfitrión a visitar.
 * @param correo - Correo de destinatario.
 * @param fecha_entrada - Fecha de entrada previamente formateada.
 * @param qr - QR de acceso.
 */
export async function enviarCorreoCitaVisitante(
    codigo: string,
    registros: string[] | Types.ObjectId[],
    docs_faltantes: string,
    qr: string
): Promise<number> {
    try {
        let correosEnviados = 0;
        const asunto = "Cita Registrada";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const registros_por_enviar = await Registros.aggregate([
            {
                $match: {
                    $and: [
                        { _id: { $in: registros.map((item) => new Types.ObjectId(item)) } },
                        { codigo },
                        { activo: true }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'id_anfitrion',
                    foreignField: '_id',
                    as: 'anfitrion',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                                },
                                correo: 1
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    anfitrion: { $arrayElemAt: ['$anfitrion', -1] },
                }
            },
            {
                $unwind: {
                    path: "$accesos",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos.id_acceso",
                    foreignField: "_id",
                    as: "acceso_info"
                }
            },
            {
                $addFields: {
                    "accesos.identificador": { $arrayElemAt: ["$acceso_info.identificador", 0] }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    accesos: { $push: "$accesos" }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$doc",
                            { accesos: "$accesos" }
                        ]
                    }
                }
            },
            {
                $set: {
                    anfi_nombre: "$anfitrion.nombre",
                    anfi_correo: '$anfitrion.correo',
                    visit_nombre: {
                        $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                    },
                    visit_correo: "$correo",
                    visit_telefono: "$telefono",
                    visit_empresa: "$empresa",
                    visit_actividades: "$actividades",
                    visit_accesos: {
                        $map: {
                            input: "$accesos",
                            as: "item",
                            in: {
                                $mergeObjects: [
                                    {
                                        identificador: "$$item.identificador",
                                        modo: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: { $eq: ["$$item.modo", 1] },
                                                        then: "Manual",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 2] },
                                                        then: "Automático",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 3] },
                                                        then: "Manual / Automático",
                                                    },
                                                ],
                                                default: "Acceso no identificado",
                                            },
                                        },
                                    },
                                ],
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    tipo_registro: 1,
                    anfi_nombre: 1,
                    anfi_correo: 1,
                    visit_nombre: 1,
                    visit_correo: 1,
                    visit_telefono: 1,
                    visit_empresa: 1,
                    visit_actividades: 1,
                    visit_accesos: 1,
                    fecha_entrada: 1,
                    placas: 1,
                    desc_vehiculo: 1
                }
            }
        ]);
        if (registros_por_enviar.length <= 0) throw new Error("Hubo un problema al obtener los registros asociados.");
        const registrosVisiAGR = agruparDataParaVisitante(registros_por_enviar, 'visit_correo');
        const QR = await QRCode.toDataURL(String(codigo), {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2
        });

        for await (let registro of registrosVisiAGR) {
            console.log("Registro", registro);

            const correo = registro.visit_correo;
            const contenido = `
                <div style="padding: 20px;">
                    
                    <h3>Visitas:</h3>
                    <div>
                        ${registro.detalles.map((detalle) => `
                            <div style="padding: 15px; border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); margin: 5px;">
                                <h3><b>Anfitrión: </b>${detalle.anfi_nombre}</h3>
                                <p><b>Correo: </b>${detalle.anfi_correo}</p>
                                <p><b>Actividades: </b>${detalle.visit_actividades}</p>
                                <p><b>Accesos:</b></p>
                                <ul>
                                     ${detalle.visit_accesos.map((acceso, i) => `
                                          <li> 
                                             ${acceso.identificador} - ${acceso.modo}
                                          </li>
                                      `).join('')}
                                </ul>
                                <p><b>Horarios:</b></p>
                                <ul>
                                    ${detalle.horarios.map((horario, i) => `
                                         <li> 
                                            ${dayjs(horario.fecha_entrada).format("DD/MM/YYYY, HH:mm:ss a")} 
                                            <br />
                                            ${horario.placas ? `<p><b>Placas del vehículo: </b> ${horario.placas}</p>` : ''}
                                            ${horario.desc_vehiculo ? `<p><b>Descripción del vehículo: </b> ${horario.desc_vehiculo}</p>` : ''}
                                         </li>
                                     `).join('')}
                                </ul>
                           </div>
                           `).join('')}
                    </div>
                </div>`;
            const response = await sendEmail({
                destinatario: correo,
                asunto,
                contenido: `
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td>
                                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                    <tr>
                                        <td bgcolor="#ffffff">
                                            <h1 align="center">Cita(s) Registrada(s)</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>${saludaCorreo}</td>
                                    </tr>
                                    
                                    <tr>
                                        <td>
                                        <h3>${registro.visit_nombre}</h3>
                                            <br />
                                            Se han creado las siguientes citas para usted en el Sistema de Recepción Electrónica:
                                            <br />
                                            <br />
                                        </td>
                                    </tr>
                                    ${docs_faltantes ? `
                                    <tr>
                                        <td>
                                            Ingresa al sistema para que subas la documentación faltante: ${docs_faltantes}, puedes hacerlo ingresando a la siguiente liga: <a href="${CONFIG.ENDPOINT}"><b>Flipbot</b></a></td>
                                            <br />
                                            <br />
                                        </td>
                                    </tr>`: ''}
                                     <tr>
                                        <td><strong>Código QR para acceder: </strong></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div align="center"><img src="cid:qr" style="width:150px"></div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            ${contenido}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <br />
                                                Ante cualquier duda contacte a su anfitrión.
                                            <br />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div align="center"><p>${despedidaCorreo}</p></div><br>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>`,
                plusAttachments: [
                    {
                        dataUrl: qr,
                        path: QR,
                        cid: "qr",
                    },
                ],
            });
            if (response) correosEnviados++;
        }
        return correosEnviados;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoCitaAnfitrion
 * @description Función para enviar el correo al anfitrión sobre la creación de un registro.
 * @param correo - Destinatario del correo.
 * @param fecha_entrada - Fecha de entrada previamente formateada.
 */
export async function enviarCorreoCitaAnfitrion(
    registros: string[] | Types.ObjectId[]
): Promise<number> {
    try {
        let correosEnviados = 0;
        const asunto = "Cita Registrada";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const registros_por_enviar = await Registros.aggregate([
            {
                $match: {
                    _id: { $in: registros.map((item) => new Types.ObjectId(item)) }
                }
            },
            {
                $lookup: {
                    from: 'usuarios',
                    localField: 'id_anfitrion',
                    foreignField: '_id',
                    as: 'anfitrion',
                    pipeline: [
                        {
                            $project: {
                                nombre: {
                                    $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                                },
                                correo: 1
                            }
                        }
                    ]
                }
            },
            {
                $set: {
                    anfitrion: { $arrayElemAt: ['$anfitrion', -1] },
                }
            },
            {
                $unwind: {
                    path: "$accesos",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos.id_acceso",
                    foreignField: "_id",
                    as: "acceso_info"
                }
            },
            {
                $addFields: {
                    "accesos.identificador": { $arrayElemAt: ["$acceso_info.identificador", 0] }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    accesos: { $push: "$accesos" }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$doc",
                            { accesos: "$accesos" }
                        ]
                    }
                }
            },
            {
                $set: {
                    anfi_nombre: "$anfitrion.nombre",
                    anfi_correo: '$anfitrion.correo',
                    visit_nombre: {
                        $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                    },
                    visit_correo: "$correo",
                    visit_telefono: "$telefono",
                    visit_empresa: "$empresa",
                    visit_actividades: "$actividades",
                    visit_accesos: {
                        $map: {
                            input: "$accesos",
                            as: "item",
                            in: {
                                $mergeObjects: [
                                    {
                                        identificador: "$$item.identificador",
                                        modo: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: { $eq: ["$$item.modo", 1] },
                                                        then: "Manual",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 2] },
                                                        then: "Automático",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 3] },
                                                        then: "Manual / Automático",
                                                    },
                                                ],
                                                default: "Acceso no identificado",
                                            },
                                        },
                                    },
                                ],
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    tipo_registro: 1,
                    anfi_nombre: 1,
                    anfi_correo: 1,
                    visit_nombre: 1,
                    visit_correo: 1,
                    visit_telefono: 1,
                    visit_empresa: 1,
                    visit_actividades: 1,
                    visit_accesos: 1,
                    fecha_entrada: 1,
                    placas: 1,
                    desc_vehiculo: 1
                }
            }
        ]);
        if (registros_por_enviar.length <= 0) throw new Error("Hubo un problema al obtener los registros asociados.");
        const registrosAnfiAGR = agruparDataParaAnfitrion(registros_por_enviar, 'anfi_correo');
        for await (let registro of registrosAnfiAGR) {
            const correo = registro.anfi_correo;
            const contenido = `
                    <div style="padding: 20px;">
                        <h3>Visitas:</h3>
                        <div>
                            ${registro.detalles.map((detalle) => `
                                <div style="padding: 15px; border-radius: 8px;
                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); margin: 5px;">
                                    <h3><b>Visitante: </b>${detalle.visit_nombre}</h3>
                                    <p><b>Correo: </b>${detalle.visit_correo}</p>
                                    <p><b>Actividades: </b>${detalle.visit_actividades}</p>
                                    <p><b>Accesos:</b></p>
                                    <ul>
                                         ${detalle.visit_accesos.map((acceso, i) => `
                                              <li> 
                                                 ${acceso.identificador} - ${acceso.modo}
                                              </li>
                                          `).join('')}
                                    </ul>
                                    <p><b>Horarios:</b></p>
                                    <ul>
                                        ${detalle.horarios.map((horario, i) => `
                                             <li> 
                                                ${dayjs(horario.fecha_entrada).format("DD/MM/YYYY, HH:mm:ss a")} 
                                                <br />
                                                ${horario.placas ? `<p><b>Placas del vehículo: </b> ${horario.placas}</p>` : ''}
                                                ${horario.desc_vehiculo ? `<p><b>Descripción del vehículo: </b> ${horario.desc_vehiculo}</p>` : ''}
                                             </li>
                                         `).join('')}
                                    </ul>
                               </div>
                               `).join('')}
                        </div>
                    </div>`;
            const response = await sendEmail({
                destinatario: correo,
                asunto,
                contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                  <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Cita(s) Registrada(s)</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                
                                 <tr>
                                    <td>
                                    <h3>${registro.anfi_nombre}</h3>
                                        <br />
                                        Se han creado las siguientes citas para usted en el Sistema de Recepción Electrónica:
                                        <br />
                                        <br />
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        ${contenido}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div align="center"><p>${despedidaCorreo}</p></div><br>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
            });
            if (response) correosEnviados++;
        }
        return correosEnviados;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoCitaVisitante
 * @description Función para enviar el correo al visitante sobre la creación de un registro.
 * @param id_anfitrion - ID del anfitrión a visitar.
 * @param correo - Correo de destinatario.
 * @param fecha_entrada - Fecha de entrada previamente formateada.
 * @param qr - QR de acceso.
 */
export async function enviarCorreoModificacionCitaVisitante(
    type: number,
    id_anfitrion: Types.ObjectId | string,
    correo: string,
    fecha_entrada: string,
    qr: string,
    id_registro: string | Types.ObjectId
): Promise<boolean> {
    console.log("Tipo", type);

    try {
        const asunto = "Cita Modificada"
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const { nombre: anfitrion, correo: correo_anfi } = await Usuarios.findById(id_anfitrion, { nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] }, correo: 1 }) as IUsuario;
        const registro = await Registros.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(id_registro)
                }
            },
            {
                $unwind: {
                    path: "$accesos",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos.id_acceso",
                    foreignField: "_id",
                    as: "acceso_info"
                }
            },
            {
                $addFields: {
                    "accesos.identificador": { $arrayElemAt: ["$acceso_info.identificador", 0] }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    accesos: { $push: "$accesos" }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$doc",
                            { accesos: "$accesos" }
                        ]
                    }
                }
            },
            {
                $project: {
                    visitante: {
                        $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                    },
                    telefono_visit: "$telefono",
                    empresa_visit: "$empresa",
                    actividades_visit: "$actividades",
                    accesos_visit: {
                        $map: {
                            input: "$accesos",
                            as: "item",
                            in: {
                                $mergeObjects: [
                                    {
                                        identificador: "$$item.identificador",
                                        modo: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: { $eq: ["$$item.modo", 1] },
                                                        then: "Manual",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 2] },
                                                        then: "Automático",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 3] },
                                                        then: "Manual / Automático",
                                                    },
                                                ],
                                                default: "Acceso no identificado",
                                            },
                                        },
                                    },
                                ],
                            }
                        }
                    }
                }
            }
        ]);
        if (!registro[0]) throw new Error("No existe el registro.");
        const { visitante, telefono_visit, empresa_visit, actividades_visit, accesos_visit } = registro[0];
        const response = await sendEmail({
            destinatario: correo,
            asunto,
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Cita Modificada</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>${type === 1 ? "Se ha agendado una cita para usted:" : "Se ha modificado una cita para usted:"}<br><br>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Anfitrión: </strong>${anfitrion} (${correo_anfi})</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Fecha de Entrada: </strong>${dayjs(fecha_entrada).format("DD/MM/YYYY HH:mm")}<br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Visitante: </strong>${visitante}<br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Teléfono: </strong>${telefono_visit}<br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Empresa: </strong>${empresa_visit}<br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Actividades: </strong>${actividades_visit}<br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Accesos: </strong><br>
                                        <br />
                                        <div>
                                            ${accesos_visit.map((item: { identificador: string; modo: string }) => `
                                                <div style="padding: 15px; border-radius: 8px;
                                                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); margin: 5px;">
                                                    <strong>Accesos: </strong><br>
                                                   <h3><b>Identificador: </b>${item.identificador}</h3>
                                                   <p><b>Modo: </b>${item.modo}</p>
                                               </div>
                                               `).join('')}
                                        </div>
                                        <br />
                                        <br />
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Código QR para acceder: </strong></td>
                                </tr>
                                <tr>
                                    <td>
                                        <div align="center"><img src="cid:qr" style="width:150px"></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Para más detalles revise los anexos de seguridad e ingreso:</strong></td>
                                </tr>
                                <tr>
                                    <td>
                                        <div align="center"><p>${despedidaCorreo}</p></div><br>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
            plusAttachments: [
                {
                    dataUrl: qr,
                    path: qr,
                    cid: "qr",
                },
            ],
        });

        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoCitaAnfitrion
 * @description Función para enviar el correo al anfitrión sobre la creación de un registro.
 * @param correo - Destinatario del correo.
 * @param fecha_entrada - Fecha de entrada previamente formateada.
 */
export async function enviarCorreoModificacionCitaAnfitrion(
    type: number,
    id_anfitrion: string | Types.ObjectId,
    fecha_entrada: string,
    id_registro: string | Types.ObjectId
): Promise<boolean> {
    try {
        const asunto = "Cita Modificada";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const { correo } = await Usuarios.findById(id_anfitrion, "correo") as IUsuario;
        const registro = await Registros.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(id_registro)
                }
            },
            {
                $unwind: {
                    path: "$accesos",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "accesos",
                    localField: "accesos.id_acceso",
                    foreignField: "_id",
                    as: "acceso_info"
                }
            },
            {
                $addFields: {
                    "accesos.identificador": { $arrayElemAt: ["$acceso_info.identificador", 0] }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    accesos: { $push: "$accesos" }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$doc",
                            { accesos: "$accesos" }
                        ]
                    }
                }
            },
            {
                $project: {
                    visitante: {
                        $concat: ['$nombre', ' ', '$apellido_pat', ' ', '$apellido_mat'],
                    },
                    correo_visit: "$correo",
                    telefono_visit: "$telefono",
                    empresa_visit: "$empresa",
                    actividades_visit: "$actividades",
                    accesos_visit: {
                        $map: {
                            input: "$accesos",
                            as: "item",
                            in: {
                                $mergeObjects: [
                                    {
                                        identificador: "$$item.identificador",
                                        modo: {
                                            $switch: {
                                                branches: [
                                                    {
                                                        case: { $eq: ["$$item.modo", 1] },
                                                        then: "Manual",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 2] },
                                                        then: "Automático",
                                                    },
                                                    {
                                                        case: { $eq: ["$$item.modo", 3] },
                                                        then: "Manual / Automático",
                                                    },
                                                ],
                                                default: "Acceso no identificado",
                                            },
                                        },
                                    },
                                ],
                            }
                        }
                    }
                }
            }
        ]);
        if (!registro[0]) throw new Error("No existe el registro.");
        const { visitante, correo_visit, telefono_visit, empresa_visit, actividades_visit, accesos_visit } = registro[0];
        const response = await sendEmail({
            destinatario: correo,
            asunto,
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Cita Modificada</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>${type === 1 ? "Se ha agendado una cita para usted:" : "Se ha modificado una cita para usted:"}<br><br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div style="
                                        padding: 15px; 
                                        border-radius: 8px;
                                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); 
                                        margin: 10px 0;
                                        background-color: #fff;
                                        ">
                                            <p style="margin: 0 0 8px 0;">
                                                <strong>Fecha de Entrada: </strong>${dayjs(fecha_entrada).format("DD/MM/YYYY HH:mm")}
                                            </p>
                                            <p style="margin: 0 0 8px 0;">
                                                <strong>Visitante: </strong>${visitante}
                                            </p>
                                            <p style="margin: 0 0 8px 0;">
                                                <strong>Correo: </strong>${correo_visit}
                                            </p>
                                            <p style="margin: 0 0 8px 0;">
                                                <strong>Teléfono: </strong>${telefono_visit}
                                            </p>
                                            <p style="margin: 0 0 8px 0;">
                                                <strong>Empresa: </strong>${empresa_visit}
                                            </p>
                                            <p style="margin: 0 0 8px 0;">
                                                <strong>Actividades:</strong> ${actividades_visit}
                                            </p>
                                            <h3><strong>Accesos:</strong></h3>
                                            <div>
                                                ${accesos_visit.map((item: { identificador: string; modo: string }) => `
                                                <div style="
                                                    padding: 10px; 
                                                    border-radius: 6px;
                                                    background-color: #f9f9f9;
                                                    border: 1px solid #ddd;
                                                    margin-bottom: 10px;
                                                ">
                                                    <p style="margin: 0;"><b>Identificador:</b> ${item.identificador}</p>
                                                    <p style="margin: 0;"><b>Modo:</b> ${item.modo}</p>
                                                </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div align="center"><p>${despedidaCorreo}</p></div><br>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
        });

        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoCancelacionCitaVisitante
 * @description Función para enviar el correo de cancelación de una cita al visitante.
 * @param correoVisit - Correo del visitante.
 * @param id_anfitrion - Nombre del anfitrión.
 * @param motivo - Motivo de la cancelación.
 * @param fecha_entrada - Fecha de entrada previamente formateada.
 */
export async function enviarCorreoCancelacionCitaVisitante(
    correoVisit: string,
    id_anfitrion: Types.ObjectId | string,
    motivo: string,
    fecha_entrada: string,
): Promise<boolean> {
    try {
        const asunto = "Visita cancelada";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const { nombre: anfitrion } = await Usuarios.findById(id_anfitrion, { nombre: { $concat: ["$nombre", " ", "$apellido_pat", " ", "$apellido_mat"] } }) as IUsuario;

        const response = await sendEmail({
            destinatario: correoVisit,
            asunto,
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Visita cancelada</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <br />Su cita ha sido cancelada:<br /><br />
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Motivo de cancelación: </strong>${motivo}</td>
                                </tr>
                                <tr>
                                    <td><strong>Anfitrión: </strong>${anfitrion}</td>
                                </tr>
                                <tr>
                                    <td><strong>Fecha de entrada: </strong>${fecha_entrada}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <br />
                                        <div align="center"><p>${despedidaCorreo}</p></div>
                                        <br />
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
        });

        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoCancelacionCitaAnfitrion
 * @description Función para enviar el correo de cancelación de una cita al anfitrión.
 * @param correoAnfi - Destinatario del correo anfitrión.
 * @param correoVisit - Correo informativo del visitante.
 * @param visitante - Nombre del visitante.
 * @param motivo - Motivo de la cancelación.
 * @param fecha_entrada - Fecha de entrada previamente formateada.
 */
export async function enviarCorreoCancelacionCitaAnfitrion(
    id_anfitrion: Types.ObjectId | string,
    correoVisit: string,
    visitante: string,
    motivo: string,
    fecha_entrada: string,
): Promise<boolean> {
    try {
        const asunto = "Visita cancelada";
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config
        const { correo } = await Usuarios.findById(id_anfitrion, 'correo') as IUsuario;

        const response = await sendEmail({
            destinatario: correo,
            asunto,
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">${asunto}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>${saludaCorreo}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <br />Su cita ha sido cancelada:<br /><br />
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Motivo de cancelación: </strong>${motivo}</td>
                                </tr>
                                <tr>
                                    <td><strong>Visitante: </strong>${visitante}</td>
                                </tr>
                                <tr>
                                    <td><strong>Correo del visitante: </strong>${correoVisit}</td>
                                </tr>
                                <tr>
                                    <td><strong>Fecha de entrada: </strong>${fecha_entrada}</td>
                                </tr>
                                <tr>
                                    <td>
                                        <br />
                                        <div align="center"><p>${despedidaCorreo}</p></div>
                                        <br />
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>`,
        });

        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoRecuperarContrasena
 * @description Función para enviar el correo de recuperación de contraseña.
 * @param correo - Correo de destino.
 * @param codigo - Código de recperación.
*/
export async function enviarCorreoRecuperarContrasena(correo: string, codigo: string): Promise<boolean> {
    try {
        const response = await sendEmail({
            destinatario: correo,
            asunto: "Restablecer contraseña en Flipbot",
            texto: "",
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Restablecer contraseña</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        Estimado usuario.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                        Se ha recibido una solicitud para restablecer su contraseña en el Sistema de Flipbot.
                                        <br>
                                        <br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Para restablecer la contraseña de su cuenta por favor ingrese el siguiente código de verificación:</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                        <div align="center"><p>${codigo}</p></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                        <strong>Nota: Este correo expirará en 7 días. Si usted no ha solicitado el restablecimiento de su contraseña, haga caso omiso a este correo.</strong>
                                        <br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                        <div align="center"><p>Atentamente,<br>Flipbot</p></div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoNotificarCheck
 * @description Función para enviar el correo para notificar check de autorización.
 * @param correo - Correo de destino.
 * @param codigo - Código de recperación.
*/
export async function enviarCorreoNotificarCheck(
    correo: string,
    datos: {
        tipo: string;
        id_general: string;
        nombre: string;
        fecha_creacion: string;
        fecha_actual: string;
        comentario: string;
        entrada_horario: string;
        salida_horario: string;
    }): Promise<boolean> {
    try {
        const { tipo, id_general, nombre, fecha_creacion, fecha_actual, comentario, entrada_horario, salida_horario } = datos;
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config;

        const response = await sendEmail({
            destinatario: correo,
            asunto: "Autorización de check",
            texto: "",
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td>
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td bgcolor="#ffffff">
                                <h1 align="center">Autorización de check</h1>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                ${saludaCorreo}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <br>
                                    Se ha realizado una autorización de ${tipo} por check en Recepción Electrónica.
                                <br>
                                <br>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>ID de usuario: </strong> ${id_general}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Usuario: </strong> ${nombre}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Horario: </strong> ${entrada_horario} - ${salida_horario}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Fecha del check: </strong> ${fecha_creacion}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Fecha de autorización o rechazo: </strong> ${fecha_actual}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Comentario: </strong> ${comentario}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div align="center"><p>${despedidaCorreo}</p></div>
                                <br>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
            `,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoDocumentoRechazada
 * @description Función para enviar el correo al visitante por documentación rechazada.
 * @param datos - Datos para el envío.
 * @param datos.correo - Correo del destinatario.
 * @param datos.tipo_documento - Tipo de documento a enviar.
 * @param datos.fecha_carga - Fecha de carga del documento.
 * @param datos.motivo - Motivo del rechazo.
*/
export async function enviarCorreoDocumentoRechazada(datos: {
    correo: string;
    tipo_documento: string;
    fecha_carga: string;
    motivo: string;
}): Promise<boolean> {
    try {
        const { correo, tipo_documento, fecha_carga, motivo } = datos;
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config;
        const response = await sendEmail({
            destinatario: correo,
            asunto: "Documentación rechazada",
            texto: "",
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Documentación rechazada</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                            ${saludaCorreo}
                                        <br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                            Su documentación fue rechazada, consulta el documento para corregirlo y subir uno nuevo:
                                        <br>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                        <strong> Documento: </strong>${tipo_documento}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Fecha de Carga: </strong>${fecha_carga}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <br>
                                        <strong>Motivo: </strong>${motivo}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div align="center"><p>${despedidaCorreo}</p></div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoDocumentoExpirado
 * @description Función para enviar el correo al visitante por documentación a punto de expiración.
 * @param datos - Datos para el envío.
 * @param datos.correo - Correo del destinatario.
 * @param datos.tipo - Tipo de documento a enviar.
 * @param datos.tiempo_restante - Tiempo restante para la expiración.
*/
export async function enviarCorreoDocumentoExpirado(datos: {
    correo: string;
    tipo: string;
    tiempo_restante: string;
}): Promise<boolean> {
    try {
        const { correo, tipo, tiempo_restante } = datos;
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config;
        const response = await sendEmail({
            destinatario: correo,
            asunto: "Documentación a punto de expirar",
            texto: "",
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                                <tr>
                                    <td bgcolor="#ffffff">
                                        <h1 align="center">Actualizar Documentación</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        ${saludaCorreo}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        Su documento ${tipo} está a punto de expirar, tiene ${tiempo_restante} días para actualizarlo.
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        <div align="center"><p>${despedidaCorreo}</p></div>
                                        <br>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoErrorSoporte
 * @description Función para enviar el correo cuando ocurre un error en el sistema.
 * @param correo - Correo de destino.
 * @param datos - Información del error capturado.
*/
export async function enviarCorreoErrorSoporte(
    correo: string,
    datos: {
        mensaje: string;
        componente: string;
        stack: string;
        fecha: string;
    }
): Promise<boolean> {
    try {
        const { mensaje, componente, stack, fecha } = datos;
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config;

        const response = await sendEmail({
            destinatario: correo,
            asunto: "Error en la aplicación",
            texto: "",
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td>
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td bgcolor="#ffffff">
                                <h1 align="center">Error en la aplicación</h1>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                ${saludaCorreo}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <br>
                                    ${mensaje ? `<li><b>Mensaje:</b> ${mensaje}</li>` : ""}
                                    ${componente ? `<li><b>Componente:</b> ${componente}</li>` : ""}
                                    ${stack ? `<li><b>Stack:</b> <pre>${stack}</pre></li>` : ""}
                                <br>
                                <br>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Fecha del incidente: </strong> ${fecha}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div align="center"><p>${despedidaCorreo}</p></div>
                                <br>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
            `,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * @function
 * @name enviarCorreoNuevaLigaCita
 * @description Función para enviar el correo cuando ocurre un error en el sistema.
 * @param correo - Correo de destino.
 * @param token - Token para url.
*/
export async function enviarCorreoNuevaLigaCita(
    correo: string,
    token: string
): Promise<boolean> {
    try {
        const config = await Configuracion.findOne({}, "saludaCorreo despedidaCorreo");
        if (!config) throw new Error("No hay un configuración establecida.")
        const { saludaCorreo, despedidaCorreo } = config;

        const response = await sendEmail({
            destinatario: correo,
            asunto: "Liga de creación de cita",
            texto: "",
            contenido: `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td>
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td bgcolor="#ffffff">
                                <h1 align="center">Crear cita</h1>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                ${saludaCorreo}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <br/>
                                Has recibido una invitación para generar una cita en el Sistema de Recepción Electrónica, para completarla puedas ingresar al siguiente enlace: <a href="${CONFIG.ENDPOINT}/nuevo-registro-visitante?t=${token}"><b>Flipbot</b></a>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div align="center"><p>${despedidaCorreo}</p></div>
                                <br/>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
            `,
        });
        return response;
    } catch (error) {
        throw error;
    }
}