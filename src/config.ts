// 調整用の定数。数字を変えたいときはここだけ触ればよい

/** 試験日(IPA公式「スケジュール、手数料など」2026/11/9更新版で確認) */
export const EXAM_DATES = {
  applyStart: '2027-01-27',
  applyEnd: '2027-02-16',
  examAStart: '2027-02-06',
  examAEnd: '2027-02-19',
  examBStart: '2027-03-03',
  examBEnd: '2027-03-15',
};

/** 間隔反復: 段階1〜5で次に出すまでの日数 */
export const INTERVALS = [1, 3, 7, 14, 30] as const;

/** 1イベントの問題数と、そのうち復習問題の上限 */
export const EVENT_SIZE = 5;
export const EVENT_MAX_REVIEW = 3;

/** 監査(ボス戦) */
export const AUDIT_SIZE = 10;
export const AUDIT_PASS = 8;
export const AUDIT_TRIGGER = 10; // 復習待ちがこの数以上で監査が来る
export const AUDIT_FORCE = 21; // この数以上だと監査を先にやらないと通常イベントを始められない

/** 部門レベル・会社のステージで「身についた」とみなす段階 */
export const MASTERED_BOX = 3;

/** 評価額の増え方(単位: 万円) */
export const REWARD = {
  firstCorrect: 50,
  reviewCorrect: 80,
  wrong: 5, // 間違えても学びはある
  auditClear: 500,
};

/** 会社のステージ。全問題のうち段階3以上の割合で決まる */
export const STAGES = [
  { min: 0, name: '創業期', staff: 3 },
  { min: 0.05, name: 'シード', staff: 8 },
  { min: 0.15, name: 'シリーズA', staff: 25 },
  { min: 0.3, name: 'シリーズB', staff: 60 },
  { min: 0.5, name: 'シリーズC', staff: 150 },
  { min: 0.7, name: '上場準備', staff: 300 },
  { min: 0.85, name: '上場', staff: 500 },
] as const;

/** 本番の出題数(合格ライン予測で使う) */
export const EXAM_A = { total: 80, pass: 48, byField: { T: 50, M: 10, S: 20 } };
