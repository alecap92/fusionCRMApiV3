import Bull from "bull";
import Email from "../models/EmailModel";
import { simpleParser } from "mailparser";
import mongoose from "mongoose";
import { Readable } from "stream";
import Imap from "imap"; // Importa la clase Imap para manejar la conexión

// Crear una cola para el procesamiento de correos electrónicos
const emailProcessingQueue = new Bull<any>("email-processing");

// Procesar el trabajo en la cola
emailProcessingQueue.process(async (job) => {
  const { results, imapConfig, userId } = job.data;

  console.log(
    `Job started for userId: ${userId}, processing ${results.length} emails`
  );

  const imapConnection = new Imap(imapConfig); // Renombrado a imapConnection

  imapConnection.once("ready", () => {
    console.log("IMAP connection ready");

    for (const uid of results) {
      console.log(`Fetching email with UID: ${uid}`);

      const fetch = imapConnection.fetch(uid.toString(), {
        bodies: "",
        struct: true,
      });

      fetch.on("message", (msg: any) => {
        console.log(`Processing message with UID: ${uid}`);

        let emailData: Partial<any> = {
          userId: new mongoose.Types.ObjectId(userId),
          attachments: [],
        };

        msg.on("body", (stream: Readable) => {
          console.log(`Reading body of message UID: ${uid}`);

          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.error("Error parsing email body:", err);
              return;
            }

            console.log(`Email body parsed for UID: ${uid}`);

            let toText = "";
            if (Array.isArray(parsed.to)) {
              toText = parsed.to.map((addr) => addr.text).join(", ");
            } else if (parsed.to && "text" in parsed.to) {
              toText = (parsed.to as any).text;
            }

            emailData = {
              userId: new mongoose.Types.ObjectId(userId),
              from: parsed.from?.text || "",
              to: toText.split(", "),
              subject: parsed.subject || "",
              body: parsed.text || "",
              htmlBody: parsed.html || "",
              date: parsed.date || new Date(),
              attachments:
                parsed.attachments?.map((attachment) => ({
                  filename: attachment.filename,
                  contentType: attachment.contentType,
                  content: attachment.content.toString("base64"),
                })) || [],
              uid,
              flags: msg.flags || [],
            };

            console.log(`Saving email to database with UID: ${uid}`);
            // Guardar el correo en la base de datos
            const email = new Email(emailData);
            await email.save();
            console.log(`Email UID: ${uid} saved successfully`);
          });
        });

        msg.once("attributes", (attrs: any) => {
          emailData.uid = attrs.uid;
          emailData.modseq = attrs.modseq;
          console.log(`Attributes received for UID: ${attrs.uid}`);
        });
      });

      fetch.once("end", () => {
        console.log(`Finished processing message with UID: ${uid}`);
      });

      fetch.once("error", (err: any) => {
        console.error(`Error fetching message with UID: ${uid}`, err);
      });
    }

    imapConnection.once("end", () => {
      console.log("IMAP connection ended");
    });

    console.log("Ending IMAP connection after processing all messages");
    imapConnection.end(); // Cerrar la conexión después de procesar los correos
  });

  imapConnection.once("error", (err: any) => {
    console.error("IMAP connection error", err);
  });

  console.log("Connecting to IMAP server...");
  imapConnection.connect(); // Conectar al servidor IMAP
});

export default emailProcessingQueue;
