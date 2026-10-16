/**
 * グループ分けロジック
 * 純粋関数のみで構成し、UI・アニメーションから独立させる
 */

/**
 * 入力値をバリデーションする
 * @param {unknown} total - 総人数（未検証）
 * @param {unknown} numGroups - グループ数（未検証）
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateInputs(total, numGroups) {
  // 未入力チェック
  if (total === '' || total === null || total === undefined ||
      numGroups === '' || numGroups === null || numGroups === undefined) {
    return { valid: false, error: '人数とグループ数を両方入力してください。' };
  }

  const t = Number(total);
  const g = Number(numGroups);

  // 数値変換チェック
  if (isNaN(t) || isNaN(g)) {
    return { valid: false, error: '半角数字で入力してください。' };
  }

  // 整数チェック
  if (!Number.isInteger(t) || !Number.isInteger(g)) {
    return { valid: false, error: '整数で入力してください。小数は使えません。' };
  }

  // 1以上チェック
  if (t < 1) {
    return { valid: false, error: '総人数は1以上の整数を入力してください。' };
  }
  if (g < 1) {
    return { valid: false, error: 'グループ数は1以上の整数を入力してください。' };
  }

  // 上限チェック
  if (t > 200) {
    return { valid: false, error: '総人数は200名以下にしてください。' };
  }

  // グループ数 ≦ 総人数チェック
  if (g > t) {
    return { valid: false, error: `グループ数（${g}）は総人数（${t}）以下にしてください。` };
  }

  return { valid: true, error: null };
}

/**
 * Fisher-Yates シャッフルで配列をランダム化する（元の配列を変更しない）
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 生徒をグループに均等に分配する
 *
 * アルゴリズム:
 *   baseSize = floor(total / numGroups)  // 最小グループ人数
 *   remainder = total % numGroups         // 1人多くなるグループ数
 *   グループ 1〜remainder       → (baseSize + 1) 人
 *   グループ (remainder+1)〜終  → baseSize 人
 *
 * @param {number} total - 総人数
 * @param {number} numGroups - グループ数
 * @returns {Array<{ groupIndex: number, members: number[] }>}
 */
export function groupStudents(total, numGroups) {
  // 1〜total の番号配列を作成してシャッフル
  const students = Array.from({ length: total }, (_, i) => i + 1);
  const shuffled = shuffleArray(students);

  const baseSize = Math.floor(total / numGroups);
  const remainder = total % numGroups;

  const groups = [];
  let cursor = 0;

  for (let i = 0; i < numGroups; i++) {
    const size = i < remainder ? baseSize + 1 : baseSize;
    groups.push({
      groupIndex: i,
      members: shuffled.slice(cursor, cursor + size),
    });
    cursor += size;
  }

  return groups;
}
