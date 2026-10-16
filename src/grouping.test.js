/**
 * グループ分けロジックのユニットテスト (Vitest)
 */

import { describe, it, expect } from 'vitest';
import { validateInputs, shuffleArray, groupStudents } from './grouping.js';

// ─── shuffleArray ────────────────────────────────────────────────────
describe('shuffleArray', () => {
  it('同じ長さの配列を返す', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr)).toHaveLength(arr.length);
  });

  it('元と同じ要素を持つ（重複・欠落なし）', () => {
    const arr = Array.from({ length: 32 }, (_, i) => i + 1);
    const result = shuffleArray(arr);
    expect([...result].sort((a, b) => a - b)).toEqual(arr);
  });

  it('元の配列を変更しない', () => {
    const arr = [10, 20, 30];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it('空配列を受け取ったとき空配列を返す', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('1要素配列をそのまま返す', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});

// ─── validateInputs ─────────────────────────────────────────────────
describe('validateInputs', () => {
  // 正常系
  it('正常な入力を valid と判定する', () => {
    expect(validateInputs(30, 5).valid).toBe(true);
    expect(validateInputs(1, 1).valid).toBe(true);
    expect(validateInputs(200, 10).valid).toBe(true);
  });

  // 未入力
  it('未入力（空文字）を invalid と判定する', () => {
    expect(validateInputs('', 5).valid).toBe(false);
    expect(validateInputs(30, '').valid).toBe(false);
    expect(validateInputs('', '').valid).toBe(false);
  });

  it('null / undefined を invalid と判定する', () => {
    expect(validateInputs(null, 5).valid).toBe(false);
    expect(validateInputs(30, undefined).valid).toBe(false);
  });

  // 非数値
  it('数値以外（文字列）を invalid と判定する', () => {
    expect(validateInputs('abc', 5).valid).toBe(false);
    expect(validateInputs(30, 'foo').valid).toBe(false);
  });

  // 小数
  it('小数を invalid と判定する', () => {
    expect(validateInputs(30.5, 5).valid).toBe(false);
    expect(validateInputs(30, 2.5).valid).toBe(false);
  });

  // 0以下
  it('0 を invalid と判定する', () => {
    expect(validateInputs(0, 5).valid).toBe(false);
    expect(validateInputs(30, 0).valid).toBe(false);
  });

  it('負数を invalid と判定する', () => {
    expect(validateInputs(-1, 5).valid).toBe(false);
    expect(validateInputs(30, -3).valid).toBe(false);
  });

  // 上限超え
  it('総人数 201 を invalid と判定する', () => {
    expect(validateInputs(201, 5).valid).toBe(false);
  });

  // グループ数が総人数を超える
  it('グループ数が総人数を超えるとき invalid と判定する', () => {
    expect(validateInputs(5, 6).valid).toBe(false);
    expect(validateInputs(1, 2).valid).toBe(false);
  });

  it('グループ数 = 総人数 は valid（各1人）', () => {
    expect(validateInputs(5, 5).valid).toBe(true);
  });

  // エラーメッセージが日本語であること
  it('エラーメッセージが日本語の文字列を含む', () => {
    const { error } = validateInputs('', 5);
    expect(error).toBeTruthy();
    expect(typeof error).toBe('string');
    // 日本語文字を含む（ひらがな・漢字のコードポイント範囲）
    expect(/[\u3000-\u9FFF]/.test(error)).toBe(true);
  });
});

// ─── groupStudents ──────────────────────────────────────────────────
describe('groupStudents', () => {
  // グループ数の一致
  it('指定したグループ数のグループを返す', () => {
    const result = groupStudents(30, 5);
    expect(result).toHaveLength(5);
  });

  it('グループ数 = 1 のとき全員同一グループ', () => {
    const result = groupStudents(10, 1);
    expect(result).toHaveLength(1);
    expect(result[0].members).toHaveLength(10);
  });

  it('グループ数 = 総人数 のとき各グループ1人', () => {
    const result = groupStudents(5, 5);
    expect(result.every((g) => g.members.length === 1)).toBe(true);
  });

  // 重複なし・欠落なし
  it('全番号が重複なく各グループに含まれる', () => {
    const total = 32;
    const result = groupStudents(total, 5);
    const allMembers = result.flatMap((g) => g.members);
    const sorted = [...allMembers].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: total }, (_, i) => i + 1));
  });

  it('1〜totalの全番号が欠落なく含まれる（大人数）', () => {
    const total = 100;
    const result = groupStudents(total, 7);
    const allMembers = result.flatMap((g) => g.members);
    expect(allMembers).toHaveLength(total);
    const set = new Set(allMembers);
    expect(set.size).toBe(total);
    for (let i = 1; i <= total; i++) {
      expect(set.has(i)).toBe(true);
    }
  });

  // 人数差 最大1人
  it('グループ間の人数差が最大1人である (32人5グループ → 7,7,6,6,6)', () => {
    // 決定的に検証するため、Fisher-Yatesは乱数使用だが人数分布は固定
    const result = groupStudents(32, 5);
    const sizes = result.map((g) => g.members.length);
    const max = Math.max(...sizes);
    const min = Math.min(...sizes);
    expect(max - min).toBeLessThanOrEqual(1);
    // 総人数一致
    expect(sizes.reduce((s, v) => s + v, 0)).toBe(32);
  });

  it('グループ間の人数差が最大1人である（整除できる場合）', () => {
    const result = groupStudents(30, 6); // 5人ずつ
    const sizes = result.map((g) => g.members.length);
    const max = Math.max(...sizes);
    const min = Math.min(...sizes);
    expect(max - min).toBe(0);
  });

  it('グループ間の人数差が最大1人である（余りが多い場合）', () => {
    const result = groupStudents(13, 4); // 4,3,3,3 → 差は1
    const sizes = result.map((g) => g.members.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(sizes.reduce((s, v) => s + v, 0)).toBe(13);
  });

  // groupIndex の整合性
  it('groupIndex が 0 始まりで連番である', () => {
    const result = groupStudents(20, 4);
    result.forEach((g, i) => {
      expect(g.groupIndex).toBe(i);
    });
  });

  // 繰り返し実行でもつねに正しい
  it('複数回実行してもつねに重複なし・欠落なし', () => {
    for (let trial = 0; trial < 20; trial++) {
      const total = Math.floor(Math.random() * 40) + 1;
      const numGroups = Math.floor(Math.random() * Math.min(total, 10)) + 1;
      const result = groupStudents(total, numGroups);
      const all = result.flatMap((g) => g.members).sort((a, b) => a - b);
      expect(all).toEqual(Array.from({ length: total }, (_, i) => i + 1));
      const sizes = result.map((g) => g.members.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });
});
