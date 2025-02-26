const { Client } = require("pg");
const express = require("express");
const path = require("path");
//envDatabaseUrl = process.env.DATABASE_URL || "postgres://rashena:2001@localhost:5432/acme_clients_db";
envDatabaseUrl = process.env.DATABASE_URL || "postgres://postgres@localhost:5432/acme_clients_db";
const dbClient = new Client(envDatabaseUrl);
const app = express();

// Middleware setup
app.use(express.json());
// app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "../client/dist")));

// Fetch all employees
app.get("/api/employees", async (req, res, next) => {
  try {
    const query = "SELECT * FROM employees";
    const { rows } = await dbClient.query(query);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Fetch all departments
app.get("/api/departments", async (req, res, next) => {
  try {
    const query = "SELECT * FROM departments";
    const { rows } = await dbClient.query(query);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Add a new employee
app.post("/api/employees", async (req, res, next) => {
  try {
    const insertQuery = `
      INSERT INTO employees(name, department_id)
      VALUES($1, (SELECT id FROM departments WHERE name = $2))
      RETURNING *`;
    const response = [req.body.name, req.body.department];
    const { rows } = await dbClient.query(insertQuery, response);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// Remove an employee
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const deleteQuery = "DELETE FROM employees WHERE id = $1";
    await dbClient.query(deleteQuery, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// Update employee details
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const updateQuery = `
      UPDATE employees
      SET name = $1, department_id = (SELECT id FROM departments WHERE name = $2), updated_at = now()
      WHERE id = $3
      RETURNING *`;
    const response = [req.body.name, req.body.department, req.params.id];
    const { rows } = await dbClient.query(updateQuery, response);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// Database initialization
const initializeDatabase = async () => {
  await dbClient.connect();
  const setupSQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;

    CREATE TABLE departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL
    );

    CREATE TABLE employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      department_id INTEGER REFERENCES departments(id) NOT NULL
    );

    INSERT INTO departments (name) VALUES ('accounting'), ('marketing'), ('tech'), ('human resources');
    INSERT INTO employees (name, department_id) 
    VALUES 
      ('Leah', (SELECT id FROM departments WHERE name = 'accounting')),
      ('Amanada', (SELECT id FROM departments WHERE name = 'marketing')),
      ('Maya', (SELECT id FROM departments WHERE name = 'tech')),
      ('John', (SELECT id FROM departments WHERE name = 'human resources'));
  `;

  await dbClient.query(setupSQL);
  console.log("Database seeded successfully.");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`app running on port ${port}`));
};

initializeDatabase();
