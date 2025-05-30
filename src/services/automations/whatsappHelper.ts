import axios from "axios";

const apiUrl = process.env.WHATSAPP_API_URL;

export interface WhatsAppMessageOptions {
  to: string;
  message: string;
  accessToken: string;
  phoneNumberId: string;
}

export async function sendWhatsAppMessage(
  options: WhatsAppMessageOptions
): Promise<string | null> {
  const { to, message, accessToken, phoneNumberId } = options;

  try {
    const whatsappApiUrl = `${apiUrl}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to,
      text: { body: message },
    };

    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.data?.messages?.[0]?.id) {
      return response.data.messages[0].id;
    }

    return null;
  } catch (error) {
    console.error("[WhatsAppHelper] Error enviando mensaje:", error);
    throw error;
  }
}
