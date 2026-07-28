@echo off
chcp 65001 >nul 2>nul
title LivePreview - Keep This Window Open
powershell -ExecutionPolicy Bypass -File "%~dp0LivePreview.ps1"
