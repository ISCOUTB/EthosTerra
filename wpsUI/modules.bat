@echo off
REM Crear una nueva carpeta llamada "NuevaCarpeta"
mkdir "./dist/win-unpacked/node_modules"

REM Copiar la carpeta "electron-serve" y su contenido a "NuevaCarpeta"
xcopy "./node_modules/electron-serve" "./dist/win-unpacked/node_modules/electron-serve" /E /I /H /Y

REM /E Copia todos los subdirectorios, incluyendo los vacíos
REM /I Si el destino no existe y se está copiando más de un archivo, asume que el destino es un directorio
REM /H Copia archivos ocultos y de sistema
REM /Y Suprime la solicitud de confirmación para sobrescribir archivos existentes