const express = require('express');
const router = express.Router();
const { getShippingRules } = require('../Helpers/pricingHelper');

// Público: la tienda consulta las reglas de envío al cargar el checkout para
// mostrar exactamente lo mismo que después cobra el servidor (una sola fuente
// de verdad). Incluye la promo Nespresso (nespressoFreeQty; 0 = apagada).
router.get('/rules', (req, res) => {
  res.json(getShippingRules());
});

module.exports = router;
