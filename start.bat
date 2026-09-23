@echo off
chcp 65001 > nul
title BlueArchive Icon Canvas v1.0.21
echo ===================================================
echo   BlueArchive Icon Canvas - v1.0.21
echo   ブルアカ キャラクターアイコン キャンバス編集ツール
echo ========================================================
echo.

if exist "release\BlueArchiveIconCanvas.exe" (
    echo [1] ポータブルexeを起動中...
    start "" "release\BlueArchiveIconCanvas.exe"
    exit /b
)

echo [2] ローカルサーバーを起動してブラウザで開きます...
call npm run preview -- --port 5173 --open
pause
