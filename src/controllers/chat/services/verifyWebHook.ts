import { Request, Response } from "express";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  } else {
    res.status(400).json({ error: "Bad Request" });
  }
};
