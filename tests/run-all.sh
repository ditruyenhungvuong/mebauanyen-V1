#!/usr/bin/env bash
# =========================================================
#  Chạy toàn bộ test của Mẹ Bầu An Yên (chủ: qa-tester; T-00 dựng khung, T-Q1 hoàn thiện).
#  Thứ tự (tech design 14.7): check-static → unit-* (util, kick, stats, engine, store; 4 múi giờ) → test-gas →
#  test-mock-api → smoke → e2e (Chrome headless, bọc flock vì agent khác có thể chạy e2e song song).
#  Cần Node ≥ 22 (Node 18 hệ thống thiếu WebSocket). Ví dụ:
#    export NODE=/home/adminpc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
#    tests/run-all.sh [--strict]        (--strict chỉ chuyển cho check-static: MOCK phải false, microcopy THIẾU = FAIL)
#  Thư mục tạm ngắn (Chrome báo "Socket path too long" nếu dài). Kết quả: in bảng từng bước; có bước đỏ → exit 1.
#  CHỜ = phần app chưa làm: không tính đỏ, không tính xanh (xem dòng tổng của từng bước).
# =========================================================
set -u
cd "$(dirname "$0")/.."
DEFAULT_NODE=/home/adminpc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
if [ -z "${NODE:-}" ]; then if [ -x "$DEFAULT_NODE" ]; then NODE="$DEFAULT_NODE"; else NODE=node; fi; fi
"$NODE" -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || { echo "Cần Node >= 22 (đang dùng $("$NODE" -v)). Đặt biến NODE."; exit 2; }
export TMPDIR="${TMPDIR:-/tmp/claude-1000/qa-lstp}"; mkdir -p "$TMPDIR"
LOCK=/tmp/claude-1000/e2e.lock; mkdir -p "$(dirname "$LOCK")"
FAIL=0
SUMMARY=()
step() {   # step <tên> <lệnh…>
  local name="$1"; shift
  echo; echo "=== $name ==="
  local out; out="$("$@" 2>&1)"; local code=$?
  echo "$out"
  local last; last="$(printf '%s\n' "$out" | grep -E 'PASS ·|PASS · ' | tail -1)"
  if [ $code -ne 0 ]; then FAIL=1; SUMMARY+=("ĐỎ   $name (exit $code) — $last"); else SUMMARY+=("XANH $name — $last"); fi
}
step "check-static" "$NODE" tests/check-static.js "$@"
for f in tests/unit-*.js; do [ -e "$f" ] || continue; step "$(basename "$f" .js)" "$NODE" "$f"; done
for f in tests/test-gas.js tests/test-mock-api.js; do [ -e "$f" ] || continue; step "$(basename "$f" .js)" "$NODE" "$f"; done
for f in tests/smoke.js tests/e2e.js; do
  [ -e "$f" ] || continue
  step "$(basename "$f" .js) (Chrome headless)" flock "$LOCK" "$NODE" "$f" --out="$TMPDIR/out"
done
echo; echo "=== TÓM TẮT ==="
printf '%s\n' "${SUMMARY[@]}"
echo
if [ "$FAIL" = 1 ]; then echo "KẾT QUẢ: CÓ TEST ĐỎ"; exit 1; else echo "KẾT QUẢ: TẤT CẢ XANH (CHỜ không tính)"; fi
