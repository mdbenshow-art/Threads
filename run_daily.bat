@echo off
:: Windows Task Scheduler will run this batch file daily.
:: It shifts directory to where the script is located and runs the sync.
cd /d "%~dp0"
node daily_sync.js
