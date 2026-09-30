import { AsyncLocalStorage } from "node:async_hooks";
import db_connection from "../config/db_config.js";

const transactionContext = new AsyncLocalStorage();

class DBQuery {
constructor(connection) {
    this.connection=connection;
}

convertNamedParams(sql, params) {
  const values = [];
  const indexMap = {};

  const text = sql.replace(/:(\w+)/g, (_, key) => {
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
    
    let debugQuery = text;
    values.forEach((v, i) => {
        debugQuery = debugQuery.replace(`$${i+1}`, `'${v}'`);
    });
    const transactionClient = transactionContext.getStore();
    const runner = transactionClient || this.connection;

    try{
       console.log("Executing query:", debugQuery);
    const result= await runner.query(text, values);
    return result;

    }catch(err){
        console.error("Error on executing query : ",err);
        // inside a transaction the error must propagate so withTransaction can ROLLBACK
        if (transactionClient) throw err;
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
            console.error("Error on ROLLBACK : ", rollbackErr);
        }
        throw error;
    } finally {
        client.release();
    }
}



}

export default new DBQuery(db_connection);