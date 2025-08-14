import { renderText } from "../../utils/renderText";

export default async function sendEmail(nodo: any, context: any) {
  const to = renderText(nodo.to, context);
  const subject = renderText(nodo.subject, context);
  const body = renderText(nodo.emailBody, context);

  // Aquí conectas con tu servicio de correo real si lo deseas
}
