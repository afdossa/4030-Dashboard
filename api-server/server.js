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

// Primary route for Scatter Plot data (unchanged from your input)
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

// --- NEW CONTEXTUAL ROUTE ---
app.get('/api/sales/context', async (req, res) => {
    try {
        const { town, property_type, serial_number } = req.query;

        // Determine if we are filtering or showing global data
        const isFiltered = town && property_type;
        const filterClause = isFiltered
            ? `AND town = $1 AND property_type = $2`
            : ``; // If not filtered, the where clause ends here
        const queryParams = isFiltered ? [town, property_type] : [];

        // ----------------------------------------------------
        // CHART 1: Market Penetration (Count by Town)
        // Default: Count of ALL Property Types by Town
        // Filtered: Count of SELECTED Property Type by Town
        // ----------------------------------------------------
        const propTypeFilter1 = isFiltered ? `AND property_type = $2` : ``;
        const query1 = `
            SELECT 
                town, 
                COUNT(*) as count
            FROM 
                real_estate_sales
            WHERE 
                ${BASE_WHERE}
                ${isFiltered ? propTypeFilter1 : ``}
            GROUP BY 
                town
            ORDER BY 
                count DESC;
        `;
        // Only include property_type if filtered. We use $2 if filtered, otherwise no param needed.
        const params1 = isFiltered ? [town, property_type] : [];
        const result1 = await client.query(query1, params1.slice(1)); // Pass property_type filter only if needed


        // ----------------------------------------------------
        // CHART 2: Comparative Assessed Value
        // Default: Average Assessed Value across ALL sales.
        // Filtered: Average Assessed Value for selected Town and Property Type.
        // ----------------------------------------------------
        const query2 = `
            SELECT 
                AVG(CAST(assessed_value AS numeric)) as avg_assessed,
                -- Only fetch selected_assessed if a serial_number is provided
                ${serial_number ? `(SELECT CAST(assessed_value AS numeric) FROM real_estate_sales WHERE serial_number = '${serial_number}') as selected_assessed` : `NULL as selected_assessed`}
            FROM 
                real_estate_sales
            WHERE 
                ${BASE_WHERE}
                ${filterClause};
        `;
        // Use [town, property_type] as parameters only if filtered
        const params2 = isFiltered ? [town, property_type] : [];
        const result2 = await client.query(query2, params2);

        // ----------------------------------------------------
        // CHART 3: Sale Price Distribution (Price Buckets)
        // Default: Distribution across ALL Property Types.
        // Filtered: Distribution for SELECTED Property Type.
        // ----------------------------------------------------
        const propTypeFilter3 = isFiltered ? `AND property_type = $2` : ``;
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
                ${isFiltered ? propTypeFilter3 : ``}
            GROUP BY
                price_bucket
            ORDER BY
                MIN(CAST(sale_amount AS numeric));
        `;
        const params3 = isFiltered ? [town, property_type] : [];
        const result3 = await client.query(query3, params3.slice(1));

        res.json({
            marketPenetration: result1.rows,
            comparativeAssessed: {
                avg_assessed: result2.rows[0].avg_assessed,
                selected_assessed: result2.rows[0].selected_assessed || null // Ensure null if not filtered
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