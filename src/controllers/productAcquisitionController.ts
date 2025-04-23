import { Request, Response } from 'express';
import ProductAcquisitionModel from '../models/ProductAcquisitionModel';
import { Types } from 'mongoose';

export const productAcquisitionController = {
  // Registrar nueva adquisición
  async createAcquisition(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user as any;
      const {
        clientId,
        productId,
        variantId,
        dealId,
        quotationId,
        invoiceId,
        quantity,
        priceAtAcquisition,
        acquisitionDate,
        notes,
        tags
      } = req.body;

      // Convertir variantId a ObjectId solo si no es un string vacío
      const processedVariantId = variantId && variantId !== "" 
        ? new Types.ObjectId(variantId)
        : "";

      const acquisition = new ProductAcquisitionModel({
        organizationId: new Types.ObjectId(organizationId),
        clientId: new Types.ObjectId(clientId),
        productId: new Types.ObjectId(productId),
        variantId: processedVariantId,
        dealId: dealId ? new Types.ObjectId(dealId) : undefined,
        quotationId: quotationId ? new Types.ObjectId(quotationId) : undefined,
        invoiceId: invoiceId ? new Types.ObjectId(invoiceId) : undefined,
        quantity,
        priceAtAcquisition,
        acquisitionDate: new Date(acquisitionDate),
        notes,
        tags,
        userId: new Types.ObjectId(userId)
      });

      await acquisition.save();
      res.status(201).json(acquisition);
    } catch (error) {
      console.error('Error al registrar la adquisición:', error);
      res.status(500).json({ error: 'Error al registrar la adquisición' });
    }
  },

  // Listar adquisiciones por cliente
  async getClientAcquisitions(req: Request, res: Response) {
    try {
      const { clientId, organizationId } = req.params;
      const { startDate, endDate, status } = req.query;

      const query: any = {
        clientId,
        organizationId
      };

      if (startDate && endDate) {
        query.acquisitionDate = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      if (status) {
        query.status = status;
      }

      console.log(query);

      const acquisitions = await ProductAcquisitionModel.find(query)
        .populate('productId')
        .populate('variantId')
        .sort({ acquisitionDate: -1 });

      console.log(acquisitions);

      res.json(acquisitions);
    } catch (error) {
      console.error('Error al obtener las adquisiciones del cliente:', error);
      res.status(500).json({ error: 'Error al obtener las adquisiciones del cliente' });
    }
  },

  // Obtener estadísticas de adquisiciones
  async getAcquisitionStats(req: Request, res: Response) {
    try {
      const { organizationId } = req.user as any;
      const { startDate, endDate } = req.query;

      const matchStage: any = {
        organizationId: new Types.ObjectId(organizationId)
      };

      if (startDate && endDate) {
        matchStage.acquisitionDate = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      // Productos más vendidos
      const topProducts = await ProductAcquisitionModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$productId',
            totalQuantity: { $sum: '$quantity' },
            totalRevenue: { $sum: { $multiply: ['$quantity', '$priceAtAcquisition'] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }
      ]);

      // Tendencias temporales
      const temporalTrends = await ProductAcquisitionModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$acquisitionDate' },
              month: { $month: '$acquisitionDate' }
            },
            totalQuantity: { $sum: '$quantity' },
            totalRevenue: { $sum: { $multiply: ['$quantity', '$priceAtAcquisition'] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Desglose por variante (solo para adquisiciones con variante)
      const variantBreakdown = await ProductAcquisitionModel.aggregate([
        { 
          $match: { 
            ...matchStage, 
            variantId: { $ne: "" } // Solo incluir adquisiciones con variante
          } 
        },
        {
          $group: {
            _id: '$variantId',
            totalQuantity: { $sum: '$quantity' }
          }
        },
        { $sort: { totalQuantity: -1 } }
      ]);

      res.json({
        topProducts,
        temporalTrends,
        variantBreakdown
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de adquisiciones:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas de adquisiciones' });
    }
  }
}; 