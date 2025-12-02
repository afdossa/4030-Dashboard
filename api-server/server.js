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

// --- Shared Base WHERE Clause ---
const BASE_WHERE = `
    assessed_value IS NOT NULL 
    AND sale_amount IS NOT NULL 
    AND CAST(assessed_value AS numeric) > 1 
    AND CAST(sale_amount AS numeric) > 1
`;

// 3. ROUTES

app.get('/', (req, res) => {
    res.send('Real Estate Data API is running. Use /api/sales to get data.');
});

// Primary route for Scatter Plot data
app.get('/api/sales', async (req, res) => {
    try {
        const limitCount = 10000;
        const maxAssessed = parseFloat(req.query.max_assessed) || 2000000;
        const maxSale = parseFloat(req.query.max_sale) || 1500000;

        let whereClause = BASE_WHERE;

        whereClause += `
            AND CAST(assessed_value AS numeric) <= ${maxAssessed} 
            AND CAST(sale_amount AS numeric) <= ${maxSale}
        `;

        const countQuery = `SELECT COUNT(*) FROM real_estate_sales WHERE ${whereClause};`;
        const countResult = await client.query(countQuery);
        const totalRows = parseInt(countResult.rows[0].count, 10);

        if (totalRows === 0) {
            return res.json([]);
        }

        const maxOffset = Math.max(0, totalRows - limitCount);
        const offset = Math.floor(Math.random() * maxOffset);

        const dataQuery = `
            SELECT
                property_type,
                town,
                serial_number,
                CAST(assessed_value AS numeric) AS assessed_value,
                CAST(sale_amount AS numeric) AS sale_amount
            FROM
                real_estate_sales
            WHERE
                ${whereClause}
                LIMIT ${limitCount} OFFSET ${offset};
        `;

        const result = await client.query(dataQuery);

        console.log(`Querying ${totalRows} total rows. Returning ${result.rows.length} rows with Max Assessed: ${maxAssessed}, Max Sale: ${maxSale}`);

        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});

// Contextual route for the three bar charts
app.get('/api/sales/context', async (req, res) => {
    try {
        const { town, property_type, serial_number } = req.query;

        const isFiltered = town && property_type;
        const filterClause = isFiltered
            ? `AND town = $1 AND property_type = $2`
            : ``;

        const propTypeFilter = isFiltered ? `AND property_type = $1` : ``;
        const paramsFilter = isFiltered ? [property_type] : [];

        // CHART 1: Market Penetration (Count by Town)
        const query1 = `
            SELECT 
                town, 
                COUNT(*) as count
            FROM 
                real_estate_sales
            WHERE 
                ${BASE_WHERE}
                ${propTypeFilter}
            GROUP BY 
                town
            ORDER BY 
                count DESC;
        `;
        const result1 = await client.query(query1, paramsFilter);


        // CHART 2: Comparative Assessed Value
        const query2 = `
            SELECT 
                AVG(CAST(assessed_value AS numeric)) as avg_assessed,
                ${serial_number ? `(SELECT CAST(assessed_value AS numeric) FROM real_estate_sales WHERE serial_number = '${serial_number}') as selected_assessed` : `NULL as selected_assessed`}
            FROM 
                real_estate_sales
            WHERE 
                ${BASE_WHERE}
                ${filterClause};
        `;
        const params2 = isFiltered ? [town, property_type] : [];
        const result2 = await client.query(query2, params2);


        // CHART 3: Sale Price Distribution (Price Buckets)
        const query3 = `
            SELECT
                CASE
                    WHEN CAST(sale_amount AS numeric) < 250000 THEN '0 - 250k'
                    WHEN CAST(sale_amount AS numeric) < 500000 THEN '250k - 500k'
                    WHEN CAST(sale_amount AS numeric) < 750000 THEN '500k - 750k'
                    WHEN CAST(sale_amount AS numeric) < 1000000 THEN '750k - 1M'
                    ELSE '1M+'
                END as price_bucket,
                COUNT(*) as count
            FROM
                real_estate_sales
            WHERE
                ${BASE_WHERE}
                ${propTypeFilter}
            GROUP BY
                price_bucket
            ORDER BY
                MIN(CAST(sale_amount AS numeric));
        `;
        const result3 = await client.query(query3, paramsFilter);

        res.json({
            marketPenetration: result1.rows,
            comparativeAssessed: {
                avg_assessed: result2.rows[0].avg_assessed,
                selected_assessed: result2.rows[0].selected_assessed || null
            },
            saleDistribution: result3.rows,
        });

    } catch (err) {
        console.error('Error executing context query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch contextual data.' });
    }
});

app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
});