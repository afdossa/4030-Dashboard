const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

// 1. DATABASE CONNECTION CONFIGURATION
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

client.connect()
    .then(() => console.log('API connected successfully to PostgreSQL database'))
    .catch(err => console.error('Database connection error. Ensure the service is linked to the database and credentials are correct.', err.stack));

const app = express();
const PORT = process.env.PORT || 3000;

// 2. CORS POLICY CONFIGURATION
const allowedOrigins = [
    'https://afdossa.github.io',
    'https://four030-dashboard.onrender.com',
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
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
        // FINAL OPTIMIZED QUERY: Removed the problematic regex filter
        const queryText = `
            SELECT 
                property_type, 
                CAST(assessed_value AS numeric) AS assessed_value, 
                CAST(sale_amount AS numeric) AS sale_amount 
            FROM 
                real_estate_sales
            WHERE 
                assessed_value IS NOT NULL 
                AND sale_amount IS NOT NULL 
                -- We only need to check the numeric values now
                AND CAST(assessed_value AS numeric) > 1 
                AND CAST(sale_amount AS numeric) > 1
            ORDER BY RANDOM()
            LIMIT 10000;
        `;

        const result = await client.query(queryText);

        res.json(result.rows);
    } catch (err) {
        // Log the error but don't crash the server
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});

app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
});