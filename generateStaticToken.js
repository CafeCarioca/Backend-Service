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

// Genera el token (sin expiración)
const token = jwt.sign(payload, secretKey);

logger.log("Tu JWT estático es:");
logger.log(token);
