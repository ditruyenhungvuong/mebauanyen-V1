#!/usr/bin/env bash
# ============================================================
#  upload.sh - đẩy app "Mẹ Bầu An Yên" lên GitHub Pages (Ubuntu/Linux)
#  Chủ: devops (T-06). Bản Windows tương đương: upload.bat
#  Mỗi lần chạy = một lần cập nhật.
#  Cách dùng (trong Terminal):   ./upload.sh
#  Có thể truyền lời commit:      ./upload.sh "Sua mau nut"
#  Repo: https://github.com/ditruyenhungvuong/mebauanyen-V1
#  Web:  https://ditruyenhungvuong.github.io/mebauanyen-V1/
#  Anh chọn đẩy chung tài khoản ditruyenhungvuong như các app khác (30/10/2026, ADR 0006 phương án C).
#  Vì chung địa chỉ: giữ TEXT_SYNC_ENABLED: false (soát bên dưới chặn nếu bật).
# ============================================================

# ===== Cấu hình riêng của app (chỉ sửa khối này khi chép sang app khác) =====
REPO="ditruyenhungvuong/mebauanyen-V1"
BRANCH="main"
PAGES="https://ditruyenhungvuong.github.io/mebauanyen-V1/"
MSG="Cap nhat app Me Bau An Yen"
# File chứa GOOGLE_SCRIPT_URL / MOCK để soát trước khi đẩy.
CONFIG="js/config.js"
# 0 = Bước A: cho phép GOOGLE_SCRIPT_URL rỗng (app chạy trên máy, không gửi Sheet).
#     ACCOUNT_ENABLED / TEXT_SYNC_ENABLED bật thì vẫn BẮT BUỘC có URL thật (soát riêng bên dưới).
REQUIRE_URL=0
# ID bản triển khai Apps Script của CÁC APP KHÁC (cách nhau bằng dấu cách). Thấy trong CONFIG thì KHÔNG ĐẨY:
#   nhatkymebau, checkin-me-bau (bản cũ đã lộ), checkin-vao-ca, tra-loi-an-danh.
OLD_IDS="AKfycbwy1tGyPXLPPcObjB9_V--WHz2BUygzzJWzU3m8kIZ78s3DP0EkfTPyRPYY1eHx_lhp
AKfycbzSx6BZ3UfryYuNBOPZY7Jvz7rBx_x-lHRCHl1Pfl9i_C_bHc2BJdXDBeqKqcT4-m7PZg
AKfycbzJw_bOTSq4RTbGUhd8TFraOlqKPYM7mea5EOFIcgCstuAQi5rKDDXY1yol8pIZVBxe-A
AKfycbwM7oZT0GgMPYZ3sdQA1fQ5KrHPp4m0fWNBJUZ6Yvg2TsYBdCDO7BdZmvTnTUQQNqXipg"
# Không đẩy lên GitHub (thêm vào .git/info/exclude trên máy, bỏ khỏi repo nếu lỡ có).
# Trùng với .gitignore (chặn hai lớp). *.conflict* = bản trùng do đồng bộ Drive (rclone bisync) sinh ra.
EXCLUDE="NGUON.md .claude/ qa-out/ tests/out/ node_modules/ *.conflict*"
# Dòng in thêm khi xong. Để trống nếu không cần.
EXTRA_DONE=""

# ===== Chuẩn bị =====
[ -n "${1:-}" ] && MSG="$1"
# Luôn chạy đúng thư mục chứa file này, dù gọi từ đâu
cd "$(dirname "$(readlink -f "$0")")" || exit 1
SELF="$(basename "$0")"

echo
echo "======== ĐANG TẢI CODE LÊN GITHUB: $REPO ========"
echo "Thư mục: $PWD"
echo

# Hướng dẫn tạo repo + bật Pages (dùng khi chưa có repo hoặc đẩy lỗi)
guide_create() {
  echo "       a) Mở https://github.com/new (đăng nhập tài khoản ${REPO%%/*})"
  echo "          - Repository name: ${REPO#*/}   (phải đúng y tên này)"
  echo "          - chọn Public, KHÔNG tick \"Add a README\", không chọn .gitignore / license"
  echo "          - bấm Create repository."
  echo "          (Đã cài gh thì làm nhanh:  gh repo create $REPO --public )"
  echo "       b) Chạy lại ./$SELF. Đẩy xong thì bật Pages (mục cuối khi HOÀN THÀNH)."
}

# ===== [0/5] Soát cấu hình trước khi đẩy =====
# App chạy thật không được trỏ vào mock local, không dùng Apps Script của app khác,
# và không bật tài khoản / gửi chữ khi chưa có Apps Script thật.
if [ -n "$CONFIG" ]; then
  echo "[0/5] Kiểm tra $CONFIG..."
  if [ ! -f "$CONFIG" ]; then
    echo
    echo "[!] KHÔNG ĐẨY. Không thấy file $CONFIG trong thư mục này."
    echo "    Có thể đang chạy $SELF ở sai thư mục. Thư mục hiện tại: $PWD"
    exit 1
  fi
  if grep -Eq '^[[:space:]]*MOCK:[[:space:]]*true' "$CONFIG"; then
    echo
    echo "[!] KHÔNG ĐẨY. File $CONFIG đang để MOCK: true (chế độ chạy thử trên máy)."
    echo "    Đẩy lên như vậy thì app trên web sẽ tìm server giả ở localhost và KHÔNG hoạt động."
    echo "    Cách sửa: mở $CONFIG, đổi   MOCK: true,   thành   MOCK: false,   lưu lại rồi chạy lại."
    exit 1
  fi
  # Lấy giá trị GOOGLE_SCRIPT_URL ở dòng không phải comment (dạng  KEY: '...'  hoặc  const KEY = '...')
  URL_LINE="$(grep -E "^[[:space:]]*(const[[:space:]]+)?GOOGLE_SCRIPT_URL[[:space:]]*[:=]" "$CONFIG" | head -1)"
  URL_VAL="$(printf '%s' "$URL_LINE" | sed -E "s/^[^'\"]*['\"]([^'\"]*)['\"].*/\1/")"
  [ "$URL_VAL" = "$URL_LINE" ] && URL_VAL=""
  if printf '%s' "$URL_VAL" | grep -Eq 'localhost|127\.0\.0\.1|0\.0\.0\.0'; then
    echo
    echo "[!] KHÔNG ĐẨY. GOOGLE_SCRIPT_URL đang trỏ vào máy local: $URL_VAL"
    echo "    Đổi lại thành URL Apps Script thật (hoặc '' khi còn Bước A), lưu rồi chạy lại."
    exit 1
  fi
  # Địa chỉ local ở chỗ khác (link nhạc, ảnh...) cũng chặn. Riêng MOCK_URL được phép (chỉ dùng khi MOCK: true).
  LOCAL_LINES="$(grep -nE 'localhost|127\.0\.0\.1|0\.0\.0\.0' "$CONFIG" \
    | grep -vE '^[0-9]+:[[:space:]]*(MOCK_URL[[:space:]]*:|//|/\*|\*)')"
  if [ -n "$LOCAL_LINES" ]; then
    echo
    echo "[!] KHÔNG ĐẨY. $CONFIG còn địa chỉ máy local (chỉ MOCK_URL được để localhost):"
    printf '%s\n' "$LOCAL_LINES" | head -5 | sed 's/^/      dòng /'
    echo "    Trên web, địa chỉ này trỏ vào máy của chị đang dùng app nên không chạy. Sửa rồi chạy lại."
    exit 1
  fi
  for OLD_ID in $OLD_IDS; do
    if grep -qF "$OLD_ID" "$CONFIG"; then
      echo
      echo "[!] KHÔNG ĐẨY. $CONFIG đang dùng ID Apps Script của MỘT APP KHÁC:"
      echo "      $OLD_ID"
      echo "    Mẹ Bầu An Yên phải gửi vào Apps Script RIÊNG (hai file Sheet riêng, ADR 0005)."
      echo "    Cách lấy URL đúng: mở Sheet của Mẹ Bầu An Yên > Tiện ích mở rộng > Apps Script"
      echo "    > Triển khai > Quản lý bản triển khai, chép \"URL ứng dụng web\" (.../exec)."
      echo "    Chưa cài Bước B thì để GOOGLE_SCRIPT_URL: '' và ACCOUNT_ENABLED: false."
      exit 1
    fi
  done
  REAL_URL=0
  printf '%s' "$URL_VAL" | grep -Eq '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]{20,}/exec$' && REAL_URL=1
  for FLAG in ACCOUNT_ENABLED TEXT_SYNC_ENABLED; do
    if grep -Eq "^[[:space:]]*$FLAG:[[:space:]]*true" "$CONFIG" && [ "$REAL_URL" != 1 ]; then
      echo
      echo "[!] KHÔNG ĐẨY. $CONFIG đang bật $FLAG: true nhưng GOOGLE_SCRIPT_URL chưa phải URL Apps Script thật."
      echo "    Hiện đang là: '${URL_VAL}'"
      echo "    Bật như vậy thì chị bấm đăng nhập / gửi mà app không có chỗ gửi."
      echo "    Cách sửa (chọn một):"
      echo "      - Còn Bước A: đổi về   $FLAG: false,   lưu rồi chạy lại."
      echo "      - Đã cài Apps Script (đầu file google_apps_script.js, BƯỚC 1...n): dán URL dạng"
      echo "        https://script.google.com/macros/s/.../exec vào dòng GOOGLE_SCRIPT_URL, lưu rồi chạy lại."
      exit 1
    fi
  done
  # ADR 0006: chỉ gửi chữ tự viết lên Sheet khi app ở origin riêng
  if grep -Eq '^[[:space:]]*TEXT_SYNC_ENABLED:[[:space:]]*true' "$CONFIG" \
     && printf '%s' "$REPO" | grep -q '^ditruyenhungvuong/'; then
    echo
    echo "[!] KHÔNG ĐẨY. TEXT_SYNC_ENABLED: true chỉ được bật khi app ở địa chỉ riêng (ADR 0006),"
    echo "    nhưng REPO đang là $REPO (chung địa chỉ với các app khác)."
    exit 1
  fi
  if [ -z "$URL_VAL" ]; then
    if [ "$REQUIRE_URL" = "1" ]; then
      echo
      echo "[!] KHÔNG ĐẨY. File $CONFIG chưa có GOOGLE_SCRIPT_URL (đang để rỗng)."
      exit 1
    fi
    echo "      Cấu hình ổn cho Bước A: MOCK tắt, tài khoản tắt, chưa gửi Google Sheet."
  elif [ "$REAL_URL" != 1 ]; then
    echo "      [?] GOOGLE_SCRIPT_URL không giống địa chỉ Apps Script (https://script.google.com/macros/s/.../exec)."
    echo "          Vẫn tiếp tục vì tài khoản đang tắt, nhưng nhớ xem lại dòng này trước Bước B."
  else
    echo "      Cấu hình ổn: MOCK đang tắt, đã có GOOGLE_SCRIPT_URL riêng."
  fi
fi

# Bản trùng do đồng bộ Drive (rclone bisync sinh *.conflict1, *.conflict2... khi một file bị sửa
# ở cả hai phía). Không tự xóa: có khi bản .conflict mới là bản đúng. Dừng để anh xem.
CONFLICTS="$(find . -path ./.git -prune -o -name '*.conflict*' -print 2>/dev/null | sed 's#^\./##' | sort)"
if [ -n "$CONFLICTS" ]; then
  echo
  echo "[!] KHÔNG ĐẨY. Thư mục có $(printf '%s\n' "$CONFLICTS" | wc -l) file trùng do đồng bộ Drive:"
  printf '%s\n' "$CONFLICTS" | head -20 | sed 's/^/      - /'
  echo "    Mỗi file .conflict là một bản khác của file chính cùng tên (bỏ đuôi .conflictN)."
  echo "    Cách sửa: mở so với file chính, giữ lại bản đúng (chép nội dung đúng vào file chính),"
  echo "    rồi XÓA file .conflict và chạy lại ./$SELF. Script không tự xóa giúp."
  exit 1
fi

# ===== [1/5] Kiểm tra đã cài Git chưa =====
if ! command -v git >/dev/null 2>&1; then
  echo "[!] Máy này chưa cài Git. Cài một lần bằng lệnh:"
  echo "      sudo apt install -y git"
  echo "    rồi chạy lại ./$SELF"
  exit 1
fi

# ===== [2/5] Khởi tạo / nối Git trong thư mục app =====
if [ -d .git ]; then
  echo "[2/5] Git đã có sẵn, cập nhật địa chỉ repo..."
  git remote set-url origin "https://github.com/$REPO.git" 2>/dev/null \
    || git remote add origin "https://github.com/$REPO.git"
  git branch -M "$BRANCH"
else
  echo "[2/5] Khởi tạo Git lần đầu..."
  git init -q
  git branch -M "$BRANCH"
  git remote add origin "https://github.com/$REPO.git"
  # File chép từ Windows/Drive có xuống dòng CRLF: commit lên GitHub dạng LF như bên Surface
  git config core.autocrlf input
  # Repo trên GitHub đã có code (đẩy từ Surface) thì nối vào lịch sử đó, không tạo lịch sử mới.
  # ls-remote: 0 = có nhánh, 2 = repo có nhưng còn trống, khác = chưa có repo / không vào được.
  git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1
  LS=$?
  if [ "$LS" = 0 ]; then
    echo "      Repo trên GitHub đã có code, đang nối vào lịch sử nhánh $BRANCH..."
    if git fetch -q origin "$BRANCH" && git reset -q "origin/$BRANCH"; then
      git branch -q --set-upstream-to="origin/$BRANCH" "$BRANCH"
    else
      echo "[!] Không tải được lịch sử từ GitHub. Xem lỗi ở trên rồi chạy lại."
      rm -rf .git
      exit 1
    fi
  elif [ "$LS" = 2 ]; then
    echo "      Repo trên GitHub còn trống, đây là lần đẩy đầu tiên."
  else
    rm -rf .git
    echo
    echo "[!] KHÔNG ĐẨY. Chưa vào được repo https://github.com/$REPO"
    echo "    Thường là repo \"${REPO#*/}\" chưa được tạo (hoặc máy đang mất mạng)."
    echo "    Làm một lần:"
    guide_create
    exit 1
  fi
fi

# Git cần biết tên + email người commit. Chưa có thì hỏi một lần, lưu riêng cho thư mục này.
if [ -z "$(git config user.name)" ]; then
  read -r -p "Nhập tên của anh để ghi vào lịch sử (ví dụ: BS Thong): " GITNAME
  git config user.name "${GITNAME:-ditruyenhungvuong}"
fi
if [ -z "$(git config user.email)" ]; then
  read -r -p "Nhập email GitHub của anh (Enter để bỏ qua): " GITEMAIL
  git config user.email "${GITEMAIL:-ditruyenhungvuong@users.noreply.github.com}"
fi

# ===== [3/5] Gom file =====
echo "[3/5] Đang gom toàn bộ file..."
# File không được lên GitHub: ghi vào .git/info/exclude (chỉ trên máy này, không commit)
mkdir -p .git/info
touch .git/info/exclude
set -f   # EXCLUDE có mẫu *.conflict*: không để shell tự bung thành tên file
for P in $EXCLUDE; do
  grep -qxF "$P" .git/info/exclude || printf '%s\n' "$P" >> .git/info/exclude
done
git -c core.safecrlf=false add -A
# Lỡ có trong lịch sử từ lần trước thì bỏ khỏi repo (file trên máy giữ nguyên)
# shellcheck disable=SC2086
git rm -r -q --cached --ignore-unmatch -- $EXCLUDE >/dev/null 2>&1
set +f
# Giữ quyền chạy cho upload.sh và tools/serve.sh để clone về máy khác vẫn ./upload.sh được
git update-index --chmod=+x "$SELF" 2>/dev/null
[ -f tools/serve.sh ] && git update-index --chmod=+x tools/serve.sh 2>/dev/null

# Chốt an toàn: lần này có XÓA file nào trên GitHub không (ví dụ thư mục chỉ là bản chép thiếu ảnh)
DELETED="$(git diff --cached --diff-filter=D --name-only)"
if [ -n "$DELETED" ]; then
  echo
  echo "[!] Lần đẩy này sẽ XÓA $(printf '%s\n' "$DELETED" | wc -l) file khỏi GitHub (và khỏi trang web):"
  printf '%s\n' "$DELETED" | head -20 | sed 's/^/      - /'
  [ "$(printf '%s\n' "$DELETED" | wc -l)" -gt 20 ] && echo "      ..."
  read -r -p "    Gõ  co  để đồng ý xóa, Enter để dừng lại: " OK
  if [ "$OK" != "co" ]; then
    git reset -q
    echo "    Đã dừng, chưa đẩy gì. Chép lại các file thiếu vào thư mục rồi chạy lại."
    exit 1
  fi
fi

# ===== [4/5] Commit =====
echo "[4/5] Đang tạo bản commit..."
if git diff --cached --quiet; then
  echo "      Không có thay đổi mới so với lần trước, chỉ đẩy lại bản hiện tại."
elif git commit -q -m "$MSG"; then
  echo "      Đã tạo commit: $MSG"
else
  echo "[!] Tạo commit thất bại. Xem lỗi chi tiết ở trên."
  exit 1
fi

# ===== [5/5] Push =====
echo "[5/5] Đang đẩy code lên GitHub..."
if git push -u origin "$BRANCH"; then
  echo
  echo "[V] HOÀN THÀNH."
  echo "    Mã nguồn:  https://github.com/$REPO"
  echo "    Trang web: $PAGES"
  [ -n "$EXTRA_DONE" ] && echo "    $EXTRA_DONE"
  echo "    (Lần đầu cần bật GitHub Pages: mở https://github.com/$REPO/settings/pages"
  echo "     > Source: Deploy from a branch > Branch: $BRANCH / (root) > Save."
  echo "     Đợi 1-2 phút rồi mở link trên. Các lần sau tự cập nhật.)"
  exit 0
fi

echo
echo "[!] KHÔNG ĐẨY ĐƯỢC. Thường do một trong bốn lý do:"
echo
echo "    1. Máy này chưa đăng nhập GitHub (GitHub không nhận mật khẩu thường khi đẩy code)."
echo "       Làm một lần:"
echo "         sudo apt install -y gh"
echo "         gh auth login        (chọn GitHub.com > HTTPS > Login with a web browser)"
echo "         gh auth setup-git"
echo "       rồi chạy lại ./$SELF"
echo
echo "    2. Chưa có repo \"${REPO#*/}\" trên GitHub:"
guide_create
echo
echo "    3. Tài khoản đang đăng nhập chưa có quyền với repo $REPO:"
echo "       Mở https://github.com/$REPO/settings/access"
echo "       bấm \"Add people\", thêm tài khoản GitHub đang dùng trên máy này, rồi chạy lại."
echo
echo "    4. Trên GitHub có thay đổi mà máy chưa có (đẩy từ Surface hoặc sửa trên web):"
echo "       Chạy lệnh:  git pull --rebase origin $BRANCH   rồi chạy lại ./$SELF"
echo
exit 1
