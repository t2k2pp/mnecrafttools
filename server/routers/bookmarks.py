"""
BedrockMate 2025 - Bookmarks Router
座標ブックマーク管理API
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import database as db

router = APIRouter()


# ==================== Pydantic Models ====================

class BookmarkCreate(BaseModel):
    world_id: int
    name: str
    x: int
    y: int = 64
    z: int
    dimension: str = "overworld"
    category: Optional[str] = None
    icon: str = "📍"
    notes: Optional[str] = None


class BookmarkUpdate(BaseModel):
    name: Optional[str] = None
    x: Optional[int] = None
    y: Optional[int] = None
    z: Optional[int] = None
    dimension: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    notes: Optional[str] = None


class BookmarkResponse(BaseModel):
    id: int
    world_id: int
    name: str
    x: int
    y: int
    z: int
    dimension: str
    category: Optional[str]
    icon: str
    notes: Optional[str]
    created_at: str
    updated_at: str


# ==================== Constants ====================

DIMENSION_NAMES = {
    "overworld": "オーバーワールド",
    "nether": "ネザー",
    "end": "ジ・エンド"
}

CATEGORY_ICONS = {
    "base": "🏠",
    "village": "🏘️",
    "structure": "🏰",
    "resource": "💎",
    "farm": "🌾",
    "portal": "🌀",
    "other": "📍"
}


# ==================== API Endpoints ====================

@router.get("", response_model=List[BookmarkResponse])
async def list_bookmarks(world_id: int = Query(...)):
    """
    ワールドのブックマークを取得
    """
    bookmarks = db.get_bookmarks_by_world(world_id)
    return bookmarks


@router.post("", response_model=BookmarkResponse)
async def create_bookmark(bookmark: BookmarkCreate):
    """
    新しいブックマークを作成
    """
    bookmark_id = db.create_bookmark(
        world_id=bookmark.world_id,
        name=bookmark.name,
        x=bookmark.x,
        y=bookmark.y,
        z=bookmark.z,
        dimension=bookmark.dimension,
        category=bookmark.category,
        icon=bookmark.icon,
        notes=bookmark.notes
    )
    new_bookmark = db.get_bookmark(bookmark_id)
    if not new_bookmark:
        raise HTTPException(status_code=500, detail="Failed to create bookmark")
    return new_bookmark


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
async def get_bookmark(bookmark_id: int):
    """
    IDでブックマークを取得
    """
    bookmark = db.get_bookmark(bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.put("/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(bookmark_id: int, bookmark: BookmarkUpdate):
    """
    ブックマークを更新
    """
    update_data = bookmark.model_dump(exclude_unset=True)
    success = db.update_bookmark(bookmark_id, **update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    updated_bookmark = db.get_bookmark(bookmark_id)
    return updated_bookmark


@router.delete("/{bookmark_id}")
async def delete_bookmark(bookmark_id: int):
    """
    ブックマークを削除
    """
    success = db.delete_bookmark(bookmark_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Bookmark deleted", "bookmark_id": bookmark_id}


# ==================== HTMX Endpoints ====================

@router.get("/htmx/list", response_class=HTMLResponse)
async def htmx_bookmark_list(world_id: int = Query(...)):
    """
    ブックマークリストのHTMLを返す（htmx用）
    """
    bookmarks = db.get_bookmarks_by_world(world_id)
    
    html = ""
    current_category = None
    
    for bm in bookmarks:
        # カテゴリヘッダー
        if bm['category'] != current_category:
            current_category = bm['category']
            cat_name = current_category or "その他"
            cat_icon = CATEGORY_ICONS.get(current_category, "📍")
            html += f'<h4 class="text-mc-gold font-bold mt-4 mb-2">{cat_icon} {cat_name}</h4>'
        
        dim_name = DIMENSION_NAMES.get(bm['dimension'], bm['dimension'])
        dim_color = "text-red-400" if bm['dimension'] == "nether" else "text-purple-400" if bm['dimension'] == "end" else "text-green-400"
        
        html += f'''
        <div class="p-3 bg-mc-obsidian rounded-lg border border-mc-stone mb-2 flex justify-between items-center" 
             id="bookmark-{bm['id']}">
            <div>
                <div class="flex items-center gap-2">
                    <span>{bm['icon']}</span>
                    <span class="font-bold">{bm['name']}</span>
                    <span class="text-xs {dim_color}">({dim_name})</span>
                </div>
                <p class="text-sm text-mc-diamond mt-1">
                    X: {bm['x']}, Y: {bm['y']}, Z: {bm['z']}
                </p>
                {f'<p class="text-xs text-gray-400 mt-1">{bm["notes"]}</p>' if bm['notes'] else ''}
            </div>
            <div class="flex gap-2">
                <button onclick="copyCoords({bm['x']}, {bm['y']}, {bm['z']})"
                        class="px-2 py-1 bg-mc-stone hover:bg-mc-grass-dark rounded text-sm"
                        title="座標をコピー">
                    📋
                </button>
                <button hx-delete="/api/bookmarks/{bm['id']}" 
                        hx-target="#bookmark-{bm['id']}" 
                        hx-swap="outerHTML"
                        class="px-2 py-1 bg-mc-redstone hover:bg-red-700 rounded text-sm"
                        title="削除">
                    🗑️
                </button>
            </div>
        </div>
        '''
    
    if not bookmarks:
        html = '<p class="text-gray-400 text-center py-8">ブックマークがありません。追加してね！</p>'
    
    return html
