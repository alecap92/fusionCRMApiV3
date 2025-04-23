import { renderText } from "../../utils/renderText";

export default async function sendEmail(nodo: any, context: any) {
  const to = renderText(nodo.to, context);
  const subject = renderText(nodo.subject, context);
  const body = renderText(nodo.emailBody, context);

  console.log("📧 Enviando email:");
  console.log("Para:", to);
  console.log("Asunto:", subject);
  console.log("Mensaje:", body);

  // Aquí conectas con tu servicio de correo real si lo deseas
}
