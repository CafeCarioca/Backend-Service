const jwt = require("jsonwebtoken");
const logger = require("./utils/logger");
require("dotenv").config(); // Carga variables de entorno

// Define el payload del token
const payload = {
  id: "static-user-id",
  role: "static", // Puedes personalizar según necesidad
  name: "Static JWT Token"
};

// Generar el token
const secretKey = process.env.JWT_SECRET;

if (!secretKey) {
  logger.error("Falta la clave JWT_SECRET en el archivo .env");
  process.exit(1);
}

// Genera el token con expiración: si se filtra, deja de servir solo.
// Al expirar hay que regenerarlo y actualizar REACT_APP_API_TOKEN en el
// .env del BackOffice (y rebuildearlo).
const token = jwt.sign(payload, secretKey, { expiresIn: "90d" });

logger.log("Tu JWT estático es (expira en 90 días):");
logger.log(token);
