const jwt = require("jsonwebtoken");
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
  console.error("Falta la clave JWT_SECRET en el archivo .env");
  process.exit(1);
}

// Genera el token (sin expiración)
const token = jwt.sign(payload, secretKey);

console.log("Tu JWT estático es:");
console.log(token);
