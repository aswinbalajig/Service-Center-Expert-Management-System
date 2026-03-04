import db_connection from "../config/db_config.js";


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
    console.log("Executing query:", debugQuery);
    const result= await this.connection.query(text, values);
    return result;
}



}

export default new DBQuery(db_connection);