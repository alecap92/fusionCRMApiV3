import admin from "firebase-admin";

// Configuración de Firebase Admin
const firebaseConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Verificar configuración
const requiredFields = ["project_id", "private_key", "client_email"];
const missingFields = requiredFields.filter(
  (field) => !firebaseConfig[field as keyof typeof firebaseConfig]
);

if (missingFields.length > 0) {
  console.error(
    "❌ Firebase Admin: Faltan variables de entorno:",
    missingFields
  );
  console.error(
    "🔧 Asegúrate de configurar estas variables en el .env del backend"
  );
} else {
  console.log("✅ Firebase Admin: Configuración completa");
}

// Inicializar Firebase Admin solo si no está ya inicializado
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
    });
    console.log("✅ Firebase Admin inicializado correctamente");
  } catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error);
  }
}

export const auth = admin.auth();
export default admin;
