import e from "express";
import express from "express";
import {
  issue_CRUD,
  update_issue_status,
  update_issue_priority,
  get_my_issues_query,
} from "../query_respositories/service_center_controller.db.js";

const create_issue = async (request, response) => {
  const service_center_id = request.profile_info.service_center_id;
  const user_id = request.user_id;
  const { description, priority } = request.body;
  const data = {
    description,
    priority,
    user_id,
    service_center_id,
    edit_id: 0,
    delete_id: 0,
  };
  const created_issue_details = await issue_CRUD(
    data,
    service_center_id,
    request.user_id,
  );

  response.json({ message: "issue created" });
};

const update_status = async (request, response) => {
  const { issue_id, status } = request.body;
  const data = {
    issue_id,
    status,
  };
  const updated_issue_status = await update_issue_status(data);
  response.status(200).json({
    success: true,
    message: "Issue status updated",
    data: {
      issue_id,
    },
  });
};

const update_priority = async (request, response) => {
  const { issue_id, priority } = request.body;
  const data = { issue_id, priority };
  const updated_issue_priority = await update_issue_priority(data);
  response.status(200).json({
    success: true,
    message: "Issue priority updated",
    data: {
      issue_id,
    },
  });
};

const get_my_issues = async (request, response) => {
  const service_center_id = request.profile_info.service_center_id;

  const { page = 1, limit = 10, ...filters } = request.query;

  const pagination = {
    limit: parseInt(limit, 10) || 10,
    offset: (parseInt(page, 10) - 1) * (parseInt(limit, 10) || 10),
  };

  const { rows, total } = await get_my_issues_query(
    filters,
    service_center_id,
    pagination,
  );

  response.status(200).json({
    success: true,
    message: "Issues fetched successfully",
    data: rows,
    meta: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
    },
  });
};

export { create_issue, update_status, update_priority, get_my_issues };
