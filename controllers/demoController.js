import db_connection from "../config/db_config"


const demo_db=async function(req,res){

    let result = await db_connection.query("SELECT * FROM demo_table");
    console.log(result.rows);
    


}