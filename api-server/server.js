const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// 1. DATABASE CONNECTION CONFIGURATION
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // Necessary for Render's external connections if using SSL
    ssl: { rejectUnauthorized: false },
});

client.connect()
    .then(() => console.log('API connected successfully to PostgreSQL database'))
    .catch(err => console.error('Database connection error. Ensure the service is linked to the database and credentials are correct.', err.stack));

const app = express();
// Ensure the port is correctly grabbed from the environment
const PORT = process.env.PORT || 3000;

// 2. CORS POLICY CONFIGURATION
const allowedOrigins = [
    'https://afdossa.github.io', // Your GitHub Pages domain
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
        // OPTIMIZED QUERY FOR SCATTER PLOT
        const queryText = `
            SELECT
                property_type,
                assessed_value::numeric,
                sale_amount::numeric
            FROM
                real_estate_sales
            WHERE
                assessed_value IS NOT NULL
              AND sale_amount IS NOT NULL
              AND assessed_value > 0
              AND sale_amount > 0
            ORDER BY RANDOM()
                LIMIT 10000;
        `;

        const result = await client.query(queryText);

        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});

app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
});