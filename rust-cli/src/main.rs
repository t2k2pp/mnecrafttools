//! BedrockMate CLI - Minecraft Bedrock Edition Structure Finder
//! 
//! 構造物の座標を計算するCLIツール

mod structures;
mod algorithms;

use clap::{Parser, Subcommand};
use serde::Serialize;
use std::io::{self, Write};

use structures::{StructureType, find_structures, find_nether_structures};
use algorithms::biome::find_nearest_biome;

/// BedrockMate CLI - Minecraft Bedrock Edition 構造物ファインダー
#[derive(Parser)]
#[command(name = "bedrockmate")]
#[command(author = "BedrockMate Team")]
#[command(version = "1.0.0")]
#[command(about = "Minecraft Bedrock Edition用の構造物座標計算ツール", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 構造物を検索
    Structures {
        /// ワールドシード値
        #[arg(short, long)]
        seed: i64,

        /// 検索中心X座標
        #[arg(short = 'x', long, default_value = "0")]
        center_x: i32,

        /// 検索中心Z座標
        #[arg(short = 'z', long, default_value = "0")]
        center_z: i32,

        /// 検索半径（ブロック単位）
        #[arg(short, long, default_value = "5000")]
        radius: i32,

        /// 検索する構造物タイプ（all, village, fortress, bastion, monument, mansion, outpost）
        #[arg(short = 't', long, default_value = "all")]
        structure_type: String,

        /// 出力形式（json, text）
        #[arg(short, long, default_value = "text")]
        output: String,
    },

    /// バイオームを検索
    Biome {
        /// ワールドシード値
        #[arg(short, long)]
        seed: i64,

        /// 検索中心X座標
        #[arg(short = 'x', long, default_value = "0")]
        center_x: i32,

        /// 検索中心Z座標
        #[arg(short = 'z', long, default_value = "0")]
        center_z: i32,

        /// 検索半径（ブロック単位）
        #[arg(short, long, default_value = "10000")]
        radius: i32,

        /// 検索するバイオーム（jungle, mesa, mushroom, ice_spikes等）
        #[arg(short = 't', long)]
        target: String,

        /// 出力形式（json, text）
        #[arg(short, long, default_value = "text")]
        output: String,
    },

    /// ネザー構造物を検索（要塞、バスティオン）
    Nether {
        /// ワールドシード値
        #[arg(short, long)]
        seed: i64,

        /// 検索中心X座標（ネザー座標）
        #[arg(short = 'x', long, default_value = "0")]
        center_x: i32,

        /// 検索中心Z座標（ネザー座標）
        #[arg(short = 'z', long, default_value = "0")]
        center_z: i32,

        /// 検索半径（ブロック単位）
        #[arg(short, long, default_value = "1000")]
        radius: i32,

        /// 出力形式（json, text）
        #[arg(short, long, default_value = "text")]
        output: String,
    },
}

#[derive(Serialize)]
struct StructureResult {
    structure_type: String,
    x: i32,
    z: i32,
    distance: f64,
}

#[derive(Serialize)]
struct SearchResult {
    seed: i64,
    center_x: i32,
    center_z: i32,
    radius: i32,
    structures: Vec<StructureResult>,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Structures {
            seed,
            center_x,
            center_z,
            radius,
            structure_type,
            output,
        } => {
            let structure_types = match structure_type.as_str() {
                "all" => vec![
                    StructureType::Village,
                    StructureType::PillagerOutpost,
                    StructureType::OceanMonument,
                    StructureType::WoodlandMansion,
                ],
                "village" => vec![StructureType::Village],
                "outpost" => vec![StructureType::PillagerOutpost],
                "monument" => vec![StructureType::OceanMonument],
                "mansion" => vec![StructureType::WoodlandMansion],
                _ => {
                    eprintln!("不明な構造物タイプ: {}", structure_type);
                    return;
                }
            };

            let mut all_structures = Vec::new();

            for st in structure_types {
                let structures = find_structures(seed, center_x, center_z, radius, st);
                all_structures.extend(structures);
            }

            // 距離順にソート
            all_structures.sort_by(|a, b| {
                let dist_a = ((a.1 - center_x) as f64).powi(2) + ((a.2 - center_z) as f64).powi(2);
                let dist_b = ((b.1 - center_x) as f64).powi(2) + ((b.2 - center_z) as f64).powi(2);
                dist_a.partial_cmp(&dist_b).unwrap()
            });

            output_results(&output, seed, center_x, center_z, radius, &all_structures);
        }

        Commands::Nether {
            seed,
            center_x,
            center_z,
            radius,
            output,
        } => {
            let structures = find_nether_structures(seed, center_x, center_z, radius);
            output_results(&output, seed, center_x, center_z, radius, &structures);
        }

        Commands::Biome {
            seed,
            center_x,
            center_z,
            radius,
            target,
            output,
        } => {
            match find_nearest_biome(seed, center_x, center_z, radius, &target) {
                Some((x, z, distance)) => {
                    if output == "json" {
                        let result = serde_json::json!({
                            "seed": seed,
                            "target_biome": target,
                            "found": true,
                            "x": x,
                            "z": z,
                            "distance": distance
                        });
                        println!("{}", serde_json::to_string_pretty(&result).unwrap());
                    } else {
                        println!("🌴 最寄りの{}バイオーム", target);
                        println!("   座標: X={}, Z={}", x, z);
                        println!("   距離: {:.0}ブロック", distance);
                    }
                }
                None => {
                    if output == "json" {
                        let result = serde_json::json!({
                            "seed": seed,
                            "target_biome": target,
                            "found": false
                        });
                        println!("{}", serde_json::to_string_pretty(&result).unwrap());
                    } else {
                        println!("❌ {}バイオームが見つかりませんでした（範囲: {}ブロック）", target, radius);
                    }
                }
            }
        }
    }
}

fn output_results(
    format: &str,
    seed: i64,
    center_x: i32,
    center_z: i32,
    radius: i32,
    structures: &[(String, i32, i32)],
) {
    if format == "json" {
        let results: Vec<StructureResult> = structures
            .iter()
            .map(|(name, x, z)| {
                let distance = (((x - center_x) as f64).powi(2) + ((z - center_z) as f64).powi(2)).sqrt();
                StructureResult {
                    structure_type: name.clone(),
                    x: *x,
                    z: *z,
                    distance,
                }
            })
            .collect();

        let result = SearchResult {
            seed,
            center_x,
            center_z,
            radius,
            structures: results,
        };

        println!("{}", serde_json::to_string_pretty(&result).unwrap());
    } else {
        println!("🗺️  構造物検索結果");
        println!("   シード: {}", seed);
        println!("   検索中心: X={}, Z={}", center_x, center_z);
        println!("   検索半径: {}ブロック", radius);
        println!();

        if structures.is_empty() {
            println!("   構造物が見つかりませんでした");
        } else {
            for (name, x, z) in structures {
                let distance = (((x - center_x) as f64).powi(2) + ((z - center_z) as f64).powi(2)).sqrt();
                println!("   {} X={}, Z={} (距離: {:.0})", name, x, z, distance);
            }
        }
    }
}
