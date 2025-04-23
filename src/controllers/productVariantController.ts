import { Request, Response } from 'express';
import ProductVariantModel from '../models/ProductVariantModel';
import { Types } from 'mongoose';

export const productVariantController = {
  // Listar variantes de un producto
  async getProductVariants(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { organizationId } = req.user as any;

      const variants = await ProductVariantModel.find({
        productId: new Types.ObjectId(productId),
        organizationId: new Types.ObjectId(organizationId)
      });

      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener las variantes del producto' });
    }
  },

  // Crear nueva variante
  async createVariant(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user as any;
      const { productId, attributeValues, sku, price, imageUrl, stock } = req.body;

      const variant = new ProductVariantModel({
        organizationId: new Types.ObjectId(organizationId),
        productId: new Types.ObjectId(productId),
        attributeValues,
        sku,
        price,
        imageUrl,
        stock,
        userId: new Types.ObjectId(userId)
      });

      await variant.save();
      res.status(201).json(variant);
    } catch (error) {
      res.status(500).json({ error: 'Error al crear la variante' });
    }
  },

  // Crear varias variantes en lote
  async createVariantBulk(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user as any;
      const { productId } = req.params;
      const { variants } = req.body;
  
      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de variantes' });
      }
  
      // Preparar todas las variantes para inserción
      const variantsToInsert = variants.map(variant => ({
        organizationId: new Types.ObjectId(organizationId),
        productId: new Types.ObjectId(productId),
        attributeValues: variant.attributeValues,
        sku: variant.sku,
        price: variant.price,
        imageUrl: variant.imageUrl || null,
        stock: variant.stock || 0,
        isActive: variant.isActive !== undefined ? variant.isActive : true,
        userId: new Types.ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date()
      }));
  
      // Insertar todas las variantes en una sola operación
      const result = await ProductVariantModel.insertMany(variantsToInsert);
  
      res.status(201).json({
        success: true,
        message: `${result.length} variantes creadas correctamente`,
        variants: result
      });
    } catch (error:any) {
      console.error('Error al crear variantes en lote:', error);
      
      // Manejar error de SKU duplicado
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'Error de duplicación', 
          message: 'Una o más variantes tienen SKUs duplicados' 
        });
      }
      
      res.status(500).json({ 
        error: 'Error al crear las variantes en lote',
        message: error.message 
      });
    }
  },

  // Actualizar variante existente
  async updateVariant(req: Request, res: Response) {
    try {
      const { variantId } = req.params;
      const { organizationId } = req.user as any;
      const updateData = req.body;

      const variant = await ProductVariantModel.findOneAndUpdate(
        {
          _id: new Types.ObjectId(variantId),
          organizationId: new Types.ObjectId(organizationId)
        },
        { $set: updateData },
        { new: true }
      );

      if (!variant) {
        return res.status(404).json({ error: 'Variante no encontrada' });
      }

      res.json(variant);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar la variante' });
    }
  },

  // Eliminar variante
  async deleteVariant(req: Request, res: Response) {
    try {
      const { variantId } = req.params;
      const { organizationId } = req.user as any;

      const result = await ProductVariantModel.findOneAndDelete({
        _id: new Types.ObjectId(variantId),
        organizationId: new Types.ObjectId(organizationId)
      });

      if (!result) {
        return res.status(404).json({ error: 'Variante no encontrada' });
      }

      res.json({ message: 'Variante eliminada correctamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar la variante' });
    }
  }
}; 