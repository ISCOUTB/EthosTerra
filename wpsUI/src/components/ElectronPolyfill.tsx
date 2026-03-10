"use client";

import Script from "next/script";

/**
 * Polyfill de window.electronAPI para entornos web (Docker).
 * Mapea cada método de la API de Electron a una llamada fetch
 * contra las API Routes de Next.js (/api/simulator/*).
 *
 * Solo se inyecta si window.electronAPI aún no está definido
 * (en Electron sigue usando el preload original).
 */
export function ElectronPolyfill() {
  const script = `
(function() {
  if (typeof window === 'undefined' || window.electronAPI) return;

  // ---------- utilidades internas ----------
  var _listeners = {};
  var _polling = false;
  var _prevRunning = null;
  var _pollInterval = null;

  function _ensurePolling() {
    if (_pollInterval) return;
    _pollInterval = setInterval(async function () {
      try {
        var res = await fetch('/api/simulator');
        var data = await res.json();
        var nowRunning = Boolean(data.running);

        if (_prevRunning === true && nowRunning === false) {
          // Simulación terminó → notificar a todos los oyentes
          var cbs = (_listeners['simulation-ended'] || []).slice();
          for (var i = 0; i < cbs.length; i++) {
            try { cbs[i](null); } catch (_) {}
          }
        }
        _prevRunning = nowRunning;
      } catch (_) {}
    }, 2000);
  }

  function _stopPollingIfEmpty() {
    var hasListeners = Object.keys(_listeners).some(function(ch) {
      return _listeners[ch] && _listeners[ch].length > 0;
    });
    if (!hasListeners && _pollInterval) {
      clearInterval(_pollInterval);
      _pollInterval = null;
    }
  }

  // ---------- polyfill ----------
  window.electronAPI = {

    /** Leer CSV de resultados */
    readCsv: async function () {
      var res = await fetch('/api/simulator/csv');
      if (res.status === 404 || res.status === 204) {
        return { success: false, error: 'Archivo no encontrado o vacío' };
      }
      return res.json();
    },

    /** Vaciar CSV */
    clearCsv: async function () {
      var res = await fetch('/api/simulator/csv', { method: 'DELETE' });
      return res.json();
    },

    /** Lanzar simulación */
    executeExe: async function (exePath, args) {
      var res = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exePath: exePath, args: args }),
      });
      var data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al ejecutar simulación');
      return data.stdout || '';
    },

    /** Matar proceso Java */
    killJavaProcess: async function () {
      var res = await fetch('/api/simulator', { method: 'DELETE' });
      return res.json();
    },

    /** Estado del proceso Java */
    checkJavaProcess: async function () {
      var res = await fetch('/api/simulator');
      return res.json();
    },

    /** Ver si un archivo existe */
    fileExists: async function (filePath) {
      var res = await fetch('/api/simulator/file?path=' + encodeURIComponent(filePath));
      var data = await res.json();
      return data.exists === true;
    },

    /** Eliminar un archivo */
    deleteFile: async function (filePath) {
      var res = await fetch('/api/simulator/file?path=' + encodeURIComponent(filePath), {
        method: 'DELETE',
      });
      return res.json();
    },

    /** Ruta base de la aplicación */
    getAppPath: async function () {
      var res = await fetch('/api/simulator/app-path');
      var data = await res.json();
      return data.path;
    },

    /** Suscribirse a eventos (usa polling para 'simulation-ended') */
    on: function (channel, callback) {
      if (!_listeners[channel]) _listeners[channel] = [];
      _listeners[channel].push(callback);
      _ensurePolling();
    },

    /** Desuscribirse de eventos */
    removeListener: function (channel, callback) {
      if (_listeners[channel]) {
        _listeners[channel] = _listeners[channel].filter(function (cb) {
          return cb !== callback;
        });
      }
      _stopPollingIfEmpty();
    },

    /** Compatibilidad con localStorage usado en el preload original */
    localStorage: {
      getItem: function (key) { return localStorage.getItem(key); },
      setItem: function (key, value) { localStorage.setItem(key, value); },
      removeItem: function (key) { localStorage.removeItem(key); },
    },

    /** No-op en modo web (solo útil en Electron) */
    send: function (channel, args) {},
  };
})();
  `;

  return (
    <Script
      id="electron-api-polyfill"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
