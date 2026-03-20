import uvicorn

if __name__ == "__main__":
    # simple local entrypoint so we can run backend with: python run.py
    uvicorn.run("app.main:app", reload=True)
