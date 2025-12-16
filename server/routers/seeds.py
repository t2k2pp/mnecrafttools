"""
BedrockMate 2025 - Seeds Router
ワールド/シード値管理API
"""

from fastapi import APIRouter, HTTPException, Request, Form
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import database as db

router = APIRouter()


# ==================== Pydantic Models ====================

class WorldCreate(BaseModel):
    name: str
    seed: str
    description: Optional[str] = None


class WorldUpdate(BaseModel):
    name: Optional[str] = None
    seed: Optional[str] = None
    description: Optional[str] = None


class WorldResponse(BaseModel):
    id: int
    name: str
    seed: str
    description: Optional[str]
    is_active: int
    created_at: str
    updated_at: str


# ==================== API Endpoints ====================

@router.get("", response_model=List[WorldResponse])
async def list_worlds():
    """
    全てのワールドを取得
    """
    worlds = db.get_all_worlds()
    return worlds


@router.post("", response_model=WorldResponse)
async def create_world(world: WorldCreate):
    """
    新しいワールドを作成
    """
    world_id = db.create_world(world.name, world.seed, world.description)
    new_world = db.get_world(world_id)
    if not new_world:
        raise HTTPException(status_code=500, detail="Failed to create world")
    return new_world


@router.get("/active", response_model=Optional[WorldResponse])
async def get_active_world():
    """
    アクティブなワールドを取得
    """
    world = db.get_active_world()
    return world


@router.get("/{world_id}", response_model=WorldResponse)
async def get_world(world_id: int):
    """
    IDでワールドを取得
    """
    world = db.get_world(world_id)
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    return world


@router.put("/{world_id}", response_model=WorldResponse)
async def update_world(world_id: int, world: WorldUpdate):
    """
    ワールドを更新
    """
    success = db.update_world(
        world_id,
        name=world.name,
        seed=world.seed,
        description=world.description
    )
    if not success:
        raise HTTPException(status_code=404, detail="World not found")
    
    updated_world = db.get_world(world_id)
    return updated_world


@router.post("/{world_id}/activate")
async def activate_world(world_id: int):
    """
    ワールドをアクティブに設定
    """
    success = db.set_active_world(world_id)
    if not success:
        raise HTTPException(status_code=404, detail="World not found")
    return {"message": "World activated", "world_id": world_id}


@router.delete("/{world_id}")
async def delete_world(world_id: int):
    """
    ワールドを削除
    """
    success = db.delete_world(world_id)
    if not success:
        raise HTTPException(status_code=404, detail="World not found")
    return {"message": "World deleted", "world_id": world_id}


# ==================== HTMX Endpoints ====================

@router.post("/htmx/create", response_class=HTMLResponse)
async def htmx_create_world(
    name: str = Form(...),
    seed: str = Form(...),
    description: str = Form(None)
):
    """
    htmx用：フォームデータからワールドを作成し、リストHTMLを返す
    """
    try:
        world_id = db.create_world(name, seed, description)
        if not world_id:
            return '<p class="text-red-400">エラー: ワールドを作成できませんでした</p>'
    except Exception as e:
        return f'<p class="text-red-400">エラー: {str(e)}</p>'
    
    # 更新されたリストを返す
    return await htmx_world_list(None)


@router.get("/htmx/list", response_class=HTMLResponse)
async def htmx_world_list(request: Request):
    """
    ワールドリストのHTMLを返す（htmx用）
    """
    worlds = db.get_all_worlds()
    
    html = ""
    for world in worlds:
        active_class = "bg-green-900/30 border-green-500" if world['is_active'] else "bg-mc-obsidian border-mc-stone"
        active_badge = '<span class="text-xs bg-green-600 px-2 py-0.5 rounded-full ml-2">アクティブ</span>' if world['is_active'] else ''
        
        html += f'''
        <div class="p-4 rounded-lg border {active_class} mb-2" id="world-{world['id']}">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg flex items-center">
                        🌍 {world['name']}{active_badge}
                    </h3>
                    <p class="text-sm text-mc-gold mt-1">シード: {world['seed']}</p>
                    <p class="text-xs text-gray-400 mt-1">{world['description'] or ''}</p>
                </div>
                <div class="flex gap-2">
                    <button hx-post="/api/seeds/{world['id']}/activate" 
                            hx-target="#world-list" 
                            hx-swap="innerHTML"
                            class="px-3 py-1 bg-mc-grass hover:bg-mc-grass-dark rounded text-sm"
                            {"disabled" if world['is_active'] else ""}>
                        ✓ 使う
                    </button>
                    <button hx-delete="/api/seeds/{world['id']}" 
                            hx-target="#world-{world['id']}" 
                            hx-swap="outerHTML"
                            hx-confirm="本当に削除しますか？"
                            class="px-3 py-1 bg-mc-redstone hover:bg-red-700 rounded text-sm">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
        '''
    
    if not worlds:
        html = '<p class="text-gray-400 text-center py-8">ワールドがありません。追加してね！</p>'
    
    return html

