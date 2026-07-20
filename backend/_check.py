import sqlite3
conn = sqlite3.connect(r"backend\data\te360.db")
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", [t[0] for t in tables])
try:
    rows = conn.execute("SELECT id, email, full_name, is_active FROM citizens ORDER BY id").fetchall()
    for r in rows:
        print(r)
except Exception as e:
    print("Error:", e)
conn.close()
