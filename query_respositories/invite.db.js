import db_obj from "../utils/db_query_class.js";
/*

SELECT security.manage_invites(
	<p_edit_id integer>,
	<p_delete_id integer>,
	<p_invitee_email character varying>,
	<p_role_id integer>,
	<p_service_center_id integer>,
	<p_invited_by_user_id integer>,
	<p_token text>,
	<p_is_used boolean>,
	<p_expires_at timestamp with time zone>
)


*/

const createInvite = async function (inviteDetailsData)
{
    const { edit_id, delete_id, invitee_email, service_center_id, role_id , token ,  expires_at } = inviteDetailsData;
    let query = `
    SELECT security.manage_invites(
    
    )
    
    `;
    let result = await db_obj.prepare(query,{})
}