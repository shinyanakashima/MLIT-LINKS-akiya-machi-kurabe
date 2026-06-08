# 出典表示（Attribution）

本プロジェクトが利用・再配布するデータは **CC-BY 4.0** で提供されており、利用時は出典表示が必須です。

## 表示例

> 出典: 国土交通省 Project LINKS「空き家バンク（2025年度）」を加工して作成。
> 加工: MLIT-LINKS-akiya-pipeline（正規化）＋ MLIT-LINKS-akiya-machi-kurabe（集計・可視化）。
> ライセンス: CC-BY 4.0。

## データの系譜

1. **一次データ**: 国土交通省 Project LINKS「空き家バンク 登録物件＋成約物件（2025年度）」
   - データセット: https://www.geospatial.jp/ckan/dataset/links-akiyabank-2025
   - ライセンス: CC-BY 4.0
2. **正規化**: [MLIT-LINKS-akiya-pipeline](https://github.com/shinyanakashima/MLIT-LINKS-akiya-pipeline)（P5）
   - 表記ゆれ・欠損・列構成差・単位不統一を吸収した正規化済み JSON を配布。
   - PR 文（STRONG_POINTS）の AI 分類タグを付与。
3. **集計・可視化**: 本リポジトリ MLIT-LINKS-akiya-machi-kurabe
   - 正規化レコードを自治体別に再集計し、ダッシュボードとして可視化。

## ライセンス

- 取り込むデータ: CC-BY 4.0（一次データのライセンスを継承）。
- 本リポジトリのコード: 各レコードの `provenance` に出典 URL・ライセンス・年度が埋め込まれており、
  データ単体でも出典を辿れます。
