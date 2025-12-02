const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// 1. DATABASE CONNECTION CONFIGURATION
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Necessary for Render's external connections
});

client.connect()
    .then(() => console.log('API connected successfully to PostgreSQL database'))
    .catch(err => console.error('Database connection error. Ensure the service is linked to the database and credentials are correct.', err.stack));

const app = express();
// Ensure the port is correctly grabbed from the environment
const PORT = process.env.PORT || 3000;

// 2. CORS POLICY CONFIGURATION (FIX)
const allowedOrigins = [
    'https://afdossa.github.io', // **CRITICAL FIX: Allows your GitHub Pages domain to access the API**
    'https://four030-dashboard.onrender.com',
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// 3. ROUTES
app.get('/', (req, res) => {
    res.send('Real Estate Data API is running. Use /api/sales to get data.');
});

app.get('/api/sales', async (req, res) => {
    try {
        // **CRITICAL FIX: LIMIT the query to prevent Node.js Heap Out of Memory crash**
        const result = await client.query('SELECT * FROM real_estate_sales LIMIT 1000');

        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});

app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
});