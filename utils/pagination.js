const DBQuery = require('./db_query_class');

function pagination(query, page = 1, limit = 10) {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    query.offset(offset);
    query.limit(limit);

    return query;
}


export default pagination;
//module.exports = pagination;