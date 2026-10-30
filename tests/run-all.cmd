@echo off
rem =========================================================
rem  Chay toan bo test cua Me Bau An Yen (chu: qa-tester; T-00 dung khung, T-Q1 hoan thien).
rem  Thu tu: check-static -> unit-* (4 mui gio) -> test-gas -> test-mock-api -> smoke -> e2e (Chrome headless).
rem  Can Node >= 22. May khong co Node trong PATH thi dat bien NODE, vi du:
rem    set NODE=C:\Users\SF\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
rem  Can Chrome tai C:\Program Files\Google\Chrome\Application\chrome.exe (hoac dat CHROME=...).
rem  CHO = phan app chua lam: khong tinh do, khong tinh xanh. Co buoc do -> exit 1.
rem  Tham so (vd --strict) chi chuyen cho check-static.
rem =========================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."
if "%NODE%"=="" set NODE=node
if "%TEMP%"=="" set TEMP=%~dp0
set OUTDIR=%TEMP%\lstp-qa
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set FAIL=0
set SUM=
echo === check-static ===
"%NODE%" tests\check-static.js %*
if errorlevel 1 (set FAIL=1 & set SUM=!SUM! [DO check-static]) else (set SUM=!SUM! [XANH check-static])
for %%f in (tests\unit-*.js) do (
  echo === %%~nf ===
  "%NODE%" %%f
  if errorlevel 1 (set FAIL=1 & set SUM=!SUM! [DO %%~nf]) else (set SUM=!SUM! [XANH %%~nf])
)
for %%f in (tests\test-gas.js tests\test-mock-api.js) do (
  if exist %%f (
    echo === %%~nf ===
    "%NODE%" %%f
    if errorlevel 1 (set FAIL=1 & set SUM=!SUM! [DO %%~nf]) else (set SUM=!SUM! [XANH %%~nf])
  )
)
for %%f in (tests\smoke.js tests\e2e.js) do (
  if exist %%f (
    echo === %%~nf ^(Chrome headless^) ===
    "%NODE%" %%f --out="%OUTDIR%"
    if errorlevel 1 (set FAIL=1 & set SUM=!SUM! [DO %%~nf]) else (set SUM=!SUM! [XANH %%~nf])
  )
)
echo.
echo TOM TAT:!SUM!
if "%FAIL%"=="1" (echo KET QUA: CO TEST DO & exit /b 1) else (echo KET QUA: TAT CA XANH ^(CHO khong tinh^) & exit /b 0)
