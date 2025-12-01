import pandas as pd
from sqlalchemy import create_engine, text


CSV_PATH = "C:\\Users\\Andre\\Downloads\\Real_Estate_Sales_2001-2023_GL.csv"
TABLE_NAME = "real_estate_sales"
CHUNK_SIZE = 500000

# This URL uses the credentials from your screenshot's 'External Database URL'
DB_URL = "postgresql://db_4030data_user:FeW7oekS13P9up6vTkqqSG14MWwT9ddV@dpg-d4n0224hg0os73c7plug-a.virginia-postgres.render.com/db_4030data"

print("Connecting to database and starting data import...")
# Use the create_engine with the correct URL
engine = create_engine(DB_URL)

try:
    chunk_iter = pd.read_csv(CSV_PATH, chunksize=CHUNK_SIZE, low_memory=False)
except FileNotFoundError:
    print(f"ERROR: CSV file not found at {CSV_PATH}. Please check the path.")
    exit()

for i, chunk in enumerate(chunk_iter, start=1):
    chunk.columns = [c.strip().lower().replace(" ", "_").replace("-", "_") for c in chunk.columns]

    # Cleaning Logic
    if "sales_ratio" in chunk.columns:
        chunk["sales_ratio"] = (
            chunk["sales_ratio"]
            .astype(str)
            .str.replace(",", "", regex=False)
            .replace("nan", None)
            .astype(float)
        )
    for col in ["assessed_value", "sale_amount"]:
        if col in chunk.columns:
            chunk[col] = (
                chunk[col]
                .astype(str)
                .str.replace(",", "", regex=False)
                .replace("nan", None)
                .astype(float)
            )
    if "location" in chunk.columns:
        chunk["location"] = (
            chunk["location"]
            .astype(str)
            .str.replace("POINT ", "", regex=False)
            .str.replace("(", "", regex=False)
            .str.replace(")", "", regex=False)
            .str.strip()
            .replace({"nan": None, "None": None, "": None})
        )

    # Stream to PostgreSQL
    chunk.to_sql(name=TABLE_NAME, con=engine, if_exists="replace" if i == 1 else "append", index=False)
    print(f"Loaded chunk {i} ({len(chunk)} rows)")

print("Import complete.")

with engine.connect() as conn:
    result = conn.execute(text(f"SELECT COUNT(*) FROM {TABLE_NAME}"))
    row_count = result.scalar()
    print(f"Total rows now in '{TABLE_NAME}': {row_count}")