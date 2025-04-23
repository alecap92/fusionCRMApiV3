import axios from "axios";
const apiUrl = process.env.WHATSAPP_API_URL;

export const getMedia = async (mediaId: string, token: string) => {
  const url = `${apiUrl}/${mediaId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const media = await axios.get(response.data.url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "arraybuffer",
    });

    return media.data;
  } catch (error) {
    console.error("Error fetching media:");
    throw error;
  }
};
