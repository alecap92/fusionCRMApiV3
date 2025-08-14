import { Request, Response } from "express";
import ProductModel from "../../models/ProductModel";
import ProductVariantModel from "../../models/ProductVariantModel";

// Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if ( !organizationId)
      return res
        .status(400)
        .json({ message: "Missing user or organization ID" });

    const products = await ProductModel.find({
      organizationId,
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    const totalProducts = await ProductModel.countDocuments({
      organizationId,
    });
    const totalPages = Math.ceil(totalProducts / limit);
    res.status(200).json({
      totalProducts,
      totalPages,
      currentPage: page,
      products,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single product by ID
export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error getProduct" });
  }
};

// Create a new product
export const createProduct = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;

  if (!userId || !organizationId)
    return res.status(400).json({ message: "Missing user or organization ID" });

  try {
    // 1. Extraer los datos del producto y las variantes
    const { attributes, variants, ...productData } = req.body;
    
    // 2. Crear y guardar el producto base
    const newProduct = new ProductModel({
      ...productData,
      userId,
      organizationId,
    });
    
    await newProduct.save();
    
    // 3. Si el producto tiene variantes, crearlas automáticamente
    if (newProduct.hasVariants && attributes && attributes.length > 0) {
      // Crear variantes directamente desde los atributos proporcionados
      const variantsToInsert = attributes.map((attr: any) => ({
        organizationId,
        productId: newProduct._id,
        attributeValues: [{
          attributeName: attr.attributeName,
          valueId: attr.id,
          value: attr.value,
          displayName: `${attr.attributeName}: ${attr.value}`,
          price: attr.price,
          imageUrl: attr.imageUrl
        }],
        sku: `${newProduct._id}-${attr.id}`,
        price: attr.price || newProduct.unitPrice,
        imageUrl: attr.imageUrl || newProduct.imageUrl,
        isActive: true,
        userId
      }));
      
      // Insertar todas las variantes
      if (variantsToInsert.length > 0) {
        await ProductVariantModel.insertMany(variantsToInsert);
      }
    }
    
    // 4. Devolver el producto creado
    res.status(201).json(newProduct);
  } catch (error:any) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Update a product by ID
export const updateProduct = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const organizationId = req.user?.organizationId;

  if (!userId || !organizationId)
    return res.status(400).json({ message: "Missing user or organization ID" });

  try {
    // 1. Extraer los datos del producto y las variantes
    const { attributes, variants, ...productData } = req.body;
    
    // 2. Actualizar el producto base
    const updatedProduct = await ProductModel.findOneAndUpdate(
      { _id: req.params.id, organizationId },
      productData,
      { new: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    
    // 3. Si el producto tiene variantes, actualizarlas
    if (updatedProduct.hasVariants && attributes && attributes.length > 0) {
      // Eliminar variantes existentes para este producto
      await ProductVariantModel.deleteMany({ 
        productId: updatedProduct._id,
        organizationId 
      });
      
      // Crear nuevas variantes desde los atributos proporcionados
      const variantsToInsert = attributes.map((attr: any) => ({
        organizationId,
        productId: updatedProduct._id,
        attributeValues: [{
          attributeName: attr.attributeName,
          valueId: attr.id,
          value: attr.value,
          displayName: `${attr.attributeName}: ${attr.value}`,
          price: attr.price || updatedProduct.unitPrice,
          imageUrl: attr.imageUrl || updatedProduct.imageUrl
        }],
        sku: `${updatedProduct._id}-${attr.id}`,
        price: attr.price || updatedProduct.unitPrice,
        imageUrl: attr.imageUrl || updatedProduct.imageUrl,
        isActive: true,
        userId
      }));
      
      // Insertar todas las variantes nuevas
      if (variantsToInsert.length > 0) {
        await ProductVariantModel.insertMany(variantsToInsert);
      }
    }
    
    // 4. Devolver el producto actualizado
    res.status(200).json(updatedProduct);
  } catch (error: any) {
    console.error("Error actualizando producto:", error);
    res.status(500).json({ message: "Error del servidor", error: error.message });
  }
};

// Delete a product by ID
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const deletedProduct = await ProductModel.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const organizationId = req.user?.organizationId;
    const searchValue = req.query.term as string;

    if (!userId || !organizationId)
      return res
        .status(400)
        .json({ message: "Missing user or organization ID" });

    const products = await ProductModel.find({
      userId,
      organizationId,
      $or: [
        { name: { $regex: searchValue, $options: "i" } },
        { description: { $regex: searchValue, $options: "i" } },
      ],
    });

    return res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
