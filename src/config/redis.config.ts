export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  
  // Requisitos específicos para BullMQ
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export default redisConfig;