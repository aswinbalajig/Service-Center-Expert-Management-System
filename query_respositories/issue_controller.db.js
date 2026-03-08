import db_obj from "../utils/db_query_class.js";

const issue_CRUD=async function(issueDetailsData){
    const {description,priority,user_id,service_center_id,edit_id,delete_id}=issueDetailsData;
    let result = await db_obj.prepare(
        `SELECT main.manage_issue(
            :action,
            :edit_id,
            :delete_id,
            :user_id,
            :service_center_id,,
            :description,
            :priority,
            :status       

        );`, {
            action:null,
            edit_id,
            delete_id,
            user_id,
            service_center_id,
            description,
            priority,
            status:'OPEN'
        });

        return result.rows[0];
}


const update_issue_status=async function(data){
    const {issue_id,status}=data;
    let result = await db_obj.prepare(
        `SELECT main.manage_issues(
    p_action => :action,
    p_edit_id => :edit_id,
    p_status => :status
);`,{
    action:'status_update',
    edit_id:issue_id,
    status
})};

const update_issue_priority=async function(data){
    const {issue_id,priority}=data;
    let result = await db_obj.prepare(
        `SELECT main.manage_issues(
    p_action => 'priority_update',
    p_edit_id => 5,
    p_priority => 'HIGH'
);`,{
    action:'priority_update',
    edit_id:issue_id,
    priority
})};


export{ issue_CRUD,update_issue_status,update_issue_priority};