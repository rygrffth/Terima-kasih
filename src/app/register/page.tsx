"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Camera, AlertCircle, CheckCircle2, RefreshCw, UserPlus, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

export default function RegisterFaceRoute() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'manager_mutu' | 'direktur'>('admin');
  const [passcode, setPasscode] = useState('');

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  const [komoditi, setKomoditi] = useState<string>('Elektronik');

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Silakan nyalakan kamera.');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [faceapi, setFaceapi] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!faceapi) {
        setIsModelLoading(true);
        setStatusMessage('Memuat model kecerdasan buatan...');
        try {
          const faceapiModule = await import('@vladmandic/face-api');
          setFaceapi(faceapiModule);
          const MODEL_URL = '/models/';
          await faceapiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          await faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          await faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          setIsModelLoading(false);
          setStatusMessage('Model AI siap.');
        } catch (err: any) {
          console.error('Gagal memuat face-api.js:', err);
          setErrorMessage('Gagal memuat pustaka pengenal wajah: ' + err.message);
          setIsModelLoading(false);
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setIsCameraActive(true);
      setStatusMessage('Kamera aktif. Posisikan wajah Anda di tengah layar.');
    } catch (err: any) {
      console.error('Kamera gagal diakses:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Izin kamera ditolak. Berikan izin kamera di pengaturan browser Anda.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('Kamera tidak ditemukan. Pastikan perangkat memiliki webcam.');
      } else if (err.name === 'NotReadableError') {
        setErrorMessage('Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.');
      } else {
        setErrorMessage('Gagal mengakses kamera: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }
    setIsCameraActive(false);
  };

  const handleRegisterFace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Nama pengguna wajib diisi.');
      return;
    }
    if (!passcode) {
      setErrorMessage('Kode otorisasi pendaftaran wajib diisi.');
      return;
    }

    setIsScanning(true);
    setStatusMessage('Memverifikasi kode otorisasi...');

    try {
      const verifyRes = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, passcode })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.valid) {
        setErrorMessage(`Kode otorisasi pendaftaran untuk peran ${role.toUpperCase()} tidak valid.`);
        setIsScanning(false);
        setStatusMessage('Pendaftaran dibatalkan.');
        return;
      }

      if (!isCameraActive || !videoRef.current || !faceapi) {
        setErrorMessage('Nyalakan kamera terlebih dahulu.');
        setIsScanning(false);
        setStatusMessage('Kamera tidak aktif.');
        return;
      }

      setStatusMessage('Memindai wajah Anda, harap tidak bergerak...');
      setErrorMessage('');

      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

      if (!detection) {
        setErrorMessage('Wajah tidak terdeteksi. Silakan atur posisi/pencahayaan lalu coba lagi.');
        setIsScanning(false);
        setStatusMessage('Wajah tidak terdeteksi.');
        return;
      }

      const descriptorArray = Array.from(detection.descriptor);

      setStatusMessage('Memverifikasi keunikan biometrik wajah...');

      const { data: allUsers, error: fetchErr } = await supabase
        .from('lhu_users')
        .select('username, face_descriptor');

      if (fetchErr) {
        throw new Error('Gagal memeriksa duplikasi wajah: ' + fetchErr.message);
      }

      if (allUsers && allUsers.length > 0) {
        const DUPLICATE_THRESHOLD = 0.40;
        for (const user of allUsers) {
          if (user.face_descriptor && user.face_descriptor.length === 128) {
            const storedDesc = new Float32Array(user.face_descriptor);
            const dist = faceapi.euclideanDistance(detection.descriptor, storedDesc);
            if (dist <= DUPLICATE_THRESHOLD) {
              setErrorMessage(`Wajah ini sudah terdaftar sebagai "${user.username}". Satu wajah tidak dapat didaftarkan dengan nama baru.`);
              setIsScanning(false);
              setStatusMessage('Pendaftaran dibatalkan.');
              return;
            }
          }
        }
      }

      setStatusMessage('Menyimpan data pendaftaran ke database...');

      const dbRole = role;
      const { error: dbErr } = await supabase
        .from('lhu_users')
        .insert([{
          username: username.trim(),
          role: dbRole,
          face_descriptor: descriptorArray,
          komoditi: (role === 'admin') ? komoditi : null,
          departemen: (role === 'manager_mutu') ? 'manager_mutu' : (role === 'direktur') ? 'direktur' : null
        }]);

      if (dbErr) {
        if (dbErr.code === '23505') { // Unique constraint violation
          throw new Error('Nama pengguna sudah terdaftar. Gunakan nama lain.');
        }
        throw dbErr;
      }

      setSuccessMessage(`Akun "${username}" (${role}) berhasil terdaftar dengan data wajah!`);
      setStatusMessage('Pendaftaran sukses.');
      setUsername('');
      setPasscode('');
      stopCamera();
    } catch (err: any) {
      console.error('Pendaftaran gagal:', err);
      setErrorMessage(err.message || 'Gagal mendaftarkan koordinat wajah.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col justify-center items-center p-4 text-theme-text relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-30 flex items-center justify-center p-2.5 rounded-none bg-theme-card border border-theme-border text-theme-text hover:bg-theme-input transition-all active:scale-95 cursor-pointer shadow-xl"
        title={mounted && resolvedTheme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
      >
        {mounted && resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <div className="w-full max-w-4xl bg-theme-card border border-theme-border rounded-3xl p-5 sm:p-8 shadow-2xl relative transition-all">
        <header className="text-center md:text-left flex flex-col items-center md:items-start select-none mb-8 border-b border-theme-border pb-5">
          <img src="/logo2.png" alt="PROLAB Logo" className="h-12 object-contain mb-4 prolab-logo" />
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">
            Registrasi Anggota Baru
          </h2>
          <p className="text-xs text-theme-muted mt-1.5">
            Daftarkan akun dan rekam koordinat biometrik wajah Anda.
          </p>
        </header>

        {errorMessage && (
          <div className="flex items-center gap-2 bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-4 py-3 rounded-xl mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex flex-col gap-2 bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text text-xs px-4 py-4 rounded-xl mb-6">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Registrasi Berhasil!</span>
            </div>
            <p className="text-xs text-status-emerald-text/90">{successMessage}</p>
            <Link href="/login">
              <span className="mt-2 text-xs text-status-orange-text font-bold hover:underline cursor-pointer block transition-colors">
                Pergi ke Halaman Login &rarr;
              </span>
            </Link>
          </div>
        )}

        <form onSubmit={handleRegisterFace} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted">Nama Pengguna (Username)</label>
              <input 
                type="text" 
                className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all placeholder-slate-500" 
                placeholder="Contoh: andi_lab"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isScanning}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted">Peran & Departemen (Role)</label>
              <select
                className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all cursor-pointer"
                value={role === 'supervisor' || role === 'manager_mutu' || role === 'direktur' ? role : `admin_${komoditi}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'supervisor') {
                    setRole('supervisor');
                    setKomoditi('');
                  } else if (val === 'manager_mutu') {
                    setRole('manager_mutu');
                    setKomoditi('');
                  } else if (val === 'direktur') {
                    setRole('direktur');
                    setKomoditi('');
                  } else if (val.startsWith('admin_')) {
                    const k = val.substring(6);
                    setRole('admin');
                    setKomoditi(k);
                  }
                }}
                disabled={isScanning}
              >
                <option value="admin_Elektronik" className="bg-theme-card text-theme-text">Admin Elektronik</option>
                <option value="admin_RF" className="bg-theme-card text-theme-text">Admin RF</option>
                <option value="admin_Besi Baja" className="bg-theme-card text-theme-text">Admin Besi Baja</option>
                <option value="supervisor" className="bg-theme-card text-theme-text">Supervisor</option>
                <option value="manager_mutu" className="bg-theme-card text-theme-text">Manager QHSE</option>
                <option value="direktur" className="bg-theme-card text-theme-text">Direktur</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-theme-muted">Kode Otorisasi Pendaftaran (Passcode)</label>
              <input 
                type="password" 
                className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all placeholder-slate-500" 
                placeholder={`Masukkan kode otorisasi peran ${role.toUpperCase()}`}
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isScanning}
              />
            </div>
          </div>

          <div className="flex flex-col gap-5 bg-theme-input/50 p-4 sm:p-6 border border-theme-border rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-full h-[320px] sm:h-[420px] bg-theme-base rounded-2xl overflow-hidden border border-theme-border flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${isCameraActive ? 'block' : 'hidden'}`}
                />
                {!isCameraActive && (
                  <div className="text-theme-dim flex flex-col items-center gap-2 p-6 text-center">
                    <Camera size={36} className="text-theme-muted" />
                    <span className="text-xs">Kamera dinonaktifkan</span>
                  </div>
                )}

                {isCameraActive && isScanning && (
                  <div className="absolute inset-0 border-[3px] border-status-orange-border border-dashed rounded-full m-8 animate-spin"></div>
                )}
              </div>

              <span className="text-xs text-status-orange-text/90 font-semibold text-center mt-1">
                Status: {statusMessage}
              </span>

              {!isModelLoading && (
                <div className="flex gap-2 mt-1">
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 bg-status-blue-bg hover:bg-status-blue-bg text-theme-text font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Nyalakan Kamera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="flex items-center gap-1.5 bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-muted font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Matikan Kamera
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-theme-border pt-5 mt-2">
              <Link href="/login">
                <span className="text-xs text-theme-muted hover:text-theme-muted font-semibold cursor-pointer transition-colors">
                  &larr; Kembali ke Login
                </span>
              </Link>

              <button 
                type="submit"
                disabled={isScanning || isModelLoading || !isCameraActive}
                className="flex items-center gap-1.5 bg-status-orange-bg hover:bg-status-orange-bg disabled:opacity-40 disabled:cursor-not-allowed text-theme-text font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(249,115,22,0.25)] cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Merekam...
                  </>
                ) : (
                  <>Rekam Wajah & Daftar</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
