/**
 * Logger utility with timestamps
 * Provides formatted logging functions with timestamps for better debugging
 */

const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

const formatMessage = (level, message, ...args) => {
  const timestamp = getTimestamp();
  const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ') : '';
  return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
};

const log = (message, ...args) => {
  console.log(formatMessage('INFO', message, ...args));
};

const error = (message, ...args) => {
  console.error(formatMessage('ERROR', message, ...args));
};

const warn = (message, ...args) => {
  console.warn(formatMessage('WARN', message, ...args));
};

const info = (message, ...args) => {
  console.info(formatMessage('INFO', message, ...args));
};

module.exports = {
  log,
  error,
  warn,
  info
};
