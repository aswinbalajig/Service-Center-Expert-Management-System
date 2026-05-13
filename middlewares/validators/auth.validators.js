import { body,checkSchema } from "express-validator";

const LoginValidator = [
    body("email_id").notEmpty().withMessage("Email ID is required").isEmail().withMessage("Invalid email id"),
    body("password").notEmpty().withMessage("Password is required")
];


const userSchemaValidator = checkSchema({
  "userCredentials.email_id": {
    in: ["body"],
    notEmpty: {
      errorMessage: "Email is required"
    },
    isEmail: {
      errorMessage: "Invalid email address"
    },
    normalizeEmail: true
  },

  "userCredentials.password": {
    in: ["body"],
    notEmpty: {
      errorMessage: "Password is required"
    },
    isLength: {
      options: { min: 6 },
      errorMessage: "Password must be at least 6 characters"
    }
  }

});

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


const serviceCenterProfileSchemaValidator = checkSchema({

  "profileCredentials.service_center_name": {
    in: ["body"],
    notEmpty: {
      errorMessage: "Service center name is required"
    },
    isLength: {
      options: { min: 2},
      errorMessage: "Service center name must be at least 2 characters"
    },
    trim: true
  },

  "profileCredentials.service_center_address": {
  in: ["body"],
  notEmpty: {
    errorMessage: "Address is required"
  },
  isLength: {
    options: { min: 5 },
    errorMessage: "Address must be at least 5 characters"
  },
  trim: true
}});

export{
    LoginValidator,
    userSchemaValidator,
    userProfileSchemaValidator,
    serviceCenterProfileSchemaValidator
} 
