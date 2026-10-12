import { AVOIDABLE_ERROR_CODES } from "./queries";
import type { ErrorCount } from "./types";

/** WhatsApp codes come as "WA-131026" or "131026"; compare without the prefix. */
const bare = (code: string) => code.replace(/^WA-/, "");

const LABELS: Record<string, string> = {
  "SF-3060": "Un parámetro de la plantilla llega vacío",
  "100": "Parámetro del botón vacío",
  "132000": "El número de parámetros no coincide con la plantilla",
  "132015": "Plantilla pausada en Meta",
  "132001": "La plantilla no existe en ese idioma",
  "131008": "Falta el valor de un parámetro",
  "131005": "Problema de permisos o token de la API",
  "190": "Token de acceso caducado o no válido",
  "10": "La aplicación no tiene permiso",
  "131026": "Número sin WhatsApp o no alcanzable",
  "131049": "Límite de marketing de Meta",
  "130472": "Número en un experimento de Meta",
  "131047": "Ventana de 24 h caducada",
  "131050": "El destinatario se dio de baja del marketing",
  "131053": "Meta no pudo descargar la imagen o el vídeo de la cabecera",
};

const AVOIDABLE = new Set(AVOIDABLE_ERROR_CODES.map(bare));

export function describeError(code: string, failed: number): ErrorCount {
  const key = bare(code);
  return {
    code,
    failed,
    avoidable: AVOIDABLE.has(key),
    label: LABELS[code] ?? LABELS[key] ?? "Otro motivo",
  };
}
