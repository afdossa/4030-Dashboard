app.get('/api/sales', async (req, res) => {
    try {
        // Define the WHERE clause filters once
        const whereClause = `
            assessed_value IS NOT NULL 
            AND sale_amount IS NOT NULL 
            AND CAST(assessed_value AS numeric) > 1 
            AND CAST(sale_amount AS numeric) > 1
        `;
        const limitCount = 10000;

        // 1. Get the total count of filtered rows
        const countQuery = `
            SELECT COUNT(*) FROM real_estate_sales WHERE ${whereClause};
        `;
        const countResult = await client.query(countQuery);
        const totalRows = parseInt(countResult.rows[0].count, 10);

        // 2. Calculate a random offset
        const offset = Math.floor(Math.random() * (totalRows - limitCount));

        // 3. Fetch the data using the random OFFSET (MUCH faster than ORDER BY RANDOM)
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

        res.json(result.rows);
    } catch (err) {
        console.error('Error executing query:', err.stack);
        res.status(500).json({ error: 'Failed to fetch data from the database.' });
    }
});