import cron from "node-cron";
import { checkAndPostScheduledPosts } from "../controllers/social/scheduledPostController";

// Ejecuta cada minuto
cron.schedule("* * * * *", async () => {
  await checkAndPostScheduledPosts();
});
