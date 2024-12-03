// Middleware de validación de IP
const allowedIPs = ['72.14.201.222', '167.61.172.228','::1'];

const checkIP = (req, res, next) => {
  const clientIP = req.ip;
  //const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('Client IP:', clientIP);
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = checkIP;