"""
BedrockMate 2025 - Jobs Router
計算ジョブ管理API（非同期計算用）
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import database as db

router = APIRouter()


# ==================== Pydantic Models ====================

class JobCreate(BaseModel):
    world_id: int
    job_type: str  # "structures", "biome", etc.
    parameters: Optional[dict] = None


class JobResponse(BaseModel):
    id: int
    world_id: int
    job_type: str
    parameters: Optional[str]
    status: str
    progress: int
    result: Optional[str]
    error_message: Optional[str]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]


# ==================== Job Types ====================

JOB_TYPES = {
    "structures": {
        "name": "構造物マップ",
        "description": "村、ネザー要塞などの座標を計算",
        "icon": "🗺️"
    },
    "biome": {
        "name": "バイオーム検索",
        "description": "最寄りのバイオームを検索",
        "icon": "🌴"
    },
    "slime_map": {
        "name": "スライムマップ",
        "description": "広域のスライムチャンクマップを生成",
        "icon": "🟢"
    }
}


# ==================== Background Tasks ====================

import subprocess
import os
from pathlib import Path

# Rust CLI パス
RUST_CLI_PATH = Path(__file__).parent.parent.parent / "rust-cli" / "target" / "release" / "bedrockmate.exe"


def process_job(job_id: int):
    """
    バックグラウンドでジョブを処理
    Rust CLIを呼び出して計算を実行
    """
    job = db.get_job(job_id)
    if not job:
        return
    
    try:
        # ジョブを開始状態に
        db.update_job_status(job_id, "running", progress=0)
        
        world = db.get_world(job['world_id'])
        if not world:
            db.update_job_status(job_id, "failed", error_message="World not found")
            return
        
        seed = world['seed']
        job_type = job['job_type']
        params = json.loads(job['parameters']) if job['parameters'] else {}
        
        result = None
        
        if job_type == "structures":
            # 構造物検索
            center_x = params.get("center_x", 0)
            center_z = params.get("center_z", 0)
            radius = params.get("radius", 5000)
            structure_type = params.get("structure_type", "all")
            
            cmd = [
                str(RUST_CLI_PATH),
                "structures",
                "--seed", str(seed),
                "-x", str(center_x),
                "-z", str(center_z),
                "--radius", str(radius),
                "-t", structure_type,
                "--output", "json"
            ]
            
            db.update_job_status(job_id, "running", progress=50)
            
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if proc.returncode == 0:
                result = json.loads(proc.stdout)
            else:
                raise Exception(f"CLI error: {proc.stderr}")
                
        elif job_type == "biome":
            # バイオーム検索
            center_x = params.get("center_x", 0)
            center_z = params.get("center_z", 0)
            radius = params.get("radius", 10000)
            target_biome = params.get("target", "jungle")
            
            cmd = [
                str(RUST_CLI_PATH),
                "biome",
                "--seed", str(seed),
                "-x", str(center_x),
                "-z", str(center_z),
                "--radius", str(radius),
                "-t", target_biome,
                "--output", "json"
            ]
            
            db.update_job_status(job_id, "running", progress=50)
            
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if proc.returncode == 0:
                result = json.loads(proc.stdout)
            else:
                raise Exception(f"CLI error: {proc.stderr}")
                
        elif job_type == "slime_map":
            # スライムマップ（Tier 1でも可能だが広域版）
            # Bedrock版はシード不要なので、範囲だけで計算
            center_x = params.get("center_x", 0)
            center_z = params.get("center_z", 0)
            radius = params.get("radius", 1000)
            
            # スライムチャンクはJSで計算可能なので、ここでは簡易実装
            slime_chunks = []
            chunk_cx = center_x // 16
            chunk_cz = center_z // 16
            chunk_radius = radius // 16
            
            for dx in range(-chunk_radius, chunk_radius + 1):
                for dz in range(-chunk_radius, chunk_radius + 1):
                    cx = chunk_cx + dx
                    cz = chunk_cz + dz
                    # Bedrock slime chunk algorithm (seed independent)
                    v = (
                        (cx * cx * 4987142)
                        + (cx * 5947611)
                        + (cz * cz * 4392871)
                        + (cz * 389711)
                    ) & 0xFFFFFFFF
                    v = ((v >> 17) ^ v) & 0xFFFFFFFF
                    is_slime = (v % 10) == 0
                    if is_slime:
                        slime_chunks.append({"x": cx * 16 + 8, "z": cz * 16 + 8})
            
            result = {
                "center_x": center_x,
                "center_z": center_z,
                "radius": radius,
                "slime_chunks": slime_chunks[:100]  # 最大100件
            }
        else:
            raise Exception(f"Unknown job type: {job_type}")
        
        db.update_job_status(
            job_id, 
            "completed", 
            progress=100, 
            result=json.dumps(result, ensure_ascii=False)
        )
        
    except Exception as e:
        db.update_job_status(job_id, "failed", error_message=str(e))


# ==================== API Endpoints ====================

@router.get("/types")
async def list_job_types():
    """
    利用可能なジョブタイプを取得
    """
    return JOB_TYPES


@router.get("", response_model=List[JobResponse])
async def list_jobs(world_id: int = Query(...), status: Optional[str] = None):
    """
    ワールドのジョブを取得
    """
    jobs = db.get_jobs_by_world(world_id, status)
    return jobs


@router.post("", response_model=JobResponse)
async def create_job(job: JobCreate, background_tasks: BackgroundTasks):
    """
    新しいジョブを作成して開始
    """
    if job.job_type not in JOB_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown job type: {job.job_type}")
    
    # 世界の存在確認
    world = db.get_world(job.world_id)
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    
    # パラメータをJSON文字列に
    params_str = json.dumps(job.parameters, ensure_ascii=False) if job.parameters else None
    
    # ジョブを作成
    job_id = db.create_job(job.world_id, job.job_type, params_str)
    
    # バックグラウンドで処理を開始
    background_tasks.add_task(process_job, job_id)
    
    new_job = db.get_job(job_id)
    if not new_job:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return new_job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int):
    """
    ジョブの状態を取得
    """
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
async def delete_job(job_id: int):
    """
    ジョブを削除
    """
    success = db.delete_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted", "job_id": job_id}


# ==================== HTMX Endpoints ====================

@router.get("/htmx/list", response_class=HTMLResponse)
async def htmx_job_list(world_id: int = Query(...)):
    """
    ジョブリストのHTMLを返す（htmx用）
    """
    jobs = db.get_jobs_by_world(world_id)
    
    html = ""
    for job in jobs:
        job_info = JOB_TYPES.get(job['job_type'], {"name": job['job_type'], "icon": "⚙️"})
        
        # ステータスに応じた色とアイコン
        status_map = {
            "pending": ("bg-yellow-900/30 border-yellow-600", "⏳", "待機中"),
            "running": ("bg-blue-900/30 border-blue-500", "🔄", f"実行中 ({job['progress']}%)"),
            "completed": ("bg-green-900/30 border-green-500", "✅", "完了"),
            "failed": ("bg-red-900/30 border-red-600", "❌", "エラー")
        }
        status_class, status_icon, status_text = status_map.get(
            job['status'], 
            ("bg-mc-obsidian border-mc-stone", "❓", job['status'])
        )
        
        html += f'''
        <div class="p-4 rounded-lg border {status_class} mb-2" id="job-{job['id']}"
             {"hx-get='/api/jobs/" + str(job['id']) + "' hx-trigger='every 2s' hx-swap='outerHTML'" if job['status'] in ('pending', 'running') else ""}>
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold flex items-center gap-2">
                        {job_info['icon']} {job_info['name']}
                    </h3>
                    <p class="text-sm text-gray-400 mt-1">
                        {status_icon} {status_text}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        作成: {job['created_at'][:16]}
                    </p>
                </div>
                <div class="flex gap-2">
                    {"<button class='px-3 py-1 bg-mc-diamond hover:bg-blue-500 rounded text-sm text-mc-obsidian' onclick='showJobResult(" + str(job['id']) + ")'>結果を見る</button>" if job['status'] == 'completed' else ""}
                    <button hx-delete="/api/jobs/{job['id']}" 
                            hx-target="#job-{job['id']}" 
                            hx-swap="outerHTML"
                            class="px-3 py-1 bg-mc-stone hover:bg-mc-redstone rounded text-sm">
                        🗑️
                    </button>
                </div>
            </div>
            {f'<div class="mt-2 text-sm text-red-400">{job["error_message"]}</div>' if job['error_message'] else ''}
        </div>
        '''
    
    if not jobs:
        html = '<p class="text-gray-400 text-center py-8">ジョブがありません。</p>'
    
    return html
