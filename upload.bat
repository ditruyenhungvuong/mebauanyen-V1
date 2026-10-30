@echo off
chcp 65001 >nul
setlocal

rem ============================================================
rem  upload.bat - day app "Me Bau An Yen" len GitHub Pages (Windows)
rem  Chu: devops (T-06). Ban Ubuntu tuong duong: upload.sh
rem  Cach dung: bam dup file nay. Moi lan chay = mot lan cap nhat.
rem  Co the truyen loi commit:  upload.bat "Sua mau nut"
rem  Repo: https://github.com/ditruyenhungvuong/mebauanyen-V1
rem  Web:  https://ditruyenhungvuong.github.io/mebauanyen-V1/
rem  Anh chon day chung tai khoan ditruyenhungvuong (30/10/2026, ADR 0006 phuong an C).
rem  Vi chung dia chi: giu TEXT_SYNC_ENABLED: false (soat ben duoi chan neu bat).
rem
rem  Thong bao viet khong dau vi cua so cmd mac dinh khong hien
rem  tieng Viet co dau (theo docs/style/architecture-pattern.md muc 12).
rem ============================================================

rem Luon chay dung thu muc chua file nay, du bam dup tu dau
cd /d "%~dp0"

set "OWNER=ditruyenhungvuong"
set "REPONAME=mebauanyen-V1"
set "REPO=ditruyenhungvuong/mebauanyen-V1"
set "BRANCH=main"
set "PAGES=https://ditruyenhungvuong.github.io/mebauanyen-V1/"
set "CONFIG=js\config.js"
set "MSG=Cap nhat app Me Bau An Yen"
rem ID Apps Script cua CAC APP KHAC: nhatkymebau, checkin-me-bau cu, checkin-vao-ca, tra-loi-an-danh
set "OLD_IDS=AKfycbwy1tGyPXLPPcObjB9_V--WHz2BUygzzJWzU3m8kIZ78s3DP0EkfTPyRPYY1eHx_lhp AKfycbzSx6BZ3UfryYuNBOPZY7Jvz7rBx_x-lHRCHl1Pfl9i_C_bHc2BJdXDBeqKqcT4-m7PZg AKfycbzJw_bOTSq4RTbGUhd8TFraOlqKPYM7mea5EOFIcgCstuAQi5rKDDXY1yol8pIZVBxe-A AKfycbwM7oZT0GgMPYZ3sdQA1fQ5KrHPp4m0fWNBJUZ6Yvg2TsYBdCDO7BdZmvTnTUQQNqXipg"
rem Khong day len GitHub: ghi vao .git\info\exclude (chi tren may nay), bo khoi repo neu lo co
rem *.conflict* = ban trung do dong bo Drive ^(rclone bisync^) sinh ra; ghi rieng ben duoi vi for cua cmd bung dau *
set "EXCLUDE=NGUON.md .claude/ qa-out/ tests/out/ node_modules/"
if not "%~1"=="" set "MSG=%~1"

echo.
echo ======== DANG TAI CODE LEN GITHUB: %REPO% ========
echo Thu muc: %CD%
echo.

rem ---------- [0/5] Soat cau hinh truoc khi day ----------
rem Khong tro vao mock local, khong dung Apps Script cua app khac,
rem khong bat tai khoan / gui chu khi chua co Apps Script that.
echo [0/5] Kiem tra %CONFIG%...
if not exist "%CONFIG%" goto :noconfig
findstr /R /C:"^ *MOCK: *true" "%CONFIG%" >nul 2>&1
if %errorlevel% equ 0 goto :mockon
findstr /R /C:"^ *GOOGLE_SCRIPT_URL:.*localhost" /C:"^ *GOOGLE_SCRIPT_URL:.*127\.0\.0\.1" /C:"^ *GOOGLE_SCRIPT_URL:.*0\.0\.0\.0" "%CONFIG%" >nul 2>&1
if %errorlevel% equ 0 goto :urllocal
rem Dia chi local o cho khac (link nhac, anh...) cung chan. Rieng MOCK_URL duoc phep.
findstr /N /R /C:"localhost" /C:"127\.0\.0\.1" /C:"0\.0\.0\.0" "%CONFIG%" 2>nul | findstr /V /R /C:"^[0-9]*: *MOCK_URL *:" /C:"^[0-9]*: *//" /C:"^[0-9]*: */\*" /C:"^[0-9]*: *\*" >nul 2>&1
if %errorlevel% equ 0 goto :otherlocal
for %%i in (%OLD_IDS%) do (
    findstr /C:"%%i" "%CONFIG%" >nul 2>&1 && goto :oldid
)
set "REALURL="
findstr /R /C:"^ *GOOGLE_SCRIPT_URL: *'https://script\.google\.com/macros/s/[^'/][^'/]*/exec'" "%CONFIG%" >nul 2>&1
if %errorlevel% equ 0 set "REALURL=1"
findstr /R /C:"^ *ACCOUNT_ENABLED: *true" "%CONFIG%" >nul 2>&1
if %errorlevel% equ 0 if not defined REALURL goto :flagnourl
findstr /R /C:"^ *TEXT_SYNC_ENABLED: *true" "%CONFIG%" >nul 2>&1
if %errorlevel% equ 0 if not defined REALURL goto :flagnourl
rem ADR 0006: chi gui chu tu viet len Sheet khi app o dia chi rieng
findstr /R /C:"^ *TEXT_SYNC_ENABLED: *true" "%CONFIG%" >nul 2>&1
if %errorlevel% neq 0 goto :cfgok
echo %REPO%| findstr /B /C:"ditruyenhungvuong/" >nul 2>&1
if %errorlevel% equ 0 goto :textsyncshared

:cfgok
if defined REALURL (
    echo       Cau hinh on: MOCK dang tat, da co GOOGLE_SCRIPT_URL rieng.
) else (
    echo       Cau hinh on cho Buoc A: MOCK tat, tai khoan tat, chua gui Google Sheet.
)

rem Ban trung do dong bo Drive: rclone bisync sinh *.conflict1, *.conflict2... khi mot file
rem bi sua o ca hai phia. Khong tu xoa vi co khi ban .conflict moi la ban dung. Dung de anh xem.
set "HASCONF="
for /f "delims=" %%f in ('dir /s /b /a-d "*.conflict*" 2^>nul') do set "HASCONF=1"
if defined HASCONF goto :conflicts

rem ---------- [1/5] Kiem tra da cai Git chua ----------
git --version >nul 2>&1
if %errorlevel% neq 0 goto :nogit

rem ---------- [2/5] Khoi tao / noi Git trong thu muc app ----------
if exist ".git\" goto :hasgit
echo [2/5] Khoi tao Git lan dau...
git init >nul
git branch -M %BRANCH%
git remote add origin https://github.com/%REPO%.git
rem Repo tren GitHub da co code thi noi vao lich su do, khong tao lich su moi.
rem ls-remote: 0 = co nhanh, 2 = repo co nhung con trong, khac = chua co repo / khong vao duoc.
git ls-remote --exit-code --heads origin %BRANCH% >nul 2>&1
if %errorlevel% equ 2 goto :emptyrepo
if %errorlevel% neq 0 goto :norepo
echo       Repo tren GitHub da co code, dang noi vao lich su nhanh %BRANCH%...
git fetch -q origin %BRANCH%
if %errorlevel% neq 0 goto :fetchfail
git reset -q origin/%BRANCH%
git branch -q --set-upstream-to=origin/%BRANCH% %BRANCH%
goto :identity

:emptyrepo
echo       Repo tren GitHub con trong, day la lan day dau tien.
goto :identity

:hasgit
echo [2/5] Git da co san, cap nhat dia chi repo...
git remote set-url origin https://github.com/%REPO%.git 2>nul || git remote add origin https://github.com/%REPO%.git
git branch -M %BRANCH%

:identity
rem Git can biet ten + email nguoi commit. Chua co thi hoi mot lan, luu rieng cho thu muc nay.
set "GITNAME="
set "GITEMAIL="
for /f "delims=" %%n in ('git config user.name 2^>nul') do set "GITNAME=%%n"
for /f "delims=" %%e in ('git config user.email 2^>nul') do set "GITEMAIL=%%e"
if not defined GITNAME call :askname
if not defined GITEMAIL call :askemail

rem ---------- [3/5] Gom file ----------
echo [3/5] Dang gom toan bo file...
rem File khong duoc len GitHub: ghi vao .git\info\exclude (chi tren may nay, khong commit)
if not exist ".git\info\" mkdir ".git\info"
if not exist ".git\info\exclude" type nul > ".git\info\exclude"
for %%p in (%EXCLUDE%) do (
    findstr /X /L /C:"%%p" ".git\info\exclude" >nul 2>&1 || >>".git\info\exclude" echo %%p
)
git -c core.safecrlf=false add -A
rem Lo co trong lich su tu lan truoc thi bo khoi repo (file tren may giu nguyen)
findstr /X /L /C:"*.conflict*" ".git\info\exclude" >nul 2>&1 || >>".git\info\exclude" echo *.conflict*
git rm -r -q --cached --ignore-unmatch -- %EXCLUDE% "*.conflict*" >nul 2>&1
rem Giu quyen chay cho upload.sh va tools/serve.sh de may Ubuntu clone ve van chay duoc
git update-index --chmod=+x upload.sh >nul 2>&1
git update-index --chmod=+x tools/serve.sh >nul 2>&1

rem Chot an toan: lan nay co XOA file nao tren GitHub khong.
rem Thu muc chi la ban chep thieu anh thi se hien o day: DUNG LAI, chep du file roi chay lai.
set "HASDEL="
for /f "delims=" %%f in ('git diff --cached --diff-filter=D --name-only') do set "HASDEL=1"
if not defined HASDEL goto :commit
echo.
echo [!] Lan day nay se XOA cac file sau khoi GitHub va khoi trang web:
for /f "delims=" %%f in ('git diff --cached --diff-filter=D --name-only') do echo       - %%f
set "OK="
set /p "OK=    Go  co  de dong y xoa, Enter de dung lai: "
if /i not "%OK%"=="co" goto :stopdel

:commit
rem ---------- [4/5] Commit ----------
echo [4/5] Dang tao ban commit...
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo       Khong co thay doi moi so voi lan truoc, chi day lai ban hien tai.
    goto :push
)
git commit -m "%MSG%" >nul
if %errorlevel% neq 0 (
    echo [!] Tao commit that bai. Chay lai upload.bat de xem loi chi tiet o tren.
    goto :end
)
echo       Da tao commit: %MSG%

rem ---------- [5/5] Push ----------
:push
echo [5/5] Dang day code len GitHub ^(co the hien cua so dang nhap GitHub^)...
git push -u origin %BRANCH%
if %errorlevel% neq 0 goto :pushfail

echo.
echo [V] HOAN THANH.
echo     Ma nguon:  https://github.com/%REPO%
echo     Trang web: %PAGES%
echo     ^(Lan dau can bat GitHub Pages: mo https://github.com/%REPO%/settings/pages
echo      ^> Source: Deploy from a branch ^> Branch: %BRANCH% / ^(root^) ^> Save.
echo      Doi 1-2 phut roi mo link tren. Cac lan sau tu cap nhat.^)
goto :end

rem ============================================================
rem  Cac nhanh dung lai vi cau hinh chua san sang
rem ============================================================
:noconfig
echo.
echo [!] KHONG DAY. Khong thay file %CONFIG% trong thu muc nay.
echo     Co the dang chay upload.bat o sai thu muc. Thu muc hien tai: %CD%
goto :end

:mockon
echo.
echo [!] KHONG DAY. File %CONFIG% dang de MOCK: true ^(che do chay thu tren may^).
echo     Neu day len nhu vay, app tren web se tim server gia o localhost va KHONG hoat dong.
echo.
echo     Cach sua: mo %CONFIG%, tim dong   MOCK: true,   doi thanh   MOCK: false,
echo     luu lai, roi bam dup upload.bat lan nua.
goto :end

:urllocal
echo.
echo [!] KHONG DAY. GOOGLE_SCRIPT_URL trong %CONFIG% dang tro vao may local.
echo     Doi lai thanh URL Apps Script that ^(hoac '' khi con Buoc A^), luu roi bam dup upload.bat lan nua.
goto :end

:otherlocal
echo.
echo [!] KHONG DAY. %CONFIG% con dia chi may local ^(chi MOCK_URL duoc de localhost^):
findstr /N /R /C:"localhost" /C:"127\.0\.0\.1" /C:"0\.0\.0\.0" "%CONFIG%" | findstr /V /R /C:"^[0-9]*: *MOCK_URL *:" /C:"^[0-9]*: *//" /C:"^[0-9]*: */\*" /C:"^[0-9]*: *\*"
echo     Tren web, dia chi nay tro vao may cua chi dang dung app nen khong chay. Sua roi chay lai.
goto :end

:oldid
echo.
echo [!] KHONG DAY. %CONFIG% dang dung ID Apps Script cua MOT APP KHAC.
echo     Me Bau An Yen phai gui vao Apps Script RIENG ^(hai file Sheet rieng, ADR 0005^).
echo     Cach lay URL dung: mo Sheet cua Me Bau An Yen ^> Tien ich mo rong ^> Apps Script
echo     ^> Trien khai ^> Quan ly ban trien khai, chep "URL ung dung web" ^(.../exec^).
echo     Chua cai Buoc B thi de GOOGLE_SCRIPT_URL: '' va ACCOUNT_ENABLED: false.
goto :end

:flagnourl
echo.
echo [!] KHONG DAY. %CONFIG% dang bat ACCOUNT_ENABLED hoac TEXT_SYNC_ENABLED: true
echo     nhung GOOGLE_SCRIPT_URL chua phai URL Apps Script that.
echo     Bat nhu vay thi chi bam dang nhap / gui ma app khong co cho gui.
echo.
echo     Cach sua ^(chon mot^):
echo       - Con Buoc A: doi ve   ACCOUNT_ENABLED: false,   TEXT_SYNC_ENABLED: false,   luu roi chay lai.
echo       - Da cai Apps Script ^(dau file google_apps_script.js, BUOC 1...n^): dan URL dang
echo         https://script.google.com/macros/s/.../exec vao dong GOOGLE_SCRIPT_URL, luu roi chay lai.
goto :end

:conflicts
echo.
echo [!] KHONG DAY. Thu muc co file trung do dong bo Drive:
for /f "delims=" %%f in ('dir /s /b /a-d "*.conflict*" 2^>nul') do echo       - %%f
echo     Moi file .conflict la mot ban khac cua file chinh cung ten ^(bo duoi .conflictN^).
echo     Cach sua: mo so voi file chinh, giu lai ban dung ^(chep noi dung dung vao file chinh^),
echo     roi XOA file .conflict va bam dup upload.bat lai. Script khong tu xoa giup.
goto :end


:textsyncshared
echo.
echo [!] KHONG DAY. TEXT_SYNC_ENABLED: true chi duoc bat khi app o dia chi rieng ^(ADR 0006^),
echo     nhung REPO dang la %REPO% ^(chung dia chi voi cac app khac^).
goto :end

rem ============================================================
rem  Cac nhanh loi
rem ============================================================
:norepo
rmdir /s /q ".git"
echo.
echo [!] KHONG DAY. Chua vao duoc repo https://github.com/%REPO%
echo     Thuong la repo "%REPONAME%" chua duoc tao ^(hoac may dang mat mang^).
echo     Lam mot lan:
call :guidecreate
goto :end

:fetchfail
echo [!] Khong tai duoc lich su tu GitHub. Xem loi o tren roi chay lai.
rmdir /s /q ".git"
goto :end

:stopdel
git reset -q
echo     Da dung, chua day gi. Chep lai cac file thieu - anh - vao thu muc roi chay lai.
goto :end

:nogit
echo [!] May nay chua cai Git, nen chua day code len duoc.
echo.
echo     Cach cai ^(lam mot lan^):
echo       1. Mo trang: https://git-scm.com/download/win
echo       2. Tai ban "64-bit Git for Windows Setup" va chay, bam Next het.
echo       3. Cai xong, DONG cua so nay, roi bam dup upload.bat lai.
goto :end

:pushfail
echo.
echo [!] KHONG DAY DUOC. Thuong do mot trong ba ly do:
echo.
echo     1. Chua co repo "%REPONAME%" tren GitHub:
call :guidecreate
echo.
echo     2. Tai khoan Git tren may chua co quyen voi repo %REPO%:
echo        Mo https://github.com/%REPO%/settings/access
echo        bam "Add people", them tai khoan GitHub dang dung tren may nay, roi chay lai.
echo.
echo     3. Tren GitHub co thay doi ma may chua co ^(sua truc tiep tren web^):
echo        Chay lenh:  git pull --rebase origin %BRANCH%   roi bam dup upload.bat lai.
goto :end

rem ============================================================
rem  Chuong trinh con
rem ============================================================
:guidecreate
echo        a^) Mo https://github.com/new ^(dang nhap tai khoan %OWNER%^)
echo           - Repository name: %REPONAME%   ^(phai dung y ten nay^)
echo           - chon Public, KHONG tick "Add a README", khong chon .gitignore / license
echo           - bam Create repository.
echo        b^) Bam dup upload.bat lai. Day xong thi bat Pages ^(muc cuoi khi HOAN THANH^).
goto :eof

:askname
set /p "GITNAME=Nhap ten cua anh de ghi vao lich su (vi du: BS Thong): "
if not defined GITNAME set "GITNAME=ditruyenhungvuong"
git config user.name "%GITNAME%"
goto :eof

:askemail
set /p "GITEMAIL=Nhap email GitHub cua anh (Enter de bo qua): "
if not defined GITEMAIL set "GITEMAIL=ditruyenhungvuong@users.noreply.github.com"
git config user.email "%GITEMAIL%"
goto :eof

:end
echo.
pause
endlocal
