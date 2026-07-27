import devLogger from './devLogger';
import productionLogger from './productionLogger';

let logger = null;

if (process.env.NODE_ENV === 'production') {
    logger = productionLogger();
}

if (process.env.NODE_ENV === 'development') {
    logger = devLogger();
}

export default logger;