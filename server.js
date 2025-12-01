// server.js
const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// Render automatically provides the DATABASE_URL environment variable when the
// Web Service is linked to the PostgreSQL service during deployment configuration.
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // Required by Render for secure connections
    ssl: { rejectUnauthorized: false },
});

// Attempt to connect to the database
client.connect()
    .then(() => console.log('API connected successfully to PostgreSQL database'))
    .catch(err => console.error('Database connection error. Ensure the service is linked to the database and credentials are correct.', err.stack));

const app = express();
// Render sets the PORT environment variable; use 3000 as a default for local testing
const PORT = process.env.PORT || 3000;

// Middleware to allow cross-origin requests from your React front-end
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Real Estate Data API is running.');
});

// Main endpoint to fetch all sales data
app.get('/api/sales', async (req, res) => {
    try {
        // Query to retrieve all rows from the table populated by the Python script
        const result = await client.query('SELECT * FROM real_estate_sales');

        // Respond with the JSON array of data
        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});

app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
});