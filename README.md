# Mẹ Bầu An Yên (`lifestyle-thai-phu`)

Web app tĩnh cho thai phụ: thư giãn an toàn cho thai kỳ, thai giáo, đếm cử động thai, nhật ký thói quen. Biến thể Hồng ấm, cỡ L.
**Trạng thái: khung (T-00), chưa có tính năng.** README đầy đủ do tech-writer viết cuối Bước A.

- Đặc tả: `docs/specs/lifestyle-thai-phu-prd.md`, `docs/specs/dem-cu-dong-thai-prd.md`, `docs/specs/lifestyle-thai-phu-ux.md`
- Thiết kế kỹ thuật: `docs/specs/lifestyle-thai-phu-tech-design.md` (mục "T-00 đã xong": file nào ai làm)
- ADR: `docs/adr/0004…`, `0005…`, `0006…`
- Địa chỉ: `https://ditruyenhungvuong.github.io/mebauanyen-V1/` (repo `ditruyenhungvuong/mebauanyen-V1`, chung tài khoản với các app khác; anh chốt 30/10/2026, ADR 0006 phương án C). Vì chung địa chỉ nên giữ `TEXT_SYNC_ENABLED: false`; app tự hiện câu A.18 ở trang "Dữ liệu của chị".

## Chạy trên máy

```bash
cd apps/lifestyle-thai-phu
python3 -m http.server 8765 --bind 127.0.0.1
# mở http://127.0.0.1:8765/
```
Không mở bằng `file://` (CSP `script-src 'self'` có thể chặn script).

## Test

```bash
export NODE=/home/adminpc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node   # cần Node ≥ 22
tests/run-all.sh            # rà tĩnh + unit + smoke Chrome headless
tests/run-all.sh --strict   # trước khi đẩy lên GitHub (MOCK phải tắt)
```
Windows: `tests\run-all.cmd`.

## Chưa làm / cần làm trước khi dùng thật

- Toàn bộ tính năng Bước A (FE-1…FE-5), `upload.sh`/`upload.bat`, nén ảnh (devops), e2e (QA).
- Bước B: `google_apps_script.js`, mock, tài khoản (backend-dev, FE-6), review bảo mật.
- Số liên hệ (`EMERGENCY_OB`, `OB_CONTACT`, `CLINIC_CONTACT`), link nhạc: chờ anh gửi.
- Link nhạc `.mp3`: khi anh thêm host vào `MUSIC_HOSTS` trong `js/config.js`, phải thêm đúng host đó (dạng `https://<host>`) vào `media-src` của CSP trong `index.html`, nếu không trình duyệt chặn nhạc. `tests/check-static.js` so hai chỗ này. CSP để `frame-src 'none'`: app không nhúng YouTube.
