// services/publisherService.ts
import axios from "axios";
import ScheduledPost from "../models/ScheduledPost";
import SocialAccount from "../models/SocialAccount";

interface PublishResult {
  success: boolean;
  message: string;
}

export const publishScheduledPost = async (
  postId: string
): Promise<PublishResult> => {
  try {
    const post = await ScheduledPost.findById(postId);
    if (!post) return { success: false, message: "Publicación no encontrada" };

    const account = await SocialAccount.findById(post.socialAccountId);
    if (!account)
      return { success: false, message: "Cuenta social no encontrada" };

    let result: PublishResult;
    switch (account.platform) {
      case "facebook":
        result = await publishToFacebook(post, account);
        break;
      case "instagram":
        result = await publishToInstagram(post, account);
        break;
      default:
        result = { success: false, message: "Plataforma no soportada" };
    }

    post.status = result.success ? "published" : "failed";
    post.errorMessage = result.success ? undefined : result.message;
    await post.save();

    return result;
  } catch (err) {
    console.error("❌ Error publicando post:", err);
    await ScheduledPost.findByIdAndUpdate(postId, {
      status: "failed",
      errorMessage: (err as Error).message,
    });
    return { success: false, message: "Error al publicar" };
  }
};

const publishToFacebook = async (
  post: any,
  account: any
): Promise<PublishResult> => {
  try {
    const url = post.mediaUrls?.[0];
    const endpoint = url
      ? `https://graph.facebook.com/${account.accountId}/photos`
      : `https://graph.facebook.com/${account.accountId}/feed`;

    const payload: any = {
      access_token: account.accessToken,
    };

    if (url) {
      payload.url = url;
      payload.message = post.content;
    } else {
      payload.message = post.content;
    }

    await axios.post(endpoint, payload);
    return { success: true, message: "Publicado en Facebook" };
  } catch (err) {
    console.error("❌ Error al publicar en Facebook:", err);
    return {
      success: false,
      message:
        (err as any).response?.data?.error?.message || "Error desconocido",
    };
  }
};

const publishToInstagram = async (
  post: any,
  account: any
): Promise<PublishResult> => {
  try {
    const mediaUrl = post.mediaUrls?.[0];
    if (!mediaUrl)
      return {
        success: false,
        message: "Instagram requiere una imagen o video",
      };

    // Paso 1: Crear contenedor de medios
    const mediaResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${account.accountId}/media`,
      {
        image_url: mediaUrl,
        caption: post.content,
        access_token: account.accessToken,
      }
    );

    const creationId = mediaResponse.data.id;
    if (!creationId)
      return { success: false, message: "Error creando contenedor de medios" };

    // Paso 2: Publicar el contenedor
    await axios.post(
      `https://graph.facebook.com/v19.0/${account.accountId}/media_publish`,
      {
        creation_id: creationId,
        access_token: account.accessToken,
      }
    );

    return { success: true, message: "Publicado en Instagram" };
  } catch (err) {
    console.error("❌ Error al publicar en Instagram:", err);
    return {
      success: false,
      message:
        (err as any).response?.data?.error?.message || "Error desconocido",
    };
  }
};
