@echo off
title 2 Hands Massage & Wellness - Dev Server
cd /d "%~dp0"
echo ========================================================
echo  2 Hands Massage ^& Wellness - Web Management System
echo ========================================================
echo.
echo Starting backend server (port 4000) and Vite frontend (port 5173)...
echo.
call npm.cmd run dev
pause
