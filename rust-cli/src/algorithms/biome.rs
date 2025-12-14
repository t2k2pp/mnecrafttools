//! バイオーム検索アルゴリズム
//! 
//! Minecraft 1.18+ のマルチノイズバイオーム生成の簡易近似

/// バイオームタイプ
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BiomeType {
    Plains,
    Forest,
    Jungle,
    Desert,
    Mesa,           // Badlands
    Mushroom,       // Mushroom Fields
    IceSpikes,
    Swamp,
    Savanna,
    Taiga,
    SnowyTaiga,
    Ocean,
    DeepOcean,
    Beach,
    River,
    Mountain,       // Extreme Hills / Windswept Hills
    Unknown,
}

impl BiomeType {
    /// 文字列からバイオームタイプを取得
    pub fn from_str(s: &str) -> Option<BiomeType> {
        match s.to_lowercase().as_str() {
            "plains" => Some(BiomeType::Plains),
            "forest" => Some(BiomeType::Forest),
            "jungle" => Some(BiomeType::Jungle),
            "desert" => Some(BiomeType::Desert),
            "mesa" | "badlands" => Some(BiomeType::Mesa),
            "mushroom" | "mushroom_fields" => Some(BiomeType::Mushroom),
            "ice_spikes" | "icespikes" => Some(BiomeType::IceSpikes),
            "swamp" => Some(BiomeType::Swamp),
            "savanna" => Some(BiomeType::Savanna),
            "taiga" => Some(BiomeType::Taiga),
            "snowy_taiga" => Some(BiomeType::SnowyTaiga),
            "ocean" => Some(BiomeType::Ocean),
            "deep_ocean" => Some(BiomeType::DeepOcean),
            "beach" => Some(BiomeType::Beach),
            "river" => Some(BiomeType::River),
            "mountain" | "extreme_hills" => Some(BiomeType::Mountain),
            _ => None,
        }
    }

    /// バイオームの希少度（0.0-1.0、高いほど希少）
    pub fn rarity(&self) -> f64 {
        match self {
            BiomeType::Plains => 0.1,
            BiomeType::Forest => 0.1,
            BiomeType::Jungle => 0.6,
            BiomeType::Desert => 0.3,
            BiomeType::Mesa => 0.8,
            BiomeType::Mushroom => 0.95,
            BiomeType::IceSpikes => 0.85,
            BiomeType::Swamp => 0.3,
            BiomeType::Savanna => 0.3,
            BiomeType::Taiga => 0.2,
            BiomeType::SnowyTaiga => 0.4,
            BiomeType::Ocean => 0.2,
            BiomeType::DeepOcean => 0.3,
            BiomeType::Beach => 0.2,
            BiomeType::River => 0.2,
            BiomeType::Mountain => 0.4,
            BiomeType::Unknown => 1.0,
        }
    }
}

/// 簡易パーリンノイズ（1D）
fn noise_1d(seed: i64, x: i32) -> f64 {
    let n = x.wrapping_mul(374761393)
        .wrapping_add((seed as i32).wrapping_mul(668265263));
    let n = (n ^ (n >> 13)).wrapping_mul(1274126177);
    (n as f64) / i32::MAX as f64
}

/// 簡易パーリンノイズ（2D）
fn noise_2d(seed: i64, x: i32, z: i32) -> f64 {
    let n1 = noise_1d(seed, x);
    let n2 = noise_1d(seed.wrapping_add(12345), z);
    let n3 = noise_1d(seed.wrapping_add(67890), x.wrapping_add(z));
    
    (n1 + n2 + n3) / 3.0
}

/// 温度ノイズを取得
fn get_temperature(seed: i64, x: i32, z: i32) -> f64 {
    let scale = 256.0;
    let nx = x as f64 / scale;
    let nz = z as f64 / scale;
    
    // 複数のオクターブで合成
    let mut temp = 0.0;
    let mut amplitude = 1.0;
    let mut frequency = 1.0;
    
    for i in 0..4 {
        temp += noise_2d(seed + i * 1000, (nx * frequency) as i32, (nz * frequency) as i32) * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    // -1.0 to 1.0 に正規化
    (temp + 1.0) / 2.0
}

/// 湿度ノイズを取得
fn get_humidity(seed: i64, x: i32, z: i32) -> f64 {
    let scale = 256.0;
    let nx = x as f64 / scale;
    let nz = z as f64 / scale;
    
    let mut humidity = 0.0;
    let mut amplitude = 1.0;
    let mut frequency = 1.0;
    
    for i in 0..4 {
        humidity += noise_2d(seed + 50000 + i * 1000, (nx * frequency) as i32, (nz * frequency) as i32) * amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    (humidity + 1.0) / 2.0
}

/// 大陸性ノイズを取得
fn get_continentalness(seed: i64, x: i32, z: i32) -> f64 {
    let scale = 512.0;
    let nx = x as f64 / scale;
    let nz = z as f64 / scale;
    
    noise_2d(seed + 100000, (nx) as i32, (nz) as i32)
}

/// 座標のバイオームを近似計算
pub fn get_biome_at(seed: i64, x: i32, z: i32) -> BiomeType {
    let temp = get_temperature(seed, x, z);
    let humidity = get_humidity(seed, x, z);
    let cont = get_continentalness(seed, x, z);
    
    // 海判定
    if cont < -0.2 {
        if cont < -0.5 {
            return BiomeType::DeepOcean;
        }
        return BiomeType::Ocean;
    }
    
    // 川/ビーチ判定
    if cont < 0.0 {
        if humidity > 0.7 {
            return BiomeType::River;
        }
        return BiomeType::Beach;
    }
    
    // 陸地バイオーム
    
    // 寒冷バイオーム（温度 < 0.2）
    if temp < 0.2 {
        if humidity < 0.3 {
            // 希少バイオーム判定
            let rare_chance = noise_2d(seed + 200000, x / 256, z / 256);
            if rare_chance > 0.9 {
                return BiomeType::IceSpikes;
            }
            return BiomeType::SnowyTaiga;
        }
        return BiomeType::Taiga;
    }
    
    // 温暖バイオーム（温度 0.2-0.6）
    if temp < 0.6 {
        if humidity > 0.7 {
            return BiomeType::Swamp;
        }
        if humidity > 0.4 {
            return BiomeType::Forest;
        }
        if cont > 0.5 {
            return BiomeType::Mountain;
        }
        return BiomeType::Plains;
    }
    
    // 熱帯/乾燥バイオーム（温度 > 0.6）
    if humidity > 0.6 {
        // ジャングル判定（希少）
        let jungle_chance = noise_2d(seed + 300000, x / 512, z / 512);
        if jungle_chance > 0.7 {
            return BiomeType::Jungle;
        }
        return BiomeType::Savanna;
    }
    
    if humidity < 0.3 {
        // メサ判定（希少）
        let mesa_chance = noise_2d(seed + 400000, x / 1024, z / 1024);
        if mesa_chance > 0.85 {
            return BiomeType::Mesa;
        }
        return BiomeType::Desert;
    }
    
    // キノコ島判定（非常に希少、海の近く）
    if cont < 0.1 {
        let mushroom_chance = noise_2d(seed + 500000, x / 2048, z / 2048);
        if mushroom_chance > 0.95 {
            return BiomeType::Mushroom;
        }
    }
    
    BiomeType::Savanna
}

/// 最寄りのバイオームを検索
pub fn find_nearest_biome(
    seed: i64,
    center_x: i32,
    center_z: i32,
    radius: i32,
    target_biome: &str,
) -> Option<(i32, i32, f64)> {
    let target = match BiomeType::from_str(target_biome) {
        Some(b) => b,
        None => return None,
    };
    
    let mut best: Option<(i32, i32, f64)> = None;
    
    // サンプリング間隔（バイオームの希少度に応じて調整）
    let step = match target.rarity() {
        r if r > 0.8 => 64,   // 希少バイオームは細かくサンプリング
        r if r > 0.5 => 128,
        _ => 256,
    };
    
    let samples_per_axis = (radius * 2 / step).max(1);
    
    for i in 0..samples_per_axis {
        for j in 0..samples_per_axis {
            let x = center_x - radius + i * step;
            let z = center_z - radius + j * step;
            
            // 範囲内かチェック
            let dist_sq = ((x - center_x) as i64).pow(2) + ((z - center_z) as i64).pow(2);
            if dist_sq > (radius as i64).pow(2) {
                continue;
            }
            
            let biome = get_biome_at(seed, x, z);
            
            if biome == target {
                let distance = (dist_sq as f64).sqrt();
                
                match &best {
                    Some((_, _, best_dist)) if *best_dist <= distance => {}
                    _ => {
                        best = Some((x, z, distance));
                    }
                }
            }
        }
    }
    
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_biome() {
        let seed = 12345;
        let biome = get_biome_at(seed, 0, 0);
        println!("Biome at (0, 0): {:?}", biome);
    }

    #[test]
    fn test_find_jungle() {
        let seed = 12345;
        match find_nearest_biome(seed, 0, 0, 10000, "jungle") {
            Some((x, z, dist)) => {
                println!("Found jungle at X={}, Z={} (distance: {:.0})", x, z, dist);
            }
            None => {
                println!("Jungle not found within range");
            }
        }
    }
}
