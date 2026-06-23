@echo off
cd /d "d:\Project\SM trading\SMTrading\SMTreading\frontend"
call npx tsc --noEmit -p tsconfig.app.json > tsc-check.log 2>&1
echo Exit code: %ERRORLEVEL%
