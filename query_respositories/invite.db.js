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

export const createInvite = async function (inviteDetailsData)
{
    const { edit_id, delete_id, invitee_email, role_id , service_center_id, invited_by_user_id, token ,  is_used, expires_at } = inviteDetailsData;
    let query = `
    SELECT security.manage_invites(
	 :edit_id,
	 :delete_id,
	 :invitee_email,
	 :role_id,
	 :service_center_id,
	 :invited_by_user_id,
	 :token,
	 :is_used,
	 :expires_at
    ) AS invite_id;    
    `;
    let result = await db_obj.prepare(query,{
		edit_id,
		delete_id,
		invitee_email,
		role_id,
		service_center_id,
		invited_by_user_id,
		token,
		is_used,
		expires_at
	});
    return result.rows[0].invite_id;
}

export const getInviteByToken = async function (token) {
    let result = await db_obj.prepare(
        `SELECT invite_id, invitee_email, role_id, service_center_id, invited_by_user_id, token, is_used, expires_at
         FROM security.invites
         WHERE token = :token`,
        { token },
    );
    return result.rows[0];
}

export const markInviteUsed = async function (invite_id) {
    let result = await db_obj.prepare(
        `UPDATE security.invites SET is_used = true WHERE invite_id = :invite_id and is_used = false and expires_at > now()`,
        { invite_id },
    );
    return result.rowCount > 0;
}