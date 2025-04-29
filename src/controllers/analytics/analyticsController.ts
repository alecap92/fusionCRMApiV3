import { Request, Response } from "express";
import { runAnalyticsReport } from "../../services/analytics/googleAnalyticsService";
import { GoogleAnalyticsCredentials } from "../../services/analytics/googleAnalyticsService";

const credentials: GoogleAnalyticsCredentials = {
  type: "service_account",
  project_id: "fusioncrm-project",
  private_key_id: "041cdf68999efaf22097e7d4c9d40adb9467c1cc",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4ouKg3r2xvT8I\nt4VkIRHHUJERmkCG4I0BEDLPl706WOTZGOE/6L7lfjTI/EAQkqjIOS5QZivoLyl3\n5aU7NChjGvlyPUt2d5iUwcIKI9c/kde42a8Sf0ZriYirRE4XPMpkEcN5gXDI+DI2\nDAZGhPuW/QReiEBlxy7S9MvvwC7SMv0TLbgD3LXWSWIsSSLD8zwDprQeclaE/qUp\nkDpb1cRTDEGCrM/eEFlk/qRIrDvNlqbzoSmkUfL2B2ZkzZxFY80hGRobkkKdTKZZ\nF8GNmSPjoUyP/TYXq5Q2N5nJJXgmuDcSOBQGX1zc0Cmn+In3QcRYGdH7x3JhHgPT\nGDAMaecdAgMBAAECggEAIMsNZXUqS/9IysuNrZMSDUyJ945mF46afK3b2HMi8NIJ\nE2YP28IC5c/coDXtSwRBZg6B41XCRqLZwqnPBwzkf3WzCE9Kr+fd+c3QIOzstiW5\nIuPG7Ioef8sVsxWWqRnq+IsPJO2QkqFCicbo9m14IgEeXYvlpC4UavN/pT2FE2Ad\nxs2fwKyRJY6cTxTNle1BfcfkLlX86X2UbanEk0iY8SgcbSCfz6bex7v8DrFKNsEa\nk2peKaB4OxJBIt3B2/XbctVkIiXeTvEkZs84vcYalazoV1WvEZWmUzpwHFv8tULZ\ntlnEx4fsvOgbANCRBnTMM/1334DyzvV1nO/QlZ/9AQKBgQDcBGW+f0i7JHF51NPX\n3AimpbyXpCTXRokJNtYa76AUFZ0AkusfD2nupAFKNQ39IIeb28yozw8ByQkxMQ7M\ndN35/3LDS78esmHcxCpi+9w32xDvm9e/Fu6icUS7CpsRTA7FmzMjvOa5NPjHmOyk\n9egAlm7Cv9Ic8EBFi0T7DB1cZQKBgQDW1SwegPbSATMumC51xsa0Fyd5EFYMAu9o\nrUS32x4E1LlhMfoPdaagn6zckacytfWAhmQKKIN5GnbQReRcLk7EVj0ljq5blh+s\nYD1vLJhRS28nMnls/Xefwnf8rnCDroJn7/4vEh79SAVOgjZBv/JtLJsjtd7DDoHM\np8WJr+EoWQKBgQCZcsezUPrc6tHp8rG9P00ZTUZ3TJgVPLCeqIwzRSUUXO6fU9iA\nVTPAqMntg4s6G9H4thfLNH529Etg76IunuOiVLMp2k51jlwKqRYW6ynwGu147+xM\n7iWJTg5tlTwJmE5FK7VDG6CfU36fVtzVQFyK7GBbm4VjgXySBEwb+5sOsQKBgCks\nEZiG/saglD6Jy92mis5Y4afCCbujlF5rVpAl3kruudh2y4XK9nQyJd7fyztcxAAt\nwV5xBUFgYQTpYCqKdW4LWQypm6DR1KAkkaGM2mQ6IMNSWRMaQKLNklFK3SVffH6O\n8Bf1URsZgmrZaayQLNXfhpwBbv/S9+1Q+fq5Sl2BAoGBANhbWYNDsBg+87Bf9ImL\n/4ATZHcgMxvASio0TBve8rrIhy9Tbu+pNR/IfJd0Eqw1lUPkE4zCxWMKYEwj/3Il\nO/FpU6YSXXBIwefDZrNcL9eZL5a8dSU+vuUw1zpBUCjaFiLUzGgLdB+E6Cwx7bCp\nlMyA+NX1E4prFY05ioUAhyKF\n-----END PRIVATE KEY-----\n",
  client_email: "google-analytics@fusioncrm-project.iam.gserviceaccount.com",
  client_id: "102116029683208370057",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/google-analytics%40fusioncrm-project.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

interface ProcessedMetrics {
  date: string;
  activeUsers: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
}

interface ProcessedTrafficSource {
  source: string;
  activeUsers: number;
  sessions: number;
}

interface ProcessedEvent {
  name: string;
  count: number;
}

interface ProcessedPage {
  path: string;
  pageViews: number;
  activeUsers: number;
  avgTimeOnPage: number;
}

interface AnalyticsRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
  dateRangeIndices?: number[];
}

const formatDate = (dateStr: string): string => {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
};

const roundNumber = (num: number, decimals: number = 2): number => {
  return Number(Math.round(Number(num + "e" + decimals)) + "e-" + decimals);
};

const secondsToMinutes = (seconds: number): number => {
  return roundNumber(seconds / 60);
};

const isValidDate = (dateStr: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export const getMarketingDashboard = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Validar formato de fechas
    if (startDate && !isValidDate(startDate as string)) {
      return res
        .status(400)
        .json({ error: "Formato de fecha inicial inválido. Use YYYY-MM-DD" });
    }

    if (endDate && !isValidDate(endDate as string)) {
      return res
        .status(400)
        .json({ error: "Formato de fecha final inválido. Use YYYY-MM-DD" });
    }

    let currentMonthStart: string;
    let currentMonthEnd: string;
    let lastMonthStart: string;
    let lastMonthEnd: string;

    if (startDate && endDate) {
      // Usar las fechas proporcionadas
      currentMonthStart = startDate as string;
      currentMonthEnd = endDate as string;

      // Calcular el mes anterior con método robusto
      const startDateObj = new Date(startDate as string);
      const endDateObj = new Date(endDate as string);
      const diffTime = endDateObj.getTime() - startDateObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const lastStartDateObj = new Date(startDateObj);
      lastStartDateObj.setMonth(lastStartDateObj.getMonth() - 1);

      const lastEndDateObj = new Date(lastStartDateObj);
      lastEndDateObj.setDate(lastStartDateObj.getDate() + diffDays);

      lastMonthStart = lastStartDateObj.toISOString().split("T")[0];
      lastMonthEnd = lastEndDateObj.toISOString().split("T")[0];
    } else {
      // Usar el mes actual por defecto
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      currentMonthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
      currentMonthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const lastMonth = currentMonth === 0 ? 12 : currentMonth;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      lastMonthStart = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-01`;
      lastMonthEnd = `${lastMonthYear}-${String(lastMonth).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }

    // Métricas principales y usuarios activos vs nuevos
    const userMetricsReport = await runAnalyticsReport(credentials, {
      propertyId: "257042282",
      dateRanges: [
        {
          startDate: currentMonthStart,
          endDate: currentMonthEnd,
          name: "periodoActual",
        },
        {
          startDate: lastMonthStart,
          endDate: lastMonthEnd,
          name: "periodoAnterior",
        },
      ],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    });

    // Fuentes de tráfico
    const trafficSourcesReport = await runAnalyticsReport(credentials, {
      propertyId: "257042282",
      dateRanges: [{ startDate: currentMonthStart, endDate: currentMonthEnd }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    });

    // Eventos simplificados
    const eventsReport = await runAnalyticsReport(credentials, {
      propertyId: "257042282",
      dateRanges: [{ startDate: currentMonthStart, endDate: currentMonthEnd }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
    });

    // Páginas más visitadas
    const topPagesReport = await runAnalyticsReport(credentials, {
      propertyId: "257042282",
      dateRanges: [{ startDate: currentMonthStart, endDate: currentMonthEnd }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "averageSessionDuration" },
      ],
    });

    // Procesar métricas de usuarios para ambos periodos
    // Para múltiples rangos de fecha, la API asigna un índice a cada fila: 0 para primer rango, 1 para segundo rango
    const rowsActual = userMetricsReport.rows.filter(
      (row: AnalyticsRow) =>
        row.dimensionValues.length > 0 &&
        row.dateRangeIndices &&
        row.dateRangeIndices[0] === 0
    );

    const rowsAnterior = userMetricsReport.rows.filter(
      (row: AnalyticsRow) =>
        row.dimensionValues.length > 0 &&
        row.dateRangeIndices &&
        row.dateRangeIndices[0] === 1
    );

    // Si el filtrado por dateRangeIndices no funciona, intentamos usar las fechas para filtrar
    if (rowsActual.length === 0 || rowsAnterior.length === 0) {
      // Filtramos por fecha para identificar cada período
      const actualStartDate = new Date(currentMonthStart);
      const actualEndDate = new Date(currentMonthEnd);
      const anteriorStartDate = new Date(lastMonthStart);
      const anteriorEndDate = new Date(lastMonthEnd);

      const rowsFilteredByDate = userMetricsReport.rows.filter(
        (row: AnalyticsRow) => {
          const rowDate = new Date(formatDate(row.dimensionValues[0].value));
          if (rowDate >= actualStartDate && rowDate <= actualEndDate) {
            return true; // Es del período actual
          }
          return false;
        }
      );

      const rowsFilteredByDateAnterior = userMetricsReport.rows.filter(
        (row: AnalyticsRow) => {
          const rowDate = new Date(formatDate(row.dimensionValues[0].value));
          if (rowDate >= anteriorStartDate && rowDate <= anteriorEndDate) {
            return true; // Es del período anterior
          }
          return false;
        }
      );

      if (rowsFilteredByDate.length > 0) {
        rowsActual.push(...rowsFilteredByDate);
      }

      if (rowsFilteredByDateAnterior.length > 0) {
        rowsAnterior.push(...rowsFilteredByDateAnterior);
      }
    }

    // Totales periodo actual
    const totalActiveUsersActual = rowsActual.reduce(
      (sum: number, row: AnalyticsRow) =>
        sum + parseInt(row.metricValues[0].value),
      0
    );
    const totalNewUsersActual = rowsActual.reduce(
      (sum: number, row: AnalyticsRow) =>
        sum + parseInt(row.metricValues[1].value),
      0
    );
    const avgBounceRateActual =
      rowsActual.reduce(
        (sum: number, row: AnalyticsRow) =>
          sum + parseFloat(row.metricValues[2].value),
        0
      ) / (rowsActual.length || 1);
    const avgSessionDurationActual =
      rowsActual.reduce(
        (sum: number, row: AnalyticsRow) =>
          sum + parseFloat(row.metricValues[3].value),
        0
      ) / (rowsActual.length || 1);

    // Totales periodo anterior
    const totalActiveUsersAnterior = rowsAnterior.reduce(
      (sum: number, row: AnalyticsRow) =>
        sum + parseInt(row.metricValues[0].value),
      0
    );
    const totalNewUsersAnterior = rowsAnterior.reduce(
      (sum: number, row: AnalyticsRow) =>
        sum + parseInt(row.metricValues[1].value),
      0
    );
    const avgBounceRateAnterior =
      rowsAnterior.reduce(
        (sum: number, row: AnalyticsRow) =>
          sum + parseFloat(row.metricValues[2].value),
        0
      ) / (rowsAnterior.length || 1);
    const avgSessionDurationAnterior =
      rowsAnterior.reduce(
        (sum: number, row: AnalyticsRow) =>
          sum + parseFloat(row.metricValues[3].value),
        0
      ) / (rowsAnterior.length || 1);

    // Mejorar el cálculo de variación con mejor manejo de valores cercanos a cero
    const calcVar = (actual: number, anterior: number) => {
      // Si ambos valores son cero, no hay cambio
      if (actual === 0 && anterior === 0) {
        return 0;
      }

      // Si el valor anterior es cero o muy pequeño, limitar el cambio
      if (anterior === 0 || anterior < 0.01) {
        return actual > 0 ? 100 : -100; // Limitado a ±100%
      }

      // Calcular el porcentaje de cambio y limitarlo a un rango razonable
      const variacion = ((actual - anterior) / anterior) * 100;
      // Limitar a ±100% para mantener la escala razonable
      return roundNumber(Math.max(Math.min(variacion, 100), -100));
    };

    const variacionActiveUsers = calcVar(
      totalActiveUsersActual,
      totalActiveUsersAnterior
    );
    const variacionNewUsers = calcVar(
      totalNewUsersActual,
      totalNewUsersAnterior
    );
    const variacionBounceRate = calcVar(
      avgBounceRateActual,
      avgBounceRateAnterior
    );
    const variacionSessionDuration = calcVar(
      avgSessionDurationActual,
      avgSessionDurationAnterior
    );

    // Procesar métricas de usuarios (solo periodo actual para daily)
    const processedMetrics: ProcessedMetrics[] = rowsActual
      .filter((row: AnalyticsRow) =>
        row.metricValues.some(
          (metric: { value: string }) => metric.value !== "0"
        )
      )
      .map((row: AnalyticsRow) => ({
        date: formatDate(row.dimensionValues[0].value),
        activeUsers: parseInt(row.metricValues[0].value),
        newUsers: parseInt(row.metricValues[1].value),
        bounceRate: roundNumber(parseFloat(row.metricValues[2].value)),
        avgSessionDuration: secondsToMinutes(
          parseFloat(row.metricValues[3].value)
        ),
      }));

    // Procesar fuentes de tráfico
    const processedTrafficSources: ProcessedTrafficSource[] =
      trafficSourcesReport.rows
        .filter((row: AnalyticsRow) => parseInt(row.metricValues[0].value) > 0)
        .map((row: AnalyticsRow) => ({
          source: row.dimensionValues[0].value,
          activeUsers: parseInt(row.metricValues[0].value),
          sessions: parseInt(row.metricValues[1].value),
        }));

    // Procesar eventos
    const processedEvents: ProcessedEvent[] = eventsReport.rows
      .filter((row: AnalyticsRow) => parseInt(row.metricValues[0].value) > 0)
      .map((row: AnalyticsRow) => ({
        name: row.dimensionValues[0].value,
        count: parseInt(row.metricValues[0].value),
      }));

    // Procesar páginas más visitadas
    const processedPages: ProcessedPage[] = topPagesReport.rows
      .filter((row: AnalyticsRow) => parseInt(row.metricValues[0].value) > 0)
      .map((row: AnalyticsRow) => ({
        path: row.dimensionValues[0].value,
        pageViews: parseInt(row.metricValues[0].value),
        activeUsers: parseInt(row.metricValues[1].value),
        avgTimeOnPage: secondsToMinutes(parseFloat(row.metricValues[2].value)),
      }))
      .sort((a: ProcessedPage, b: ProcessedPage) => b.pageViews - a.pageViews)
      .slice(0, 10);

    // Organizar respuesta para el dashboard
    res.status(200).json({
      metrics: {
        daily: processedMetrics,
        summary: {
          totalActiveUsers: totalActiveUsersActual,
          totalActiveUsersChange: variacionActiveUsers,
          totalNewUsers: totalNewUsersActual,
          totalNewUsersChange: variacionNewUsers,
          avgBounceRate: roundNumber(avgBounceRateActual),
          avgBounceRateChange: variacionBounceRate,
          avgSessionDuration: secondsToMinutes(avgSessionDurationActual),
          avgSessionDurationChange: variacionSessionDuration,
        },
      },
      trafficSources: processedTrafficSources,
      events: processedEvents,
      topPages: processedPages,
      dateRanges: {
        currentMonth: { start: currentMonthStart, end: currentMonthEnd },
        previousMonth: { start: lastMonthStart, end: lastMonthEnd },
      },
    });
  } catch (error) {
    console.error("Error al obtener datos de analytics:", error);
    res.status(500).json({ error: "Error al obtener datos de analytics" });
  }
};
