"""
BedrockMate 2025 - FastAPI Server
Tier 2: Data Management Server
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from database import init_db, get_db
from routers import seeds, bookmarks, jobs

# アプリケーション起動時にDBを初期化
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="BedrockMate 2025 API",
    description="Minecraft Bedrock Edition用の便利ツールAPI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発用。本番では制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを追加
app.include_router(seeds.router, prefix="/api/seeds", tags=["Seeds"])
app.include_router(bookmarks.router, prefix="/api/bookmarks", tags=["Bookmarks"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])

# 静的ファイルを提供（親ディレクトリ）
app.mount("/css", StaticFiles(directory="../css"), name="css")
app.mount("/js", StaticFiles(directory="../js"), name="js")

# テンプレート設定
templates = Jinja2Templates(directory="templates")


@app.get("/api/health")
async def health_check():
    """
    ヘルスチェックエンドポイント
    フロントエンドがサーバー接続を確認するために使用
    """
    return {"status": "ok", "server": "BedrockMate 2025", "tier": 2}


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    メインページを返す
    """
    return templates.TemplateResponse("index.html", {"request": request})


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
