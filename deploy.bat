@echo off
echo ╔══════════════════════════════════════════════════════════╗
echo ║         🚀 Deploying to Vercel...                        ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd public
vercel --prod

pause

