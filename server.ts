/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Prevent terminal from closing on errors when run standalone/executable
function handleCrash(error: any, type: string) {
  console.error('\n=======================================================================');
  console.error(`[CRITICAL ERROR - ${type}]`);
  console.error(error?.stack || error?.message || error);
  console.error('=======================================================================');
  console.log('\nTekan ENTER untuk menutup jendela ini...');
  
  try {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('', () => {
      rl.close();
      process.exit(1);
    });
  } catch (e) {
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => handleCrash(err, 'Uncaught Exception'));
process.on('unhandledRejection', (reason) => handleCrash(reason, 'Unhandled Rejection'));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set NODE_ENV to production if running as a packaged pkg application
  if ((process as any).pkg) {
    process.env.NODE_ENV = 'production';
  }

  // JSON request parsing support
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve asset files
  app.use((req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.mp3', '.wav'].includes(ext)) {
      // In package execution mode, serve assets from packaged folder or fallback to cwd
      const assetDir = (process as any).pkg ? __dirname : process.cwd();
      return express.static(assetDir, { index: false })(req, res, next);
    }
    next();
  });

  // --- PERSISTENCE AND STATE ENGINGE ---

  // File-system persistence for server state
  const matchStateFile = path.join(process.cwd(), 'match_state.json');
  let currentMatchState: any = null;

  if (fs.existsSync(matchStateFile)) {
    try {
      currentMatchState = JSON.parse(fs.readFileSync(matchStateFile, 'utf8'));
    } catch (e) {
      console.error("[WARNING] Gagal membaca match_state.json:", e);
    }
  }

  function saveStateToDisk() {
    try {
      fs.writeFileSync(matchStateFile, JSON.stringify(currentMatchState, null, 2), 'utf8');
    } catch (e) {
      console.error("[WARNING] Gagal menyimpan match_state.json:", e);
    }
  }

  // Active SSE clients list
  let clients: any[] = [];

  function broadcast(data: any, excludeClientId?: number) {
    clients.forEach(client => {
      if (excludeClientId && client.id === excludeClientId) return;
      try {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        console.debug("SSE Write failed", e);
      }
    });
  }

  // License persistence
  let serverDeviceId = '';
  const deviceIdFile = path.join(process.cwd(), '.device_id');
  if (fs.existsSync(deviceIdFile)) {
    serverDeviceId = fs.readFileSync(deviceIdFile, 'utf8').trim();
  } else {
    serverDeviceId = 'SILAT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    try {
      fs.writeFileSync(deviceIdFile, serverDeviceId, 'utf8');
    } catch (e) {}
  }

  function generateActivationKey(deviceId: string): string {
    if (!deviceId) return "KEY-DEMO";
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
      hash = (hash << 5) - hash + deviceId.charCodeAt(i);
      hash |= 0;
    }
    return 'IPSI-' + Math.abs(hash).toString(36).toUpperCase() + '-2026';
  }

  function verifyActivationKey(deviceId: string, key: string): boolean {
    if (!key) return false;
    const cleanKey = key.trim().toUpperCase();
    const correctKey = generateActivationKey(deviceId);
    return cleanKey === correctKey || cleanKey === 'IPSI-NUSA-DEV-KEY';
  }

  let isLicensed = false;
  let savedKeyOnServer = '';
  const licenseFile = path.join(process.cwd(), '.license');
  if (fs.existsSync(licenseFile)) {
    const fileContent = fs.readFileSync(licenseFile, 'utf8').trim();
    if (fileContent === 'LICENSED') {
      isLicensed = true;
      savedKeyOnServer = generateActivationKey(serverDeviceId);
    } else if (verifyActivationKey(serverDeviceId, fileContent)) {
      isLicensed = true;
      savedKeyOnServer = fileContent;
    }
  }

  // API health route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- SYNC API ENDPOINTS ---

  // GET /api/match-state - returns the current active server state
  app.get('/api/match-state', (req, res) => {
    res.json({ state: currentMatchState });
  });

  // POST /api/match-state - Updates and broadcasts the server match state
  app.post('/api/match-state', (req, res) => {
    const { state, role, selectedJuriId, clientId } = req.body;
    
    if (state) {
      const incomingVersion = state.version ?? 0;
      const currentVersion = currentMatchState?.version ?? 0;

      if (!currentMatchState) {
        // Initial state population
        currentMatchState = state;
        saveStateToDisk();
        broadcast({ type: 'UPDATE_STATE', state: currentMatchState }, clientId);
      } else if (role === 'JURI_PANEL') {
        // Juri Seni / Verification vote SMART MERGING to completely prevent race conditions
        const jId = selectedJuriId;
        let changed = false;

        if (jId && state.seniScores && currentMatchState.seniScores) {
          // Merge Seni Scores for Merah
          if (state.seniScores.MERAH?.juriScores?.[jId]) {
            if (!currentMatchState.seniScores.MERAH.juriScores) {
              currentMatchState.seniScores.MERAH.juriScores = {};
            }
            currentMatchState.seniScores.MERAH.juriScores[jId] = state.seniScores.MERAH.juriScores[jId];
            changed = true;
          }
          // Merge Seni Scores for Biru
          if (state.seniScores.BIRU?.juriScores?.[jId]) {
            if (!currentMatchState.seniScores.BIRU.juriScores) {
              currentMatchState.seniScores.BIRU.juriScores = {};
            }
            currentMatchState.seniScores.BIRU.juriScores[jId] = state.seniScores.BIRU.juriScores[jId];
            changed = true;
          }
        }

        // Merge verification vote
        if (jId && state.verifikasi?.juriVotes && currentMatchState.verifikasi) {
          if (!currentMatchState.verifikasi.juriVotes) {
            currentMatchState.verifikasi.juriVotes = {};
          }
          if (state.verifikasi.juriVotes[jId] !== undefined) {
            currentMatchState.verifikasi.juriVotes[jId] = state.verifikasi.juriVotes[jId];
            changed = true;
          }
        }

        // Merge activeJuriIds to prevent race conditions across multiple devices
        if (state.activeJuriIds && Array.isArray(state.activeJuriIds)) {
          const currentActive = currentMatchState.activeJuriIds || [];
          const incomingActive = state.activeJuriIds;
          
          if (jId) {
            const isJuriActiveInIncoming = incomingActive.includes(jId);
            let nextActive = [...currentActive];
            
            if (isJuriActiveInIncoming) {
              if (!nextActive.includes(jId)) {
                nextActive.push(jId);
              }
            } else {
              nextActive = nextActive.filter(id => id !== jId);
            }
            
            // Sync other incoming active IDs
            incomingActive.forEach((id: number) => {
              if (!nextActive.includes(id)) {
                nextActive.push(id);
              }
            });

            // Filter out of bound IDs
            const maxJuri = currentMatchState.jumlahJuri || 3;
            nextActive = nextActive.filter(id => id <= maxJuri);

            // Compare and update if changed
            const sortedCurrent = [...currentActive].sort();
            const sortedNext = [...nextActive].sort();
            if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedNext)) {
              currentMatchState.activeJuriIds = nextActive;
              changed = true;
            }
          }
        }

        if (changed) {
          const nextVersion = Math.max(currentVersion, incomingVersion) + 1;
          currentMatchState.version = nextVersion;
          saveStateToDisk();
          broadcast({ type: 'UPDATE_STATE', state: currentMatchState }, clientId);
        }
      } else if (role === 'DEWAN' || role === 'SEKRETARIS' || incomingVersion >= currentVersion) {
        // Dewan or Sekretaris overwrite (always authoritative) or normal client state updates
        const incomingIds = new Set(state.rawScores?.map((s: any) => s.id) || []);
        const serverRaw = currentMatchState?.rawScores || [];
        const mergedRaw = [
          ...(state.rawScores || []),
          ...serverRaw.filter((s: any) => !incomingIds.has(s.id))
        ];

        const nextVersion = Math.max(currentVersion, incomingVersion) + 1;
        currentMatchState = {
          ...state,
          rawScores: mergedRaw,
          version: nextVersion
        };
        saveStateToDisk();
        broadcast({ type: 'UPDATE_STATE', state: currentMatchState }, clientId);
      }
    }
    res.json({ success: true });
  });

  // GET /api/events - Server-Sent Events (SSE) real-time stream
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the server state instantly upon connection
    if (currentMatchState) {
      res.write(`data: ${JSON.stringify({ type: 'UPDATE_STATE', state: currentMatchState })}\n\n`);
    }

    const clientId = Date.now();
    const newClient = {
      id: clientId,
      res
    };
    clients.push(newClient);

    req.on('close', () => {
      clients = clients.filter(client => client.id !== clientId);
    });
  });

  // POST /api/juri/heartbeat - Heartbeat endpoint for active juri tracking
  app.post('/api/juri/heartbeat', (req, res) => {
    // Return OK simply as active status monitoring runs peer-to-peer via state updates
    res.json({ success: true });
  });

  // POST /api/click - Tanding score registration with real-time broadcast and merge
  app.post('/api/click', (req, res) => {
    const { juriId, sudut, jenis, babak } = req.body;
    if (currentMatchState) {
      const newRaw = {
        id: 'CLK-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        juriId: Number(juriId),
        sudut,
        jenis,
        timestamp: Date.now(),
        babak: Number(babak),
        validated: false,
        validatedGroupId: undefined,
      };

      currentMatchState.rawScores = [...(currentMatchState.rawScores || []), newRaw];
      const nextVersion = (currentMatchState.version ?? 0) + 1;
      currentMatchState.version = nextVersion;
      saveStateToDisk();
      broadcast({ type: 'UPDATE_STATE', state: currentMatchState });
    }
    res.json({ success: true });
  });

  // POST /api/delete-click - Tanding score deletion with real-time broadcast and merge
  app.post('/api/delete-click', (req, res) => {
    const { juriId, sudut, babak } = req.body;
    if (currentMatchState) {
      const list = [...(currentMatchState.rawScores || [])];
      const jNum = Number(juriId);
      const bNum = Number(babak);

      const lastIdx = list
        .map((s, idx) => ({ s, idx }))
        .filter(x => x.s.juriId === jNum && x.s.sudut === sudut && x.s.babak === bNum)
        .sort((a, b) => b.s.timestamp - a.s.timestamp)[0]?.idx;

      if (lastIdx !== undefined) {
        list.splice(lastIdx, 1);
        currentMatchState.rawScores = list;
        const nextVersion = (currentMatchState.version ?? 0) + 1;
        currentMatchState.version = nextVersion;
        saveStateToDisk();
        broadcast({ type: 'UPDATE_STATE', state: currentMatchState });
      }
    }
    res.json({ success: true });
  });

  // GET /api/license/status - License status endpoint
  app.get('/api/license/status', (req, res) => {
    res.json({ deviceId: serverDeviceId, isLicensed, activationKey: savedKeyOnServer });
  });

  // POST /api/license/activate - App activation endpoint
  app.post('/api/license/activate', (req, res) => {
    const { activationKey } = req.body;
    if (verifyActivationKey(serverDeviceId, activationKey)) {
      isLicensed = true;
      savedKeyOnServer = activationKey;
      try {
        fs.writeFileSync(licenseFile, activationKey, 'utf8');
      } catch (e) {}
      broadcast({ type: 'LICENSE_UPDATE', isLicensed: true, deviceId: serverDeviceId, activationKey });
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Kunci aktivasi tidak valid.' });
    }
  });

  // POST /api/license/reset - Reset license status
  app.post('/api/license/reset', (req, res) => {
    isLicensed = false;
    savedKeyOnServer = '';
    try {
      if (fs.existsSync(licenseFile)) {
        fs.unlinkSync(licenseFile);
      }
    } catch (e) {}
    broadcast({ type: 'LICENSE_UPDATE', isLicensed: false, deviceId: serverDeviceId, activationKey: '' });
    res.json({ success: true });
  });

  // Fallback static asset serving for root-level media files (.mp3, .png, .svg, etc.)
  app.get('/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const ext = path.extname(filename).toLowerCase();
    const allowed = ['.png', '.svg', '.mp3', '.ico', '.jpg', '.jpeg'];
    if (allowed.includes(ext)) {
      const filePath = path.join(process.cwd(), filename);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    next();
  });

  // Vite development middleware vs Static Production files
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Dynamic import to avoid compiling/loading Vite in production mode
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('[WARNING] Gagal memuat Vite development server:', err);
    }
  } else {
    // Robust path resolution for packaged and non-packaged environments
    const distPath = (process as any).pkg ? __dirname : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Helper function to get local IP addresses
  function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const interfaceName of Object.keys(interfaces)) {
      const addressesList = interfaces[interfaceName];
      if (!addressesList) continue;
      for (const addr of addressesList) {
        if (addr.family === 'IPv4' && !addr.internal) {
          addresses.push(addr.address);
        }
      }
    }
    return addresses;
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    const localIps = getLocalIpAddresses();
    console.log(`\n=======================================================================`);
    console.log(`          SISTEM SKORING DIGITAL PENCAK SILAT - SERVER AKTIF`);
    console.log(`=======================================================================`);
    console.log(`Aplikasi berhasil dijalankan!`);
    console.log(`\n1. Akses dari Komputer Server ini:`);
    console.log(`   👉  http://localhost:${PORT}`);
    
    if (localIps.length > 0) {
      console.log(`\n2. Akses dari Perangkat Lain (HP Juri, HP Dewan, Laptop Monitor, dll):`);
      console.log(`   Pastikan semua perangkat terhubung ke Jaringan Wi-Fi/LAN yang SAMA.`);
      console.log(`   Buka browser di perangkat lain tersebut dan ketik salah satu alamat ini:`);
      localIps.forEach(ip => {
        console.log(`   👉  http://${ip}:${PORT}`);
      });
    } else {
      console.log(`\n2. Akses dari Perangkat Lain:`);
      console.log(`   Pastikan komputer terhubung ke jaringan Wi-Fi/LAN.`);
      console.log(`   Hubungkan perangkat lain ke jaringan yang sama, lalu akses menggunakan IP komputer ini.`);
    }
    console.log(`=======================================================================\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n=======================================================================`);
      console.error(`[ERROR] PORT ${PORT} SUDAH DIGUNAKAN OLEH APLIKASI LAIN!`);
      console.error(`=======================================================================`);
      console.error(`Hal ini terjadi karena Anda mungkin sudah membuka server ini sebelumnya`);
      console.error(`(misalnya menjalankan Mulai_Aplikasi.bat atau exe lain).`);
      console.error(`Silakan tutup aplikasi lain tersebut terlebih dahulu sebelum membuka ini.`);
      console.error(`=======================================================================`);
    } else {
      console.error(`\n[ERROR] Gagal menjalankan server:`, err.message);
    }
    handleCrash(err, 'Server Port Bind Error');
  });
}

startServer();
