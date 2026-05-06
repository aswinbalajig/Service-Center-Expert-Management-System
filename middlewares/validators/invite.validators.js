 
 /*
 const userProfileSchemaValidator = checkSchema({

  "profileCredentials.user_id": {
    optional: true,
    in: ["body"],
    notEmpty: {
      errorMessage: "User id is required"
    },
    isInt: {
      errorMessage: "User id must be an integer"
    },
    toInt: true
  },

  "profileCredentials.date_of_joining": {
    in: ["body"],
    optional: true,
    isISO8601: {
      errorMessage: "Date of joining must be a valid date"
    },
    toDate: true
  },

  "profileCredentials.phone_number": {
    in: ["body"],
  optional: true,
  matches: {
    options: [/^[6-9]\d{9}$/],
    errorMessage: "Phone number must be a valid 10 digit Indian number"
  }
},

  "profileCredentials.role_id": {
    in: ["body"],
    optional: true,
    isInt: {
      errorMessage: "Role id must be an integer"
    },
    toInt: true
  },

  "profileCredentials.first_name": {
    in: ["body"],
    notEmpty: {
      errorMessage: "First name is required"
    },
    isLength: {
      options: { min: 2, max: 50 },
      errorMessage: "First name must be between 2 and 50 characters"
    },
    trim: true
  },

  "profileCredentials.last_name": {
    in: ["body"],
    optional: true,
    isLength: {
      options: { max: 50 },
      errorMessage: "Last name cannot exceed 50 characters"
    },
    trim: true
  }

});
?


const LoginValidator = [
    body("email_id").notEmpty().withMessage("Email ID is required").isEmail().withMessage("Invalid email id"),
    body("password").notEmpty().withMessage("Password is required")
];


*/

import { body,query } from "express-validator";

export const sendInviteValidator=[
    body("email_id").notEmpty().withMessage("Please provide the invitee's email ID").isEmail().withMessage("Invalid invitee's email id"),
];

export const inviteTokenValidator=[
    query('token').notEmpty().withMessage("Token is required")
]