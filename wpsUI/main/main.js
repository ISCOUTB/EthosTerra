import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path, { dirname } from "path";
import serve from "electron-serve";
import { execFile, exec } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs";

app.commandLine.appendSwitch("no-sandbox");

let isDev;
try {
  isDev = require("electron-is-dev").default;
} catch (error) {
  isDev = false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appServe = app.isPackaged
  ? serve({ directory: path.join(__dirname, "../out") })
  : null;

let mainWindow;
let splash;

const createWindow = () => {
  // 1) Ventana splash
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: true,
    show: true,
  });

  const splashPath = app.isPackaged
    ? path.join(__dirname, "splash.html")
    : path.join(__dirname, "../main/splash.html");
  splash.loadFile(splashPath);

  // 2) Ventana principal
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: "WpsUI - UTB",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "/preload/preload.mjs"),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // — Eliminar menú por defecto (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  // — Bloquear atajos de DevTools EN PRODUCCIÓN
  if (!isDev) {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      const key = input.key.toLowerCase();
      const ctrlOrCmd = process.platform === "darwin" ? input.meta : input.control;
      // Ctrl/Cmd+Shift+I or F12 or Cmd+Opt+I (macOS)
      if (
        (ctrlOrCmd && input.shift && key === "i") ||
        input.key === "F12" ||
        (process.platform === "darwin" && input.meta && input.alt && key === "i")
      ) {
        event.preventDefault();
      }
    });
  }

  // 3) Carga de contenido según entorno
  if (app.isPackaged) {
    appServe(mainWindow).then(() => {
      mainWindow.loadURL("app://-");
    });
  } else {
    mainWindow.loadURL("http://localhost:3000");
    // — Solo en desarrollo: abrir DevTools
    mainWindow.webContents.openDevTools();
  }

  // 4) Mostrar la ventana principal cuando esté lista
  mainWindow.once("ready-to-show", () => {
    splash.destroy();
    mainWindow.show();
  });
};

app.on("ready", createWindow);

// ---------------------- IPC y gestión de procesos Java ----------------------

let javaProcess;

ipcMain.handle("execute-exe", async (event, exePath, args) => {
  return new Promise((resolve, reject) => {
    javaProcess = execFile(exePath, args, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        mainWindow?.webContents.send("simulation-ended");
        resolve(stdout);
      }
      javaProcess = null;
    });
  });
});

ipcMain.handle("delete-file", async (_, filePath) => {
  try {
    await fs.promises.unlink(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-app-path", async () => {
  return app.isPackaged
    ? app.getAppPath() + ".unpacked"
    : app.getAppPath();
});

ipcMain.handle("clear-csv", async () => {
  try {
    const csvPath = path.join(
      app.getAppPath(),
      "../src/wps/logs/wpsSimulator.csv"
    );
    fs.writeFileSync(csvPath, "");
    return { success: true, path: csvPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("read-csv", async () => {
  try {
    const basePath = app.isPackaged
      ? path.join(app.getAppPath(), "../src/wps/logs/wpsSimulator.csv")
      : path.join(__dirname, "../src/wps/logs/wpsSimulator.csv");

    if (!fs.existsSync(basePath)) {
      return { success: false, error: "Archivo no encontrado" };
    }

    const data = fs.readFileSync(basePath, "utf-8");
    if (!data.trim()) {
      return { success: false, error: "Archivo CSV vacío" };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("file-exists", async (_, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle("kill-java-process", async () => {
  if (!javaProcess) {
    return { success: false, message: "No hay proceso Java activo" };
  }
  try {
    if (app.isPackaged) {
      execFile("taskkill", ["/pid", javaProcess.pid, "/f", "/t"]);
    } else {
      exec("taskkill /IM java.exe /F");
    }
    javaProcess = null;
    mainWindow?.webContents.send("simulation-ended");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("check-java-process", async () => {
  return { running: Boolean(javaProcess) };
});

// — Al cerrar ventanas, también cerramos el proceso Java si existe
app.on("window-all-closed", () => {
  if (javaProcess) {
    try {
      if (app.isPackaged) {
        execFile("taskkill", ["/pid", javaProcess.pid, "/f", "/t"]);
      } else {
        exec("taskkill /IM java.exe /F");
      }
    } catch (error) {
      console.error("Error al cerrar proceso Java:", error);
    }
    javaProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app