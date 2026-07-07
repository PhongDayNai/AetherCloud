export interface MergeLineBlock {
  serverLine: string;
  localLine: string;
  mergedLine: string;
  type: 'normal' | 'modified-server' | 'modified-local' | 'conflict';
  isResolved: boolean;
  resolvedSource?: 'server' | 'local' | null;
}

export function alignAndDiffThreeWay(
  serverText: string,
  localText: string
): MergeLineBlock[] {
  const serverLines = serverText.split('\n');
  const localLines = localText.split('\n');

  const m = serverLines.length;
  const n = localLines.length;

  // 1. Tạo bảng quy hoạch động LCS (Longest Common Subsequence)
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (serverLines[i - 1] === localLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 2. Truy vết ngược để căn chỉnh song song các dòng
  const blocks: MergeLineBlock[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && serverLines[i - 1] === localLines[j - 1]) {
      blocks.push({
        serverLine: serverLines[i - 1],
        localLine: localLines[j - 1],
        mergedLine: serverLines[i - 1],
        type: 'normal',
        isResolved: true
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      blocks.push({
        serverLine: '',
        localLine: localLines[j - 1],
        mergedLine: '',
        type: 'modified-local',
        isResolved: false
      });
      j--;
    } else {
      blocks.push({
        serverLine: serverLines[i - 1],
        localLine: '',
        mergedLine: '',
        type: 'modified-server',
        isResolved: false
      });
      i--;
    }
  }

  const reversed = blocks.reverse();

  // 3. Gom nhóm các dòng kề nhau thành cụm conflict hoặc modified
  const aligned: MergeLineBlock[] = [];
  let idx = 0;
  while (idx < reversed.length) {
    const current = reversed[idx];
    if (current.type === 'normal') {
      aligned.push(current);
      idx++;
    } else {
      const serverBlock: string[] = [];
      const localBlock: string[] = [];
      
      while (idx < reversed.length && reversed[idx].type !== 'normal') {
        const item = reversed[idx];
        if (item.type === 'modified-server') {
          serverBlock.push(item.serverLine);
        } else if (item.type === 'modified-local') {
          localBlock.push(item.localLine);
        }
        idx++;
      }

      const maxLen = Math.max(serverBlock.length, localBlock.length);
      const isConflict = serverBlock.length > 0 && localBlock.length > 0;
      
      for (let k = 0; k < maxLen; k++) {
        const s = k < serverBlock.length ? serverBlock[k] : '';
        const l = k < localBlock.length ? localBlock[k] : '';
        aligned.push({
          serverLine: s,
          localLine: l,
          mergedLine: '',
          type: isConflict ? 'conflict' : (serverBlock.length > 0 ? 'modified-server' : 'modified-local'),
          isResolved: false
        });
      }
    }
  }

  return aligned;
}

export interface DiffLineBlock {
  leftLine: string;
  rightLine: string;
  type: 'normal' | 'added' | 'deleted' | 'modified';
}

export function alignAndDiffTwoWay(leftText: string, rightText: string): DiffLineBlock[] {
  const leftLines = (leftText || '').split('\n');
  const rightLines = (rightText || '').split('\n');
  const m = leftLines.length;
  const n = rightLines.length;

  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const blocks: { left: string; right: string; type: 'normal' | 'left-only' | 'right-only' }[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      blocks.push({
        left: leftLines[i - 1],
        right: rightLines[j - 1],
        type: 'normal'
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      blocks.push({
        left: '',
        right: rightLines[j - 1],
        type: 'right-only'
      });
      j--;
    } else {
      blocks.push({
        left: leftLines[i - 1],
        right: '',
        type: 'left-only'
      });
      i--;
    }
  }

  const reversed = blocks.reverse();
  const aligned: DiffLineBlock[] = [];
  let idx = 0;

  while (idx < reversed.length) {
    const current = reversed[idx];
    if (current.type === 'normal') {
      aligned.push({
        leftLine: current.left,
        rightLine: current.right,
        type: 'normal'
      });
      idx++;
    } else {
      const leftBlock: string[] = [];
      const rightBlock: string[] = [];
      while (idx < reversed.length && reversed[idx].type !== 'normal') {
        const item = reversed[idx];
        if (item.type === 'left-only') {
          leftBlock.push(item.left);
        } else if (item.type === 'right-only') {
          rightBlock.push(item.right);
        }
        idx++;
      }

      const maxLen = Math.max(leftBlock.length, rightBlock.length);
      for (let k = 0; k < maxLen; k++) {
        const l = k < leftBlock.length ? leftBlock[k] : '';
        const r = k < rightBlock.length ? rightBlock[k] : '';

        let type: 'added' | 'deleted' | 'modified' = 'modified';
        if (leftBlock.length === 0) {
          type = 'added';
        } else if (rightBlock.length === 0) {
          type = 'deleted';
        }

        aligned.push({
          leftLine: l,
          rightLine: r,
          type
        });
      }
    }
  }

  return aligned;
}
