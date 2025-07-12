// server/db.js

const mysql = require('mysql2');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create connection using environment variables
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skill_swap'
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err.message);
        process.exit(1); // Stop the app if DB fails
    } else {
        console.log('✅ MySQL connected successfully!');
    }
});

module.exports = connection;
