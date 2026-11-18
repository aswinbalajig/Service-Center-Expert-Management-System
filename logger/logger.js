import devLogger from './devLogger.js';
import productionLogger from './productionLogger.js';

// production gets file + console logging; every other env (development, test, unset) gets the console logger
const logger = process.env.NODE_ENV === 'production' ? productionLogger() : devLogger();

// keep test output clean: hide debug/info noise but still print real errors
if (process.env.NODE_ENV === 'test') {
    logger.level = 'error';
}

export default logger;
