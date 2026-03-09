import db_obj from "../utils/db_query_class.js";

const issue_CRUD = async function (issueDetailsData) {
  const {
    description,
    priority,
    user_id,
    service_center_id,
    edit_id,
    delete_id,
  } = issueDetailsData;
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

        );`,
    {
      action: null,
      edit_id,
      delete_id,
      user_id,
      service_center_id,
      description,
      priority,
      status: "OPEN",
    },
  );

  return result.rows[0];
};

const update_issue_status = async function (data) {
  const { issue_id, status } = data;
  let result = await db_obj.prepare(
    `SELECT main.manage_issues(
    p_action => :action,
    p_edit_id => :edit_id,
    p_status => :status
);`,
    {
      action: "status_update",
      edit_id: issue_id,
      status,
    },
  );
};

const update_issue_priority = async function (data) {
  const { issue_id, priority } = data;
  let result = await db_obj.prepare(
    `SELECT main.manage_issues(
    p_action => :action,
    p_edit_id => :edit_id,
    p_priority => :priority
);`,
    {
      action: "priority_update",
      edit_id: issue_id,
      priority,
    },
  );
};

const get_my_issues_query = async function (
  filters = {},
  service_center_id,
  pagination = {},
) {
  let conditions = `WHERE service_center_id = :service_center_id`;
  for (const [key, value] of Object.entries(filters)) {
    conditions += ` AND ${key} = :${key}`;
  }

  // default pagination values
  const limit = pagination.limit || 10;
  const offset = pagination.offset || 0;

  const query = `
      SELECT *, COUNT(*) OVER() AS total_count
      FROM main.issues
      ${conditions}
      ORDER BY issue_id DESC
      LIMIT :limit OFFSET :offset
    `;

  let result = await db_obj.prepare(query, {
    service_center_id,
    limit,
    offset,
    ...filters,
  });

  const rows = result.rows;
  const total = rows.length ? rows[0].total_count : 0;
  return { rows, total };
};

export {
  issue_CRUD,
  update_issue_status,
  update_issue_priority,
  get_my_issues_query,
};
