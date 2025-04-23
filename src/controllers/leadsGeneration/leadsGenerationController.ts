import axios from "axios";
import { Request, Response } from "express";
import OrganizationModel from "../../models/OrganizationModel";

export const getGoogleMaps = async (req: Request, res: Response) => {
  console.log("googleMaps");

  try {
    const organizationId = req.user?.organizationId;
    const textQuery = req.query.textQuery as string;
    const limit = parseInt(req.query.limit as string) || 100; // Límite por defecto a 100

    // Verifica si la organización existe y tiene una API Key de Google Maps
    const organization = await OrganizationModel.findOne({
      _id: organizationId,
    }).exec();
    if (!organization) {
      return res.status(400).json({ message: "Organization not found" });
    }

    if (!organization.settings.googleMaps.apiKey) {
      return res.status(400).json({ message: "Google Maps API Key not found" });
    }

    const googleMapsApiURL = process.env.GOOGLE_MAPS_API_URL || "";

    // Dividir textQuery por saltos de línea para manejar múltiples consultas
    const queries = textQuery.split("\n").filter((q) => q.trim() !== "");

    // Dividir el límite entre las consultas
    const queriesCount = queries.length;
    const limitPerQuery = Math.floor(limit / queriesCount);

    let contactsArray: any[] = []; // Array para almacenar los contactos obtenidos

    for (const query of queries) {
      let nextPageToken: string | null = null;
      let hasMorePages = true;

      // Mientras haya más páginas y no se exceda el límite por consulta
      while (hasMorePages && contactsArray.length < limit) {
        const body: any = { textQuery: query };
        if (nextPageToken) {
          body.pageToken = nextPageToken;
        }

        const response = await axios.post(googleMapsApiURL, body, {
          headers: {
            "X-Goog-Api-Key": organization.settings.googleMaps.apiKey,
            "X-Goog-FieldMask":
              "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.internationalPhoneNumber,nextPageToken,places.primaryTypeDisplayName,places.shortFormattedAddress,places.types",
          },
        });

        // Agregar resultados al array de contactos
        contactsArray.push(...response.data.places);

        // Verificar si hay un nextPageToken
        nextPageToken = response.data.nextPageToken || null;

        // Si no hay más token o alcanzamos el límite por consulta, detenemos el ciclo
        if (
          !nextPageToken ||
          contactsArray.length >= limitPerQuery * queriesCount
        ) {
          hasMorePages = false;
        }
      }

      // Si alcanzamos el límite global, detenemos todas las consultas
      if (contactsArray.length >= limit) {
        break;
      }
    }

    // Enviamos la respuesta con el array de contactos, limitado a la cantidad solicitada
    res.status(200).json(contactsArray.slice(0, limit));
  } catch (error) {
    console.error("Error fetching Google Maps data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
