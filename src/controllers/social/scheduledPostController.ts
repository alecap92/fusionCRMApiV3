// controllers/social/scheduledPostController.ts
import { Request, Response } from "express";
import ScheduledPost from "../../models/ScheduledPost";
import SocialAccount from "../../models/SocialAccount";
import axios from "axios";
import { subirArchivo } from "../../config/aws";
import { postToInstagram } from "../../services/instagramService";
import { postToFacebook } from "../../services/facebookService";
import { openAIService } from "../../services/openAiService";

export const getScheduledPosts = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organizationId } : {};
    const posts = await ScheduledPost.find(filter).sort({ scheduledFor: 1 });
    res.status(200).json(posts);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener publicaciones", error: err });
  }
};

export const getScheduledPost = async (req: Request, res: Response) => {
  try {
    const post = await ScheduledPost.findById(req.params.id);
    if (!post)
      return res.status(404).json({ message: "Publicación no encontrada" });
    res.status(200).json(post);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener la publicación", error: err });
  }
};

export const createScheduledPost = async (req: Request, res: Response) => {
  try {
    // obtener el body del request y el organizationId del usuario
    const body = req.body;

    const organizationId = "659d89b73c6aa865f1e7d6fb";

    const socialAccount = await SocialAccount.findOne({
      organizationId,
      platform: "facebook",
    });

    if (!socialAccount) {
      return res
        .status(404)
        .json({ message: "No se encontró la cuenta social" });
    }

    // Subir la imagen al S3 y obtener el url

    const buffer = req.file?.buffer;
    const type = req.file?.mimetype;

    if (!buffer || !type) {
      return res.status(400).json({ message: "No se encontró la imagen" });
    }

    // Subir el archivo a S3
    const imageUrl = await subirArchivo(buffer, Date.now().toString(), type);

    // formatear el post
    const post = {
      content: body.content,
      socialAccountId: socialAccount._id,
      mediaUrls: [imageUrl],
      scheduledFor: body.scheduledFor,
      status: "scheduled",
      facebookAccountId: body.facebookAccountId,
      instagramAccountId: body.instagramAccountId,
      platforms: body.platforms,
      organizationId,
    };

    const newPost = new ScheduledPost(post);
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al crear la publicación", error: err });
  }
};

export const updateScheduledPost = async (req: Request, res: Response) => {
  try {
    const updated = await ScheduledPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Publicación no encontrada" });
    res.status(200).json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al actualizar la publicación", error: err });
  }
};

export const deleteScheduledPost = async (req: Request, res: Response) => {
  try {
    const deleted = await ScheduledPost.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Publicación no encontrada" });
    res.status(200).json({ message: "Publicación eliminada" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al eliminar la publicación", error: err });
  }
};

export const retryScheduledPost = async (req: Request, res: Response) => {
  try {
    const post = await ScheduledPost.findById(req.params.id);
    if (!post)
      return res.status(404).json({ message: "Publicación no encontrada" });
    if (post.status !== "failed") {
      return res
        .status(400)
        .json({ message: "Solo se pueden reintentar publicaciones fallidas" });
    }
    post.status = "scheduled";
    post.errorMessage = undefined;
    await post.save();
    res.status(200).json({ message: "Publicación reprogramada" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al reintentar publicación", error: err });
  }
};

interface FacebookPostParams {
  pageId: string;
  pageAccessToken: string;
  caption: string;
  imageUrl?: string; // opcional
}

export const checkAndPostScheduledPosts = async () => {
  try {
    const now = new Date();
    const posts = await ScheduledPost.find({
      status: "scheduled",
      scheduledFor: { $lte: now },
    });

    for (const post of posts) {
      try {
        let hasError = false;
        let errorMessages = [];

        // Handle both Facebook and Instagram if platforms include both
        if (post.platforms.includes("facebook")) {
          try {
            await postToFacebook(post);
          } catch (error: any) {
            hasError = true;
            errorMessages.push(`Facebook: ${error.message}`);
          }
        }

        if (post.platforms.includes("instagram")) {
          try {
            await postToInstagram(post);
          } catch (error: any) {
            hasError = true;
            errorMessages.push(`Instagram: ${error.message}`);
          }
        }

        if (!post.platforms.length) {
          hasError = true;
          errorMessages.push(
            "No hay cuentas de Facebook o Instagram asociadas"
          );
        }

        post.status = hasError ? "failed" : "published";
        post.errorMessage = errorMessages.join("; ") || "";
      } catch (error: any) {
        console.error(
          `[ERROR] Falló la publicación del post ${post._id}:`,
          error.message
        );
        post.status = "failed";
        post.errorMessage = error.message;
      }
      await post.save();
    }
  } catch (err) {
    console.error("[ERROR] Revisión de posts fallida:", err);
  }
};

export const generateContent = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res
        .status(400)
        .json({ message: "ID de organización no proporcionado" });
    }

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt no proporcionado" });
    }

    const content = await openAIService.generateSocialContent(
      prompt,
      organizationId
    );

    res.status(200).json({
      content,
      message: "Contenido generado exitosamente",
    });
  } catch (err) {
    res.status(500).json({ message: "Error al generar contenido", error: err });
  }
};
