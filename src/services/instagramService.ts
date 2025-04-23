import axios from "axios";
import SocialAccount from "../models/SocialAccount";

/**
 * Publicar en Instagram
 * @description Este controlador publica una imagen y un caption en Instagram.
 * Se requiere el access token de la cuenta de Instagram y el ID de la cuenta.
 * La imagen se sube a un contenedor y luego se publica.
 * Debe enviarsele en el body el caption y la url de la imagen. y en los params el id de la cuenta de instagram.
 * @param {Request} req - La solicitud HTTP.
 * @param {Response} res - La respuesta HTTP.
 * @returns {Promise<void>} - Una promesa que resuelve cuando se completa la publicación.
 **/
export const postToInstagram = async (post: any) => {
  // 1. Obtener el access token
  const response = await SocialAccount.find({
    organizationId: post.organizationId,
  });

  if (!response) {
    return;
  }
  const accessToken = response[0].accessToken;

  // 2. Obtener el ID de la cuenta de Instagram
  const instagramId = post.instagramAccountId;

  // 3. Subir la imagen al contenedor
  /**
   Campos Posibles: image_url, video_url, caption, location_id, user_tags, 
   thumb_offset, media_type, children, share_to_feed, collaborators    
   */
  const body = {
    image_url: post.mediaUrls[0],
    caption: post.content,
    access_token: accessToken,
  };

  const response2 = await axios.post(
    `https://graph.facebook.com/v22.0/${instagramId}/media`,
    body
  );

  if (response2.status !== 200) {
    console.log("Error al subir la imagen:", response2.data);
    return;
  }

  // 4. Publicar el contenedor

  const creationId = response2.data.id;

  const response3 = await axios.post(
    `https://graph.facebook.com/v22.0/${instagramId}/media_publish`,
    {
      creation_id: creationId,
      access_token: accessToken,
    }
  );
  if (response3.status !== 200) {
    console.log("Error al publicar el contenedor:", response3.data);
    return;
  }
};
