const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'your_mysql_password',
  database: 'akonsec_db'
};

// Create a MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
  } else {
    console.log('Connected to MySQL database');
    connection.release();
  }
});

// Middleware to parse JSON bodies
app.use(express.json());

// Set up multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'uploads/'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Create table if not exists
const createStudentsTable = `
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  enrollment_date DATE NOT NULL
);
`;

const createApplicationsTable = `
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  birth_certificate_path VARCHAR(255) NOT NULL,
  passport_photo_path VARCHAR(255) NOT NULL,
  bece_results_path VARCHAR(255) NOT NULL,
  qualification_status VARCHAR(50) DEFAULT 'Pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(createStudentsTable, (err) => {
  if (err) {
    console.error('Error creating students table:', err);
  } else {
    console.log('Students table ensured');
  }
});

pool.query(createApplicationsTable, (err) => {
  if (err) {
    console.error('Error creating applications table:', err);
  } else {
    console.log('Applications table ensured');
  }
});

// CRUD API endpoints for students

// Get all students
app.get('/api/students', (req, res) => {
  pool.query('SELECT * FROM students', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch students' });
    } else {
      res.json(results);
    }
  });
});

// Get student by ID
app.get('/api/students/:id', (req, res) => {
  const studentId = req.params.id;
  pool.query('SELECT * FROM students WHERE id = ?', [studentId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch student' });
    } else if (results.length === 0) {
      res.status(404).json({ error: 'Student not found' });
    } else {
      res.json(results[0]);
    }
  });
});

// Create new student
app.post('/api/students', (req, res) => {
  const { first_name, last_name, email, enrollment_date } = req.body;
  pool.query(
    'INSERT INTO students (first_name, last_name, email, enrollment_date) VALUES (?, ?, ?, ?)',
    [first_name, last_name, email, enrollment_date],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Failed to create student' });
      } else {
        res.status(201).json({ id: results.insertId, first_name, last_name, email, enrollment_date });
      }
    }
  );
});

// Update student by ID
app.put('/api/students/:id', (req, res) => {
  const studentId = req.params.id;
  const { first_name, last_name, email, enrollment_date } = req.body;
  pool.query(
    'UPDATE students SET first_name = ?, last_name = ?, email = ?, enrollment_date = ? WHERE id = ?',
    [first_name, last_name, email, enrollment_date, studentId],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: 'Failed to update student' });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ error: 'Student not found' });
      } else {
        res.json({ id: studentId, first_name, last_name, email, enrollment_date });
      }
    }
  );
});

// Delete student by ID
app.delete('/api/students/:id', (req, res) => {
  const studentId = req.params.id;
  pool.query('DELETE FROM students WHERE id = ?', [studentId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Failed to delete student' });
    } else if (results.affectedRows === 0) {
      res.status(404).json({ error: 'Student not found' });
    } else {
      res.json({ message: 'Student deleted successfully' });
    }
  });
});

// API endpoint to submit application with file uploads
app.post('/api/applications', upload.fields([
  { name: 'birth_certificate', maxCount: 1 },
  { name: 'passport_photo', maxCount: 1 },
  { name: 'bece_results', maxCount: 1 }
]), (req, res) => {
  const { first_name, last_name, email } = req.body;
  const files = req.files;

  if (!first_name || !last_name || !email || !files || !files.birth_certificate || !files.passport_photo || !files.bece_results) {
    return res.status(400).json({ error: 'Missing required fields or files' });
  }

  // Basic qualification logic example: check if email contains '@'
  const qualification_status = email.includes('@') ? 'Qualified' : 'Not Qualified';

  const birthCertificatePath = files.birth_certificate[0].path;
  const passportPhotoPath = files.passport_photo[0].path;
  const beceResultsPath = files.bece_results[0].path;

  pool.query(
    'INSERT INTO applications (first_name, last_name, email, birth_certificate_path, passport_photo_path, bece_results_path, qualification_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [first_name, last_name, email, birthCertificatePath, passportPhotoPath, beceResultsPath, qualification_status],
    (err, results) => {
      if (err) {
        console.error('Error inserting application:', err);
        return res.status(500).json({ error: 'Failed to submit application' });
      }
      res.status(201).json({ message: 'Application submitted successfully', id: results.insertId, qualification_status });
    }
  );
});

// Sample API endpoint to get a welcome message
app.get('/api/welcome', (req, res) => {
  res.json({ message: 'Welcome to Akontombra Senior High School API!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
