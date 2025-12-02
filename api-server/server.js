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
        const limitCount = 10000;

        // Extract filter parameters from the request query string
        // Use defaults that match your visualization axes (2.0M and 1.5M)
        const maxAssessed = parseFloat(req.query.max_assessed) || 2000000;
        const maxSale = parseFloat(req.query.max_sale) || 1500000;

        // Base cleaning filters: ensures non-null, numeric, and > 1
        let whereClause = `
            assessed_value IS NOT NULL 
            AND sale_amount IS NOT NULL 
            AND CAST(assessed_value AS numeric) > 1 
            AND CAST(sale_amount AS numeric) > 1
        `;

        // Add dynamic axis filters based on URL parameters
        // This makes the API responsive to your Power BI axis limits
        whereClause += `
            AND CAST(assessed_value AS numeric) <= ${maxAssessed} 
            AND CAST(sale_amount AS numeric) <= ${maxSale}
        `;

        // 1. Get the total count of filtered rows
        const countQuery = `
            SELECT COUNT(*) FROM real_estate_sales WHERE ${whereClause};
        `;
        const countResult = await client.query(countQuery);
        const totalRows = parseInt(countResult.rows[0].count, 10);

        // Handle case where no rows are returned
        if (totalRows === 0) {
            return res.json([]);
        }

        // 2. Calculate a random offset to sample data
        const maxOffset = Math.max(0, totalRows - limitCount);
        const offset = Math.floor(Math.random() * maxOffset);

        // 3. Fetch the data using the random OFFSET
        const dataQuery = `
            SELECT 
                property_type, 
                CAST(assessed_value AS numeric) AS assessed_value, 
                CAST(sale_amount AS numeric) AS sale_amount 
            FROM 
                real_estate_sales
            WHERE 
                ${whereClause}
            LIMIT ${limitCount} OFFSET ${offset};
        `;

        const result = await client.query(dataQuery);

        // Optional: Log the filters applied for debugging
        console.log(`Querying ${totalRows} total rows. Returning ${result.rows.length} rows with Max Assessed: ${maxAssessed}, Max Sale: ${maxSale}`);

        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});

app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
});