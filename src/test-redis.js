// Script para probar la conexión con Redis
const Redis = require('ioredis');

// Usar la misma configuración que en la aplicación
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

console.log('Intentando conectar a Redis...');
const redis = new Redis(redisConfig);

// Manejar eventos de conexión
redis.on('connect', () => {
  console.log('✅ Conectado a Redis exitosamente');
});

redis.on('error', (err) => {
  console.error('❌ Error conectando a Redis:', err);
  process.exit(1);
});

// Intentar un PING
redis.ping()
  .then(result => {
    console.log(`✅ Respuesta de Redis al PING: ${result}`);
    redis.quit().then(() => {
      console.log('Conexión cerrada correctamente');
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('❌ Error al hacer PING a Redis:', err);
    process.exit(1);
  }); 