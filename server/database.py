"""
BedrockMate 2025 - Database Module
SQLite Database for seed management, bookmarks, and job tracking
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

# データベースファイルのパス
DB_PATH = Path(__file__).parent / "bedrockmate.db"


def get_connection():
    """データベース接続を取得"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """データベース接続のコンテキストマネージャー"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_db():
    """データベースを初期化"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # ワールド/シード管理テーブル
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS worlds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                seed TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 座標ブックマークテーブル
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                world_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER DEFAULT 64,
                z INTEGER NOT NULL,
                dimension TEXT DEFAULT 'overworld',
                category TEXT,
                icon TEXT DEFAULT '📍',
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
            )
        """)
        
        # 計算ジョブテーブル
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                world_id INTEGER NOT NULL,
                job_type TEXT NOT NULL,
                parameters TEXT,
                status TEXT DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                result TEXT,
                error_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                completed_at TEXT,
                FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
            )
        """)
        
        # インデックス作成
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookmarks_world ON bookmarks(world_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_world ON jobs(world_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)")


# ==================== World/Seed Operations ====================

def create_world(name: str, seed: str, description: str = None) -> int:
    """新しいワールドを作成"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO worlds (name, seed, description) VALUES (?, ?, ?)",
            (name, seed, description)
        )
        return cursor.lastrowid


def get_all_worlds() -> List[Dict]:
    """全てのワールドを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM worlds ORDER BY is_active DESC, updated_at DESC")
        return [dict(row) for row in cursor.fetchall()]


def get_world(world_id: int) -> Optional[Dict]:
    """IDでワールドを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM worlds WHERE id = ?", (world_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_active_world() -> Optional[Dict]:
    """アクティブなワールドを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM worlds WHERE is_active = 1 LIMIT 1")
        row = cursor.fetchone()
        return dict(row) if row else None


def set_active_world(world_id: int) -> bool:
    """ワールドをアクティブに設定"""
    with get_db() as conn:
        cursor = conn.cursor()
        # 全てのワールドを非アクティブに
        cursor.execute("UPDATE worlds SET is_active = 0")
        # 指定したワールドをアクティブに
        cursor.execute("UPDATE worlds SET is_active = 1 WHERE id = ?", (world_id,))
        return cursor.rowcount > 0


def update_world(world_id: int, name: str = None, seed: str = None, description: str = None) -> bool:
    """ワールドを更新"""
    updates = []
    params = []
    
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if seed is not None:
        updates.append("seed = ?")
        params.append(seed)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    
    if not updates:
        return False
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(world_id)
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE worlds SET {', '.join(updates)} WHERE id = ?",
            params
        )
        return cursor.rowcount > 0


def delete_world(world_id: int) -> bool:
    """ワールドを削除"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM worlds WHERE id = ?", (world_id,))
        return cursor.rowcount > 0


# ==================== Bookmark Operations ====================

def create_bookmark(world_id: int, name: str, x: int, y: int, z: int,
                    dimension: str = "overworld", category: str = None,
                    icon: str = "📍", notes: str = None) -> int:
    """新しいブックマークを作成"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO bookmarks 
               (world_id, name, x, y, z, dimension, category, icon, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (world_id, name, x, y, z, dimension, category, icon, notes)
        )
        return cursor.lastrowid


def get_bookmarks_by_world(world_id: int) -> List[Dict]:
    """ワールドのブックマークを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM bookmarks WHERE world_id = ? ORDER BY category, name",
            (world_id,)
        )
        return [dict(row) for row in cursor.fetchall()]


def get_bookmark(bookmark_id: int) -> Optional[Dict]:
    """IDでブックマークを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bookmarks WHERE id = ?", (bookmark_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_bookmark(bookmark_id: int, **kwargs) -> bool:
    """ブックマークを更新"""
    allowed_fields = {'name', 'x', 'y', 'z', 'dimension', 'category', 'icon', 'notes'}
    updates = []
    params = []
    
    for key, value in kwargs.items():
        if key in allowed_fields and value is not None:
            updates.append(f"{key} = ?")
            params.append(value)
    
    if not updates:
        return False
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(bookmark_id)
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE bookmarks SET {', '.join(updates)} WHERE id = ?",
            params
        )
        return cursor.rowcount > 0


def delete_bookmark(bookmark_id: int) -> bool:
    """ブックマークを削除"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM bookmarks WHERE id = ?", (bookmark_id,))
        return cursor.rowcount > 0


# ==================== Job Operations ====================

def create_job(world_id: int, job_type: str, parameters: str = None) -> int:
    """新しいジョブを作成"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO jobs (world_id, job_type, parameters) VALUES (?, ?, ?)",
            (world_id, job_type, parameters)
        )
        return cursor.lastrowid


def get_job(job_id: int) -> Optional[Dict]:
    """IDでジョブを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_jobs_by_world(world_id: int, status: str = None) -> List[Dict]:
    """ワールドのジョブを取得"""
    with get_db() as conn:
        cursor = conn.cursor()
        if status:
            cursor.execute(
                "SELECT * FROM jobs WHERE world_id = ? AND status = ? ORDER BY created_at DESC",
                (world_id, status)
            )
        else:
            cursor.execute(
                "SELECT * FROM jobs WHERE world_id = ? ORDER BY created_at DESC",
                (world_id,)
            )
        return [dict(row) for row in cursor.fetchall()]


def update_job_status(job_id: int, status: str, progress: int = None,
                       result: str = None, error_message: str = None) -> bool:
    """ジョブのステータスを更新"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        updates = ["status = ?"]
        params = [status]
        
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        
        if result is not None:
            updates.append("result = ?")
            params.append(result)
        
        if error_message is not None:
            updates.append("error_message = ?")
            params.append(error_message)
        
        if status == "running":
            updates.append("started_at = CURRENT_TIMESTAMP")
        elif status in ("completed", "failed"):
            updates.append("completed_at = CURRENT_TIMESTAMP")
        
        params.append(job_id)
        
        cursor.execute(
            f"UPDATE jobs SET {', '.join(updates)} WHERE id = ?",
            params
        )
        return cursor.rowcount > 0


def delete_job(job_id: int) -> bool:
    """ジョブを削除"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        return cursor.rowcount > 0
