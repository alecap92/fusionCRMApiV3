// controllers/social/socialAccountController.ts
import { Request, Response } from "express";
import SocialAccount from "../../models/SocialAccount";
import axios from "axios";

export const getSocialAccounts = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organizationId } : {};
    const accounts = await SocialAccount.find(filter);
    res.status(200).json(accounts);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener cuentas sociales", error: err });
  }
};

export const getSocialAccount = async (req: Request, res: Response) => {
  try {
    const account = await SocialAccount.findById(req.params.id);
    if (!account)
      return res.status(404).json({ message: "Cuenta no encontrada" });
    res.status(200).json(account);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al obtener cuenta social", error: err });
  }
};

export const createSocialAccount = async (req: Request, res: Response) => {
  try {
    const newAccount = new SocialAccount(req.body);
    const saved = await newAccount.save();
    res.status(201).json(saved);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error al crear cuenta social", error: err });
  }
};

export const updateSocialAccount = async (req: Request, res: Response) => {
  try {
    const updated = await SocialAccount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Cuenta no encontrada" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar cuenta", error: err });
  }
};

export const deleteSocialAccount = async (req: Request, res: Response) => {
  try {
    const deleted = await SocialAccount.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Cuenta no encontrada" });
    res.status(200).json({ message: "Cuenta eliminada" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar cuenta", error: err });
  }
};

export const callbackSocialAccount = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  const organizationId = state;

  console.log("state de autorización:", state);

  if (!code) {
    return res.status(400).json({ message: "Falta el código de autorización" });
  }

  try {
    // Paso 1: Obtener access_token corto
    const { data: tokenResponse } = await axios.get(
      "https://graph.facebook.com/v22.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
          code,
        },
      }
    );

    const shortToken = tokenResponse.access_token;
    if (!shortToken) {
      return res
        .status(400)
        .json({ message: "No se pudo obtener el token de acceso." });
    }

    // Paso 2: Intercambiar por token de larga duración
    const { data: longTokenResponse } = await axios.get(
      "https://graph.facebook.com/v22.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: shortToken,
        },
      }
    );

    const { access_token: longLivedToken, expires_in } = longTokenResponse;

    // Paso 3: Obtener información del usuario

    const { data: userInfo } = await axios.get(
      "https://graph.facebook.com/me",
      {
        params: {
          access_token: longLivedToken,
          fields: "id,name,email,picture",
        },
      }
    );

    // Paso 4: Guardar en la base de datos
    await SocialAccount.findOneAndUpdate(
      {
        platform: "facebook",
        organizationId,
        accountId: userInfo.id, // clave para identificar la cuenta
      },
      {
        accessToken: longLivedToken,
        expiresIn: expires_in,
        username: userInfo.name,
        picture: userInfo.picture.data.url,
      },
      {
        upsert: true, // crea si no existe
        new: true, // devuelve el documento actualizado
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      message: "Cuenta social de Facebook conectada con éxito",
      expires_in,
    });
  } catch (err: any) {
    console.error(
      "Error al conectar cuenta social:",
      err.response?.data || err.message
    );
    return res
      .status(500)
      .json({ message: "Ocurrió un error al conectar con Facebook" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  const account = await SocialAccount.findOne({
    organizationId,
    platform: "facebook",
  });

  if (!account) {
    return res.status(404).json({ message: "Cuenta no encontrada" });
  }

  const accessToken = account.accessToken;

  if (!accessToken) {
    return res.status(400).json({ message: "Falta el access token" });
  }
  try {
    const { data: userInfo } = await axios.get(
      "https://graph.facebook.com/me",
      {
        params: {
          access_token: accessToken,
          fields: "id,name,email,picture",
        },
      }
    );

    return res.status(200).json({
      message: "Información del usuario obtenida con éxito",
      userInfo,
    });
  } catch (err) {
    console.error("Error al obtener información del usuario:", err);
    return res.status(500).json({
      message: "Ocurrió un error al obtener la información del usuario",
    });
  }
};

export const getInstagramAccounts = async (req: Request, res: Response) => {
  const organizationId = req.user?.organizationId;

  const account = await SocialAccount.findOne({
    organizationId,
    platform: "facebook",
  });

  if (!account) {
    return res.status(404).json({ message: "Cuenta no encontrada" });
  }

  const accessToken = account.accessToken;

  if (!accessToken) {
    return res.status(400).json({ message: "Falta el access token" });
  }
  try {
    const { data: userInfo } = await axios.get(
      "https://graph.facebook.com/me/accounts",
      {
        params: {
          access_token: accessToken,
          fields: "id,name,instagram_business_account,access_token",
        },
      }
    );

    return res.status(200).json(userInfo);
  } catch (err) {
    console.error("Error al obtener cuentas de Instagram:", err);
    return res.status(500).json({
      message: "Ocurrió un error al obtener las cuentas de Instagram",
    });
  }
};
