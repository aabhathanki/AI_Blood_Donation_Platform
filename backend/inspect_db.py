from sqlalchemy import inspect
from app.database import engine

def inspect_database():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("=" * 60)
    print("DATABASE FILE: backend/blood_donation.db (SQLite)")
    print("=" * 60)
    print(f"Total Tables Found: {len(tables)}\n")

    for t in tables:
        columns = [col['name'] for col in inspector.get_columns(t)]
        print(f"[*] Table: {t}")
        print(f"   Columns: {', '.join(columns)}")
        print("-" * 60)

if __name__ == "__main__":
    inspect_database()
