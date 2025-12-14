//! 構造物検索モジュール
//! Minecraft Bedrock Edition の構造物座標計算

/// 構造物タイプ
#[derive(Debug, Clone, Copy)]
pub enum StructureType {
    Village,
    PillagerOutpost,
    OceanMonument,
    WoodlandMansion,
    NetherFortress,
    BastionRemnant,
    Igloo,
    WitchHut,
    Shipwreck,
    BuriedTreasure,
}

impl StructureType {
    /// 構造物の表示名を取得
    pub fn display_name(&self) -> &'static str {
        match self {
            StructureType::Village => "🏘️ 村",
            StructureType::PillagerOutpost => "⚔️ 前哨基地",
            StructureType::OceanMonument => "🌊 海底神殿",
            StructureType::WoodlandMansion => "🏰 森の洋館",
            StructureType::NetherFortress => "🔥 ネザー要塞",
            StructureType::BastionRemnant => "🏚️ バスティオン",
            StructureType::Igloo => "🧊 イグルー",
            StructureType::WitchHut => "🧙 魔女の家",
            StructureType::Shipwreck => "🚢 難破船",
            StructureType::BuriedTreasure => "💰 埋蔵金",
        }
    }

    /// 構造物のグリッドサイズを取得（チャンク単位）
    pub fn spacing(&self) -> i32 {
        match self {
            StructureType::Village => 32,
            StructureType::PillagerOutpost => 80,
            StructureType::OceanMonument => 32,
            StructureType::WoodlandMansion => 80,
            StructureType::NetherFortress => 30, // 480/16 = 30 chunks
            StructureType::BastionRemnant => 30,
            StructureType::Igloo => 32,
            StructureType::WitchHut => 32,
            StructureType::Shipwreck => 24,
            StructureType::BuriedTreasure => 8,
        }
    }

    /// 構造物の分離距離を取得（チャンク単位）
    pub fn separation(&self) -> i32 {
        match self {
            StructureType::Village => 8,
            StructureType::PillagerOutpost => 40,
            StructureType::OceanMonument => 5,
            StructureType::WoodlandMansion => 20,
            StructureType::NetherFortress => 4,
            StructureType::BastionRemnant => 4,
            StructureType::Igloo => 8,
            StructureType::WitchHut => 8,
            StructureType::Shipwreck => 4,
            StructureType::BuriedTreasure => 4,
        }
    }

    /// 構造物のソルト値を取得
    pub fn salt(&self) -> i64 {
        match self {
            StructureType::Village => 10387312,
            StructureType::PillagerOutpost => 165745296,
            StructureType::OceanMonument => 10387313,
            StructureType::WoodlandMansion => 10387319,
            StructureType::NetherFortress => 30084232,
            StructureType::BastionRemnant => 30084232,
            StructureType::Igloo => 14357618,
            StructureType::WitchHut => 14357620,
            StructureType::Shipwreck => 165745295,
            StructureType::BuriedTreasure => 16842397,
        }
    }
}

/// 構造物シードを計算
fn get_structure_seed(world_seed: i64, region_x: i32, region_z: i32, salt: i64) -> i64 {
    let a = region_x as i64;
    let b = region_z as i64;
    
    // Bedrock Edition algorithm (LCG based)
    let seed = world_seed
        .wrapping_add(a.wrapping_mul(341873128712))
        .wrapping_add(b.wrapping_mul(132897987541))
        .wrapping_add(salt);
    
    seed
}

/// 擬似乱数ジェネレータ（簡易版）
fn next_int(seed: &mut i64, bound: i32) -> i32 {
    *seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    let bits = (*seed >> 17) as i32;
    ((bits as i64).abs() % bound as i64) as i32
}

/// 構造物を検索
pub fn find_structures(
    seed: i64,
    center_x: i32,
    center_z: i32,
    radius: i32,
    structure_type: StructureType,
) -> Vec<(String, i32, i32)> {
    let mut results = Vec::new();
    
    let spacing = structure_type.spacing();
    let separation = structure_type.separation();
    let salt = structure_type.salt();
    let name = structure_type.display_name().to_string();
    
    // 検索範囲をリージョン単位で計算
    let spacing_blocks = spacing * 16;
    let min_region_x = (center_x - radius) / spacing_blocks - 1;
    let max_region_x = (center_x + radius) / spacing_blocks + 1;
    let min_region_z = (center_z - radius) / spacing_blocks - 1;
    let max_region_z = (center_z + radius) / spacing_blocks + 1;
    
    for region_x in min_region_x..=max_region_x {
        for region_z in min_region_z..=max_region_z {
            let mut struct_seed = get_structure_seed(seed, region_x, region_z, salt);
            
            // リージョン内のオフセットを計算
            let offset_range = spacing - separation;
            let offset_x = next_int(&mut struct_seed, offset_range);
            let offset_z = next_int(&mut struct_seed, offset_range);
            
            // 構造物のチャンク座標
            let chunk_x = region_x * spacing + offset_x;
            let chunk_z = region_z * spacing + offset_z;
            
            // ブロック座標に変換（チャンク中心）
            let block_x = chunk_x * 16 + 8;
            let block_z = chunk_z * 16 + 8;
            
            // 範囲内かチェック
            let dist_sq = ((block_x - center_x) as i64).pow(2) + ((block_z - center_z) as i64).pow(2);
            if dist_sq <= (radius as i64).pow(2) {
                results.push((name.clone(), block_x, block_z));
            }
        }
    }
    
    results
}

/// ネザー構造物を検索（480x480 quadrant algorithm）
/// 
/// Bedrock Editionでは、ネザー要塞とバスティオンは480x480ブロックの
/// 領域（quadrant）ごとに、どちらか一方のみが生成される。
/// - ネザー要塞: 約33%
/// - バスティオン: 約67%
pub fn find_nether_structures(
    seed: i64,
    center_x: i32,
    center_z: i32,
    radius: i32,
) -> Vec<(String, i32, i32)> {
    let mut results = Vec::new();
    
    const QUADRANT_SIZE: i32 = 480;
    
    // 検索範囲をquadrant単位で計算
    let min_qx = (center_x - radius) / QUADRANT_SIZE - 1;
    let max_qx = (center_x + radius) / QUADRANT_SIZE + 1;
    let min_qz = (center_z - radius) / QUADRANT_SIZE - 1;
    let max_qz = (center_z + radius) / QUADRANT_SIZE + 1;
    
    for qx in min_qx..=max_qx {
        for qz in min_qz..=max_qz {
            // Quadrant内のチェックポイント（100, 200, 300のオフセット）
            let check_points = [100, 200, 300];
            
            for &offset_x in &check_points {
                for &offset_z in &check_points {
                    let block_x = qx * QUADRANT_SIZE + offset_x;
                    let block_z = qz * QUADRANT_SIZE + offset_z;
                    
                    // 範囲内かチェック
                    let dist_sq = ((block_x - center_x) as i64).pow(2) + ((block_z - center_z) as i64).pow(2);
                    if dist_sq > (radius as i64).pow(2) {
                        continue;
                    }
                    
                    // このquadrantでの構造物判定
                    let mut quadrant_seed = get_structure_seed(seed, qx, qz, 30084232);
                    let structure_roll = next_int(&mut quadrant_seed, 100);
                    
                    // 33% = ネザー要塞, 67% = バスティオン
                    let (name, is_valid) = if structure_roll < 33 {
                        ("🔥 ネザー要塞".to_string(), true)
                    } else {
                        ("🏚️ バスティオン".to_string(), true)
                    };
                    
                    if is_valid {
                        // 最初の有効なチェックポイントのみ追加（1 quadrant = 1構造物）
                        let already_added = results.iter().any(|(_, x, z)| {
                            *x / QUADRANT_SIZE == qx && *z / QUADRANT_SIZE == qz
                        });
                        
                        if !already_added {
                            // 構造物の実際の位置を計算
                            let offset = next_int(&mut quadrant_seed, 280) + 100;
                            let final_x = qx * QUADRANT_SIZE + offset;
                            let offset = next_int(&mut quadrant_seed, 280) + 100;
                            let final_z = qz * QUADRANT_SIZE + offset;
                            
                            results.push((name, final_x, final_z));
                        }
                        break;
                    }
                }
            }
        }
    }
    
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_villages() {
        let results = find_structures(12345, 0, 0, 1000, StructureType::Village);
        println!("Found {} villages", results.len());
        for (name, x, z) in &results {
            println!("{}: X={}, Z={}", name, x, z);
        }
        assert!(!results.is_empty());
    }

    #[test]
    fn test_find_nether_structures() {
        let results = find_nether_structures(12345, 0, 0, 500);
        println!("Found {} nether structures", results.len());
        for (name, x, z) in &results {
            println!("{}: X={}, Z={}", name, x, z);
        }
    }
}
