import dotenv from "dotenv";

// load test env before any app module runs its own dotenv.config() (which won't override)
dotenv.config({ path: ".env.test", override: true, quiet: true });

if (!process.env.DB_NAME?.endsWith("_test")) {
  throw new Error(
    `Refusing to run tests against non-test database "${process.env.DB_NAME}"`,
  );
}
