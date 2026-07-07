const fs = require('fs');
const path = require('path');

/**
 * Config Expo dynamique.
 *
 * `google-services.json` (config Firebase/FCM pour les notifications push) est
 * un secret : il n'est PAS versionné. On ne référence donc `googleServicesFile`
 * QUE lorsqu'il est réellement présent — sinon `expo prebuild` échoue en CI
 * (« Cannot copy google-services.json »).
 *
 * - Build de test (CI, sans le fichier) : l'APK se construit, sans FCM.
 * - Build de prod (fichier fourni via secret/CI) : FCM activé automatiquement.
 *
 * Le reste de la config vient de app.json (passé ici via `config`).
 */
module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
