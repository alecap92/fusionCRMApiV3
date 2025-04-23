// cron/scheduler.ts
import cron from "node-cron";
import ScheduledPost from "../models/ScheduledPost";
import { publishScheduledPost } from "../services/publisherService";

// Ejecutar cada minuto
cron.schedule("* * * * *", async () => {
  console.log("⏰ Ejecutando cron para publicaciones programadas");

  const now = new Date();

  try {
    const posts: any = await ScheduledPost.find({
      status: "scheduled",
      scheduledFor: { $lte: now },
    });

    for (const post of posts) {
      console.log(`➡️ Publicando post ID: ${post._id}`);
      const result = await publishScheduledPost(post._id.toString());
      console.log(`✅ Resultado:`, result);
    }
  } catch (err) {
    console.error("❌ Error en cron job:", err);
  }
});
