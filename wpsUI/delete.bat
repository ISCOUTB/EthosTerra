@echo off

REM Eliminar la carpeta "dist" si existe
if exist "dist" (
    echo Eliminando carpeta dist...
    rmdir /s /q "dist"
)

REM Eliminar la carpeta ".next" si existe
if exist ".next" (
    echo Eliminando carpeta .next...
    rmdir /s /q ".next"
)

REM Eliminar un archivo si existe
if exist "./WellProdSim-Installer.exe" del "./WellProdSim-Installer.exe"