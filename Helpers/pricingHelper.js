const logger = require('../utils/logger');

// ============================================================
// Recalcula precios de órdenes CONTRA LA BASE DE DATOS.
// Del carrito del cliente solo se usan: blendName, grams, grind
// y quantity. Los precios/descuentos/envío que manda el cliente
// se IGNORAN (solo se loguea si difieren) — un cliente malicioso
// podía editar localStorage y pagar lo que quisiera.
// ============================================================

const round2 = (n) => Math.round(n * 100) / 100;

// ===== Envío: espejo de las reglas del front (Checkout.js) =====
// Montevideo delivery: $180, gratis desde $1500. Interior: $0 (se
// coordina aparte). Takeaway: $0.
const MVD_SHIPPING_COST = 180;
const MVD_FREE_SHIPPING_FROM = 1500;

const computeShippingCost = ({ deliveryType, department, itemsTotal }) => {
  if (deliveryType !== 'delivery') return 0;
  const isMontevideo =
    String(department || '').trim().toLowerCase() === 'montevideo';
  if (!isMontevideo) return 0;
  return itemsTotal >= MVD_FREE_SHIPPING_FROM ? 0 : MVD_SHIPPING_COST;
};

// "250g" -> 250 | "1kg" -> 1000
const weightToGrams = (weight) => {
  if (weight === null || weight === undefined) return null;
  const str = String(weight).trim().toLowerCase();
  const num = parseFloat(str);
  if (Number.isNaN(num)) return null;
  return str.includes('kg') ? Math.round(num * 1000) : Math.round(num);
};

// El front a veces guarda 1 (parseInt de "1kg") en lugar de 1000:
// valores menores a 10 se interpretan como kilos.
const normalizeCartGrams = (grams) => {
  const num = Number(grams);
  if (!num || Number.isNaN(num)) return null;
  return num < 10 ? Math.round(num * 1000) : Math.round(num);
};

const discountedUnitPrice = (unitPrice, discount) => {
  if (!discount) return unitPrice;
  if (discount.discount_type === 'percentage') {
    return Math.max(0, unitPrice * (1 - Number(discount.discount_value) / 100));
  }
  if (discount.discount_type === 'fixed_amount') {
    return Math.max(0, unitPrice - Number(discount.discount_value));
  }
  return unitPrice; // bogo: el precio unitario no cambia
};

const getActiveDiscountForProduct = async (connection, productId, deliveryType, grams) => {
  // ORDER BY discount_value DESC para que coincida con el descuento que
  // muestra la tienda (productController usa el mismo criterio): si un
  // producto tuviera 2+ descuentos activos, el precio cobrado es el mismo
  // que el exhibido. El filtro de delivery_type evita aplicar un descuento
  // delivery-only a un retiro en tienda.
  const [rows] = await connection.execute(
    `SELECT d.id, d.discount_type, d.discount_value, d.delivery_type,
       (SELECT GROUP_CONCAT(pr.weight ORDER BY pr.id SEPARATOR '|')
        FROM discount_presentations dp
        INNER JOIN presentations pr ON pr.id = dp.presentation_id
        WHERE dp.discount_id = d.id AND pr.product_id = ?) AS presentation_weights
     FROM discounts d
     JOIN product_discounts pd ON pd.discount_id = d.id
     WHERE pd.product_id = ?
       AND d.is_active = 1
       AND (d.start_date IS NULL OR d.start_date <= CURDATE())
       AND (d.end_date IS NULL OR d.end_date >= CURDATE())
       AND (d.delivery_type = 'both' OR d.delivery_type = ?)
     ORDER BY d.discount_value DESC`,
    [productId, productId, deliveryType || 'delivery']
  );
  return rows.find((discount) => {
    if (!discount.presentation_weights) return true;
    if (!grams) return false;
    return discount.presentation_weights
      .split('|')
      .some((weight) => weightToGrams(weight) === grams);
  }) || null;
};

/**
 * Recalcula cada item del carrito contra la BD.
 * Devuelve { pricedItems, itemsTotal, productDiscountTotal } donde
 * itemsTotal ya tiene aplicados los descuentos de producto y BOGO.
 */
const priceCartItems = async (connection, items, deliveryType) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El carrito está vacío');
  }

  const pricedItems = [];
  let itemsTotal = 0;
  let productDiscountTotal = 0;

  for (const item of items) {
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));

    const [products] = await connection.execute(
      'SELECT id, name, price, available FROM products WHERE name = ?',
      [item.blendName]
    );
    if (!products.length) {
      throw new Error(`Producto "${item.blendName}" no existe en la base de datos`);
    }
    const product = products[0];
    if (!product.available) {
      throw new Error(`Producto "${item.blendName}" no está disponible`);
    }

    // Precio base: presentación que matchee los gramos, o precio del producto
    let baseUnitPrice = product.price !== null ? Number(product.price) : null;
    const grams = normalizeCartGrams(item.grams);
    if (grams) {
      const [presentations] = await connection.execute(
        'SELECT weight, price FROM presentations WHERE product_id = ?',
        [product.id]
      );
      const match = presentations.find((p) => weightToGrams(p.weight) === grams);
      if (match) {
        baseUnitPrice = Number(match.price);
      } else if (baseUnitPrice === null) {
        throw new Error(
          `Presentación de ${grams}g no encontrada para "${item.blendName}"`
        );
      }
    }
    if (baseUnitPrice === null) {
      throw new Error(`"${item.blendName}" no tiene precio definido`);
    }

    const discount = await getActiveDiscountForProduct(
      connection,
      product.id,
      deliveryType,
      grams
    );
    const unitPrice = round2(discountedUnitPrice(baseUnitPrice, discount));
    const bogoDiscount =
      discount && discount.discount_type === 'bogo'
        ? round2(Math.floor(quantity / 2) * unitPrice)
        : 0;

    // Aviso (no bloqueo) si el precio que mandó el cliente no coincide
    const clientPrice = Number(item.price);
    if (!Number.isNaN(clientPrice) && Math.abs(clientPrice - unitPrice) > 1) {
      logger.warn(
        `⚠️ Precio del cliente difiere para "${item.blendName}": cliente $${clientPrice}, BD $${unitPrice}. Se usa el de la BD.`
      );
    }

    itemsTotal += unitPrice * quantity - bogoDiscount;
    productDiscountTotal +=
      (baseUnitPrice - unitPrice) * quantity + bogoDiscount;

    pricedItems.push({
      productId: product.id,
      name: product.name,
      quantity,
      grams: item.grams !== undefined ? item.grams : null,
      grind: item.grind !== undefined ? item.grind : null,
      unitPrice,
      bogoDiscount,
    });
  }

  return {
    pricedItems,
    itemsTotal: round2(itemsTotal),
    productDiscountTotal: round2(productDiscountTotal),
  };
};

/**
 * Valida un cupón contra la BD (misma lógica que couponController.validateCoupon)
 * y calcula el descuento sobre el total recalculado server-side.
 * Devuelve { coupon, discountAmount } o null si el código no aplica.
 */
const validateCouponForOrder = async (connection, code, deliveryType, itemsTotal) => {
  if (!code) return null;

  const [coupons] = await connection.execute(
    `SELECT id, code, discount_type, discount_value, delivery_type,
            min_purchase_amount, max_uses, current_uses, start_date, end_date
     FROM coupons
     WHERE code = ? AND is_active = 1`,
    [String(code).toUpperCase()]
  );
  if (!coupons.length) {
    logger.warn(`⚠️ Cupón "${code}" no válido — la orden se crea sin cupón`);
    return null;
  }
  const coupon = coupons[0];

  const now = new Date();
  if (coupon.start_date && now < new Date(coupon.start_date)) return null;
  if (coupon.end_date && now > new Date(coupon.end_date)) return null;
  if (
    coupon.delivery_type !== 'both' &&
    deliveryType &&
    coupon.delivery_type !== deliveryType
  ) {
    return null;
  }
  if (coupon.min_purchase_amount > 0 && itemsTotal < coupon.min_purchase_amount) {
    return null;
  }
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) return null;

  const discountAmount =
    coupon.discount_type === 'percentage'
      ? round2((itemsTotal * Number(coupon.discount_value)) / 100)
      : round2(Number(coupon.discount_value));

  return { coupon, discountAmount };
};

module.exports = {
  priceCartItems,
  validateCouponForOrder,
  computeShippingCost,
  round2,
};
