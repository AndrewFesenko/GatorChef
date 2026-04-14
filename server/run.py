import uvicorn
from pathlib import Path

if __name__ == "__main__":
    # simple local entrypoint so we can run backend with python run.py
    server_dir = Path(__file__).resolve().parent
    uvicorn.run("app.main:app", reload=True, reload_dirs=[str(server_dir)])
