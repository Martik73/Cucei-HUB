const admin = require('firebase-admin');

/**
 * Inicializa Firebase Admin SDK usando variables de entorno.
 * Se llama una sola vez al iniciar el servidor.
 */
const initFirebase = () => {
  if (admin.apps.length > 0) return admin;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  console.log('✅ Firebase Admin SDK inicializado');
  return admin;
};

module.exports = { initFirebase, admin };
