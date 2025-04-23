import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import DealsModel from "../../models/DealsModel";
import DealsFieldsModel from "../../models/DealsFieldsModel";
import DealsFieldsValuesModel from "../../models/DealsFieldsValuesModel";

export const reportsOverview = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: "OrganizationId is required" });
    }

    const organizationObjectId = new Types.ObjectId(organizationId);

    // Rango personalizado para métricas
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: "fromDate and toDate are required" });
    }

    const summaryStartDate = new Date(fromDate as string);
    const summaryEndDate = new Date(toDate as string);

    // Rango extendido para gráfica (13 meses)
    const chartEndDate = new Date();
    const chartStartDate = new Date();
    chartStartDate.setMonth(chartStartDate.getMonth() - 13);

    // 1. Obtener deals para métricas (basado en closingDate)
    const deals = await DealsModel.find({
      organizationId: organizationObjectId,
      closingDate: { $gte: summaryStartDate, $lte: summaryEndDate },
    }).select("_id associatedContactId amount closingDate");

    const dealIds = deals.map((deal) => deal._id);

    // 2. Contactos únicos
    const uniqueContacts = new Set<string>();
    for (const deal of deals) {
      const contactId = deal.associatedContactId?.toString();
      if (contactId && mongoose.isValidObjectId(contactId)) {
        uniqueContacts.add(contactId);
      }
    }

    // 3. Total ventas y ticket promedio
    const totalSales = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const averageTicket = deals.length > 0 ? totalSales / deals.length : 0;

    // 4. Productos vendidos
    const productField = await DealsFieldsModel.findOne({
      key: "cantidad_de_manillas",
    }).select("_id");

    let totalProductsSold = 0;
    if (productField) {
      const values = await DealsFieldsValuesModel.find({
        deal: { $in: dealIds },
        field: productField._id,
      });

      totalProductsSold = values.reduce((sum, val) => {
        const parsed = parseInt(val.value, 10);
        return sum + (isNaN(parsed) ? 0 : parsed);
      }, 0);
    }

    // 5. Ventas por mes (últimos 13 meses)
    const monthlySales = await DealsModel.aggregate([
      {
        $match: {
          organizationId: organizationObjectId,
          closingDate: { $gte: chartStartDate, $lte: chartEndDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$closingDate" },
            month: { $month: "$closingDate" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const months: { year: number; month: number }[] = [];
    const tempDate = new Date(chartStartDate);
    while (tempDate <= chartEndDate) {
      months.push({
        year: tempDate.getFullYear(),
        month: tempDate.getMonth() + 1,
      });
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    const salesMap = new Map<string, number>();
    monthlySales.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      salesMap.set(key, item.total);
    });

    const salesByMonth = months.map(({ year, month }) => {
      const key = `${year}-${month}`;
      return {
        month: `${monthNames[month - 1]} ${year}`,
        ventas: salesMap.get(key) || 0,
      };
    });

    // 6. Top clientes (últimos 3 meses)
    const topCustomerStartDate = new Date();
    topCustomerStartDate.setMonth(topCustomerStartDate.getMonth() - 3);

    const topCustomers = await DealsModel.aggregate([
      {
        $match: {
          organizationId: organizationObjectId,
          closingDate: { $gte: topCustomerStartDate, $lte: summaryEndDate },
        },
      },
      {
        $group: {
          _id: "$associatedContactId",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "contacts",
          localField: "_id",
          foreignField: "_id",
          as: "contact",
        },
      },
      { $unwind: "$contact" },
      {
        $project: {
          _id: 1,
          total: 1,
          count: 1,
          contactProperties: "$contact.properties",
        },
      },
    ]);

    const topCustomersWithDetails = topCustomers.map((customer) =>
      customer.contactProperties.reduce(
        (acc: any, prop: any) => {
          acc[prop.key] = prop.value;
          return acc;
        },
        { total: customer.total, count: customer.count }
      )
    );

    // 7. Respuesta final
    return res.status(200).json({
      summary: {
        totalSales,
        averageTicket,
        products: totalProductsSold,
        newCustomers: uniqueContacts.size,
        fromDate: summaryStartDate.toISOString(),
        toDate: summaryEndDate.toISOString(),
      },
      salesByMonth,
      topCustomersWithDetails,
    });
  } catch (error) {
    console.error("Error in reportsOverview:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: (error as Error).message,
    });
  }
};
