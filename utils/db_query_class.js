import { AsyncLocalStorage } from "node:async_hooks";
import db_connection from "../config/db_config.js";
import logger from "../logger/logger.js";

const transactionContext = new AsyncLocalStorage();

class DBQuery {
constructor(connection) {
    this.connection=connection;
}

convertNamedParams(sql, params) {
  const values = [];
  const indexMap = {};

  // (?<!:) skips Postgres casts like ::text so they aren't read as parameters
  const text = sql.replace(/(?<!:):(\w+)/g, (_, key) => {
    if (!(key in params)) {
      throw new Error(`Missing parameter: ${key}`);
    }
    if (!indexMap[key]) {
      values.push(params[key]);
      indexMap[key] = values.length;
    }

    return `$${indexMap[key]}`;
  });

  return { text, values };
}

async prepare(sql,params)
{
    const { text, values } = this.convertNamedParams(sql, params);

    // query values include password hashes, tokens and emails: debug level only, so production never logs them
    if (logger.isDebugEnabled()) {
        let debugQuery = text;
        values.forEach((v, i) => {
            debugQuery = debugQuery.replace(`$${i+1}`, `'${v}'`);
        });
        logger.debug(`Executing query: ${debugQuery}`);
    }
    const transactionClient = transactionContext.getStore();
    const runner = transactionClient || this.connection;

    try{
    const result= await runner.query(text, values);
    return result;

    }catch(err){
        //console.error("Error on executing query : ",err);
        throw err;
    }

}

async withTransaction(callback) {
    if (transactionContext.getStore()) {
        return callback();
    }

    const client = await this.connection.connect();
    try {
        await client.query("BEGIN");
        const result = await transactionContext.run(client, callback);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackErr) {
            logger.error(`Error on ROLLBACK : ${rollbackErr.stack || rollbackErr}`);
        }
        throw error;
    } finally {
        client.release();
    }
}



}

export default new DBQuery(db_connection);