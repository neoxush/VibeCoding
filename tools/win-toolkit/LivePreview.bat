@echo off
chcp 65001 >nul 2>nul
title Live Window Preview Tool
powershell -ExecutionPolicy Bypass -File "%~dp0LivePreview.ps1"
