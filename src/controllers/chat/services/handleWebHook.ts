import { Request, Response } from "express";
import OrganizationModel from "../../../models/OrganizationModel";
import MessageModel from "../../../models/MessageModel";
import { getMedia } from "./getMedia";
import { emitNewNotification } from "../../notifications/notificationController";
import { subirArchivo } from "../../../config/aws";
import {Expo} from 'expo-server-sdk';
import { sendNotification } from "./pushNotificationService";



export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    for (const entry of body.entry || []) {
      const { changes } = entry;

      for (const change of changes || []) {
        const value = change.value;

        if (!value.messages) continue;

        const message = value.messages[0];
        const { from, timestamp, type } = message;
        const to = value.metadata?.display_phone_number;

        if (!to) {
          console.error("No display_phone_number in metadata");
          continue;
        }

        const organization = await OrganizationModel.findOne({
          "settings.whatsapp.phoneNumber": to,
        });

        if (!organization) {
          console.error(`Organization with WhatsApp number ${to} not found.`);
          res.status(400).send("Organization not found");
          return;
        }

        const accessToken = organization.settings.whatsapp.accessToken as string;
        const systemUserId = organization.employees[0];

        if (!systemUserId) {
          console.error("No system user found.");
          res.status(500).send("System user not found");
          return;
        }

        let text = "";
        let awsUrl: string | null = null;

        if (type === "reaction") {
          await handleReaction(message, timestamp);
          continue;
        }

        if (type === "text") {
          text = message.text.body;
        } else if (["image", "document", "audio", "video", "sticker"].includes(type)) {
          text = `${capitalizeFirstLetter(type)} recibido`;

          const mediaObject = message[type];

          if (mediaObject?.id) {
            const mediaBuffer = await getMedia(mediaObject.id, accessToken);
            awsUrl = await subirArchivo(mediaBuffer, mediaObject.id, mediaObject.mime_type);
          }
        } else {
          text = "Otro tipo de mensaje recibido";
        }

        const repliedMessageId = message.context?.id;
        const originalMessage = repliedMessageId
            ? await MessageModel.findOne({ messageId: repliedMessageId })
            : null;

        await MessageModel.create({
          user: systemUserId,
          organization: organization._id,
          from,
          to,
          message: text,
          mediaUrl: awsUrl,
          mediaId: message[type]?.id || "",
          timestamp: new Date(parseInt(timestamp) * 1000),
          type,
          direction: "incoming",
          possibleName: value.contacts?.[0]?.profile?.name || "",
          replyToMessage: originalMessage?._id || null,
          messageId: message.id,
        });


        const toTokens = ["ExponentPushToken[I5cjWVDWDbnjGPUqFdP2dL]"]
        try{
          await sendNotification(toTokens, {
            title: value.contacts?.[0]?.profile?.name || "",
            body: text
          });

        }catch(error){
          console.log(error, "Error sending push notification")
        }


        emitNewNotification("whatsapp", organization._id, 1, from, {
          message: text,
          timestamp: new Date(parseInt(timestamp) * 1000),
        });
      }
    }

    res.status(200).send("Mensaje recibido");
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Error handling webhook" });
  }
};

const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const handleReaction = async (message: any, timestamp: string): Promise<void> => {
  const { reaction } = message;
  const emoji = reaction.emoji;
  const messageIdReactedTo = reaction.message_id;

  const originalMessage = await MessageModel.findOne({ messageId: messageIdReactedTo });

  if (!originalMessage) {
    console.error(`Mensaje original con ID ${messageIdReactedTo} no encontrado.`);
    return;
  }

  const reactionData = {
    reaction: emoji,
    user: message.from,
    timestamp: new Date(parseInt(timestamp) * 1000),
  };

  originalMessage.reactions = originalMessage.reactions || [];
  originalMessage.reactions.push(reactionData);
  await originalMessage.save();
};
