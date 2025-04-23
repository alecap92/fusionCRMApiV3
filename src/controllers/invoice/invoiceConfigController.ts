import { Request, Response } from "express";
import InvoiceConfiguration from "../../models/InvoiceConfiguration";
import {  certificateUpload, changeEnvironment, configResolution, createConfiguration, getTechnicalKey, softwareConfiguration } from "../../services/invoice/invoiceService"

export const getInvoiceConfig = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    console.log("Organization ID:", organizationId);
    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const invoiceConfig = await InvoiceConfiguration.findOne({
      organizationId,
    });

    if (!invoiceConfig) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    res.status(200).json(invoiceConfig);
  } catch (error) {
    console.error("Error fetching invoice configuration:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateInvoiceConfig = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const response = await InvoiceConfiguration.findOneAndUpdate(
      { organizationId },
      { $set: req.body },
      { new: true }
    );

    if (!response) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    res.status(200).json({
      message: "Invoice configuration updated successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error updating invoice configuration:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createInvoiceConfig = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    // Verificar si ya existe una configuración para esta organización
    const existingConfig = await InvoiceConfiguration.findOne({
      organizationId,
    });
    if (existingConfig) {
      return res.status(400).json({
        message: "Invoice configuration already exists for this organization",
      });
    }

    // Asegurarnos de que el body tenga todos los campos requeridos
    const configData = {
      _id: req.body._id || `inv_${Date.now()}`,
      organizationId,
      token: req.body.token || "default_token",
      nextInvoiceNumber: req.body.nextInvoiceNumber || "1",

      // Configuración de resolución
      resolutionNumber: {
        type_document_id: req.body.resolutionNumber?.type_document_id || "01",
        prefix: req.body.resolutionNumber?.prefix || "FE",
        resolution: req.body.resolutionNumber?.resolution || "0",
        resolution_date:
          req.body.resolutionNumber?.resolution_date ||
          new Date().toISOString().split("T")[0],
        from: req.body.resolutionNumber?.from || "1",
        to: req.body.resolutionNumber?.to || "1000",
        date_from:
          req.body.resolutionNumber?.date_from ||
          new Date().toISOString().split("T")[0],
        date_to:
          req.body.resolutionNumber?.date_to ||
          new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            .toISOString()
            .split("T")[0],
        technical_key: req.body.resolutionNumber?.technical_key || "0",
      },

      // Información de la empresa
      companyInfo: {
        email: req.body.companyInfo?.email || "ejemplo@empresa.com",
        address: req.body.companyInfo?.address || "Dirección predeterminada",
        phone: req.body.companyInfo?.phone || "3001234567",
        municipality_id: req.body.companyInfo?.municipality_id || "11001",
        type_document_identification_id:
          req.body.companyInfo?.type_document_identification_id || "31",
        type_organization_id: req.body.companyInfo?.type_organization_id || "1",
        type_regime_id: req.body.companyInfo?.type_regime_id || "48",
        type_liability_id: req.body.companyInfo?.type_liability_id || "O-13",
        business_name:
          req.body.companyInfo?.business_name || "Nombre de la empresa",
        nit: req.body.companyInfo?.nit || "900123456",
        dv: req.body.companyInfo?.dv || "7",
      },

      // Placeholders
      placeholders: {
        paymentTerms: req.body.placeholders?.paymentTerms || "30 días",
        currency: req.body.placeholders?.currency || "COP",
        notes: req.body.placeholders?.notes || "Gracias por su compra",
        logoImg:
          req.body.placeholders?.logoImg || "https://via.placeholder.com/150",
        foot_note:
          req.body.placeholders?.foot_note || "Pie de página predeterminado",
        head_note:
          req.body.placeholders?.head_note || "Encabezado predeterminado",
      },

      // Configuración de email
      email: {
        mail_username: req.body.email?.mail_username || "ejemplo@empresa.com",
        mail_password: req.body.email?.mail_password || "password_placeholder",
        mail_host: req.body.email?.mail_host || "smtp.example.com",
        mail_port: req.body.email?.mail_port || 587,
        mail_encryption: req.body.email?.mail_encryption || "tls",
      },

      software: {
        id: req.body.software?.id || "1",
        pin: req.body.software?.pin || "1234",
      },
      certificado: {
        certificate:
          req.body.certificado?.certificate || "certificado_placeholder.p12",
        password: req.body.certificado?.password || "password_placeholder",
      },
      status: req.body?.status || false,
    };

    const response = await InvoiceConfiguration.create(configData);

    res.status(201).json({
      message: "Invoice configuration created successfully",
      data: response,
    });
  } catch (error: any) {
    console.error("Error creating invoice configuration:", error);

    // Si es un error de validación de Mongoose, enviar detalles al cliente
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
      });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCompanyInfo = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const response = await InvoiceConfiguration.findOneAndUpdate(
      { organizationId },
      { $set: { companyInfo: req.body } },
      { new: true }
    );

    if (!response) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    res.status(200).json({
      message: "Company information updated successfully",
      data: response.companyInfo,
    });
  } catch (error) {
    console.error("Error updating company information:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEmailSettings = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const response = await InvoiceConfiguration.findOneAndUpdate(
      { organizationId },
      { $set: { email: req.body } },
      { new: true }
    );

    if (!response) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    res.status(200).json({
      message: "Email settings updated successfully",
      data: response.email,
    });
  } catch (error) {
    console.error("Error updating email settings:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePlaceholders = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const response = await InvoiceConfiguration.findOneAndUpdate(
      { organizationId },
      { $set: { placeholders: req.body } },
      { new: true }
    );

    if (!response) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    res.status(200).json({
      message: "Placeholders updated successfully",
      data: response.placeholders,
    });
  } catch (error) {
    console.error("Error updating placeholders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateResolutionNumber = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const response = await InvoiceConfiguration.findOneAndUpdate(
      { organizationId },
      { $set: { resolutionNumber: req.body } },
      { new: true }
    );

    if (!response) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    res.status(200).json({
      message: "Resolution number updated successfully",
      data: response.resolutionNumber,
    });
  } catch (error) {
    console.error("Error updating resolution number:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getNextInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const config = await InvoiceConfiguration.findOne({ organizationId });

    if (!config) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    // Aquí puedes implementar tu lógica para calcular el siguiente número
    // Por ejemplo, podrías incrementar el último número utilizado
    const nextNumber = config.nextInvoiceNumber || "1";

    res.status(200).json({
      nextNumber,
    });
  } catch (error) {
    console.error("Error getting next invoice number:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const checkResolutionStatus = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const config = await InvoiceConfiguration.findOne({ organizationId });

    if (!config) {
      return res
        .status(404)
        .json({ message: "Invoice configuration not found" });
    }

    // Verifica si la resolución sigue vigente
    const resolutionNumber = config.resolutionNumber;
    const currentDate = new Date();
    const dateFrom = resolutionNumber?.date_from
      ? new Date(resolutionNumber.date_from)
      : null;
    const dateTo = resolutionNumber?.date_to
      ? new Date(resolutionNumber.date_to)
      : null;

    let valid = false;
    let message = "Invalid resolution";
    let expiresIn = 0;

    if (
      dateFrom &&
      dateTo &&
      currentDate >= dateFrom &&
      currentDate <= dateTo
    ) {
      valid = true;
      message = "Resolution is valid";
      // Calcular días restantes hasta expiración
      const diffTime = Math.abs(dateTo.getTime() - currentDate.getTime());
      expiresIn = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // en días
    } else if (dateFrom && dateTo && currentDate > dateTo) {
      message = "Resolution has expired";
    } else if (dateFrom && dateTo && currentDate < dateFrom) {
      message = "Resolution is not yet valid";
      // Calcular días hasta que la resolución sea válida
      const diffTime = Math.abs(dateFrom.getTime() - currentDate.getTime());
      expiresIn = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // en días
    }

    res.status(200).json({
      valid,
      message,
      expiresIn,
      resolutionNumber,
    });
  } catch (error) {
    console.error("Error checking resolution status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const certificateConfiguration = async (req: Request, res: Response) => {
  try {
    // parse from .p12 to string(base64)
    const { file } = req;
    const { password, token, organizationId } = req.body;

   
    // importante, enviar el password y el token

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const base64 = file.buffer.toString("base64");


    const response = await InvoiceConfiguration.updateOne(
      {
        organizationId,
      },
      {
        $set: {
          certificado: {
            certificate: base64,
            password,
          },
        },
      }
    );


    res.status(200).json({
      message: "File parsed successfully",
      data: response,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Para ver documentacion, revisa el servicio de invoiceService.ts
export const createCompany = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const configStatus:any = [];

    const executeStep = async (
      stepFunction: Function, 
      stepName: string
    ) => {
      try {
        await stepFunction(organizationId);
        configStatus.push({
          step: stepName,
          message: `${stepName} completed successfully`,
          status: true,
        });
      } catch (error: any) {
        configStatus.push({
          step: stepName,
          message: error.message || `Error in ${stepName}`,
          status: false,
        });
        throw new Error(`Failed at ${stepName}: ${error.message}`);
      }
    };

    // Ejecutar pasos en secuencia
    await executeStep(createConfiguration, "Company Creation");
    await executeStep(softwareConfiguration, "Software Configuration");
    await executeStep(certificateUpload, "Certificate Configuration");
    await executeStep(configResolution, "Resolution Configuration");

    // pasar a produccion
    await executeStep(changeEnvironment, "Change Environment");
    // Obtener y actualizar el technical_key
    await executeStep(getTechnicalKey, "Get Technical Key");

    // Verificar si todos los pasos fueron exitosos
    const allStepsSuccessful = configStatus.every((step: any) => step.status);

    if (!allStepsSuccessful) {
      return res.status(500).json({
        message: "Company creation process failed",
        status: false,
        configStatus,
      });
    }

    return res.status(200).json({
      message: "Company created successfully",
      status: true,
      configStatus,
    });

  } catch (error: any) {
    console.error("Error creating company:", error);
    console.log(error);
    return res.status(500).json({
      message: error.message || "Internal server error",
      status: false,
    });
  }
};

