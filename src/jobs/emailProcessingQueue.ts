import Bull from "bull";

const emailProcessingQueue = new Bull("email-processing");

emailProcessingQueue.process(async (job) => {
  console.log("Processing job with data:", job.data);
  // Aquí va la lógica de procesamiento del trabajo
});

emailProcessingQueue.on("completed", (job) => {
  console.log(`Job completed with result ${job.returnvalue}`);
});

emailProcessingQueue.on("failed", (job, err) => {
  console.error(`Job failed with error ${err.message}`);
});

export default emailProcessingQueue;
