"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase, encodeToken } from '../../../lib/supabase';
import { LhuUser } from '../../../types';
import UsersTab from '../components/UsersTab';

export default function UsersPage() {
  const [userName, setUserName] = useState('Manager QHSE PROLAB');
  const [userRole, setUserRole] = useState('');
  const [userDept, setUserDept] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [showRegModal, setShowRegModal] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<string>('admin');
  const [regKomoditi, setRegKomoditi] = useState<string>('Elektronik');
  const [regDepartemen, setRegDepartemen] = useState<string>('Safety');
  const [regLoginToken, setRegLoginToken] = useState<string>('');
  const [regMethod, setRegMethod] = useState<'face_token' | 'token_only'>('face_token');
  const [regCameraActive, setRegCameraActive] = useState(false);
  const [regScanning, setRegScanning] = useState(false);
  const [regStatus, setRegStatus] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);

  const [faceapi, setFaceapi] = useState<any>(null);
  const regVideoRef = useRef<HTMLVideoElement>(null);
  const regStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('realtime-lhu-users-manager')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lhu_users'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    const loadUserName = () => {
      setUserName(localStorage.getItem('lhu_user_name') || 'Manager QHSE PROLAB');
      const stored = localStorage.getItem('lhu_logged_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUserRole(u.role || '');
          setUserDept(u.departemen || '');
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadUserName();
    window.addEventListener('userNameChanged', loadUserName);

    return () => {
      window.removeEventListener('userNameChanged', loadUserName);
      supabase.removeChannel(channel);
      if (regStreamRef.current) {
        regStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('lhu_users')
        .select('*')
        .order('username', { ascending: true });

      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar pengguna:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === userName) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun "${username}"? Semua riwayat sesi pengguna ini juga akan dibersihkan.`)) {
      return;
    }

    try {
      const { error: sessErr } = await supabase
        .from('lhu_sessions')
        .delete()
        .eq('username', username);

      if (sessErr) throw sessErr;

      const { error } = await supabase
        .from('lhu_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      alert(`Pengguna "${username}" berhasil dihapus.`);
      fetchUsers();
    } catch (err: any) {
      alert('Gagal menghapus pengguna: ' + err.message);
    }
  };

  const initFaceApi = async () => {
    try {
      const faceapiModule = await import('@vladmandic/face-api');
      setFaceapi(faceapiModule);
      const MODEL_URL = '/models/';
      setRegStatus('Memuat model deteksi wajah lokal...');
      await faceapiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setIsModelLoading(false);
      setRegStatus('Model AI siap.');
    } catch (err: any) {
      setRegError('Gagal memuat model pengenalan wajah: ' + err.message);
    }
  };

  const startRegCamera = async () => {
    setRegError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      regStreamRef.current = stream;
      if (regVideoRef.current) {
        regVideoRef.current.srcObject = stream;
        regVideoRef.current.onloadedmetadata = () => {
          regVideoRef.current?.play().catch(() => {});
        };
      }
      setRegCameraActive(true);
      setRegStatus('Kamera aktif. Posisikan wajah anggota baru di tengah layar.');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setRegError('Izin kamera ditolak.');
      } else if (err.name === 'NotFoundError') {
        setRegError('Kamera tidak ditemukan.');
      } else {
        setRegError('Gagal mengakses kamera: ' + err.message);
      }
    }
  };

  const stopRegCamera = () => {
    if (regStreamRef.current) {
      regStreamRef.current.getTracks().forEach(track => track.stop());
      regStreamRef.current = null;
    }
    if (regVideoRef.current) {
      regVideoRef.current.srcObject = null;
      regVideoRef.current.onloadedmetadata = null;
    }
    setRegCameraActive(false);
  };

  const openRegModal = () => {
    setShowRegModal(true);
    setRegUsername('');
    setRegRole('admin');
    setRegKomoditi('Elektronik');
    setRegDepartemen('Safety');
    setRegLoginToken('');
    setRegMethod('face_token');
    setRegError('');
    setRegSuccess('');
    setRegStatus('');
    if (!faceapi) initFaceApi();
  };

  const closeRegModal = () => {
    stopRegCamera();
    setShowRegModal(false);
    setRegScanning(false);
  };

  const handleSpvRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regUsername.trim()) { setRegError('Nama pengguna wajib diisi.'); return; }

    setRegScanning(true);
    setRegStatus('Memproses pendaftaran...');
    setRegError('');
    setRegSuccess('');

    try {
      let descriptorArray: number[] = [];

      if (regMethod === 'face_token') {
        if (!regCameraActive || !regVideoRef.current || !faceapi) { 
          throw new Error('Nyalakan kamera terlebih dahulu untuk memindai wajah.'); 
        }

        setRegStatus('Memindai wajah anggota baru...');
        const detection = await faceapi.detectSingleFace(
          regVideoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
          throw new Error('Wajah tidak terdeteksi. Atur posisi/pencahayaan.');
        }

        descriptorArray = Array.from(detection.descriptor) as number[];

        setRegStatus('Memeriksa duplikasi wajah...');

        const { data: allUsers, error: fetchErr } = await supabase
          .from('lhu_users').select('username, face_descriptor');

        if (fetchErr) throw new Error('Gagal memeriksa duplikasi wajah: ' + fetchErr.message);

        if (allUsers && allUsers.length > 0) {
          for (const user of allUsers) {
            if (user.face_descriptor && user.face_descriptor.length === 128) {
              const storedDesc = new Float32Array(user.face_descriptor);
              const dist = faceapi.euclideanDistance(detection.descriptor, storedDesc);
              if (dist <= 0.40) {
                throw new Error(`Wajah ini sudah terdaftar sebagai "${user.username}".`);
              }
            }
          }
        }
      } else {
        if (!regLoginToken.trim()) {
          throw new Error('Token login wajib diisi jika mendaftar tanpa biometrik wajah.');
        }
      }

      setRegStatus('Menyimpan data pendaftaran...');

      const dbRole = regRole;
      const payload: any = {
        username: regUsername.trim(),
        role: dbRole,
        face_descriptor: descriptorArray,
        login_token: encodeToken(regLoginToken.trim()) || null,
        komoditi: (regRole === 'admin' || regRole === 'supervisor') ? (regKomoditi ? regKomoditi.trim() : null) : null,
        departemen: regRole === 'manager_mutu' ? 'manager_mutu' : regRole === 'direktur' ? 'direktur' : null
      };

      const { error: dbErr } = await supabase.from('lhu_users').insert([payload]);

      if (dbErr) {
        if (dbErr.code === '23505') throw new Error('Nama pengguna sudah terdaftar.');
        throw dbErr;
      }

      setRegSuccess(`Anggota "${regUsername}" (${regRole}) berhasil didaftarkan!`);
      setRegStatus('Pendaftaran sukses.');
      setRegUsername('');
      stopRegCamera();
      fetchUsers();
    } catch (err: any) {
      setRegError(err.message || 'Gagal mendaftarkan anggota.');
    } finally {
      setRegScanning(false);
    }
  };

  const isDirektur = userRole === 'direktur' || userDept?.toLowerCase() === 'direktur';

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text flex items-center gap-2">
            👥 Manajemen Pengguna
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${
              isDirektur 
                ? 'bg-status-purple-bg text-status-purple-text border-status-purple-border' 
                : 'bg-status-rose-bg text-status-rose-text border-status-rose-border'
            }`}>
              {isDirektur ? 'DIREKTUR ACCESS' : 'MANAGER QHSE ACCESS'}
            </span>
          </h2>
          <p className="text-sm text-theme-muted mt-1">
            {isDirektur ? 'Direktur aktif:' : 'Manager aktif:'} <span className={isDirektur ? 'text-status-purple-text font-semibold' : 'text-status-rose-text font-semibold'}>{userName}</span>
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <div className={`bg-theme-card border-t-2 ${isDirektur ? 'border-t-purple-500' : 'border-t-rose-500'} border-x border-b border-theme-border rounded-2xl p-6 shadow-xl relative`}>
        <UsersTab 
          usersList={usersList}
          loadingUsers={loadingUsers}
          handleDeleteUser={handleDeleteUser}
          openRegModal={openRegModal}
          showRegModal={showRegModal}
          closeRegModal={closeRegModal}
          regUsername={regUsername}
          setRegUsername={setRegUsername}
          regRole={regRole}
          setRegRole={setRegRole}
          regKomoditi={regKomoditi}
          setRegKomoditi={setRegKomoditi}
          regDepartemen={regDepartemen}
          setRegDepartemen={setRegDepartemen}
          regLoginToken={regLoginToken}
          setRegLoginToken={setRegLoginToken}
          regMethod={regMethod}
          setRegMethod={setRegMethod}
          regCameraActive={regCameraActive}
          startRegCamera={startRegCamera}
          stopRegCamera={stopRegCamera}
          regScanning={regScanning}
          regStatus={regStatus}
          regError={regError}
          regSuccess={regSuccess}
          isModelLoading={isModelLoading}
          handleSpvRegister={handleSpvRegister}
          regVideoRef={regVideoRef}
          onRefreshUsers={fetchUsers}
        />
      </div>
    </div>
  );
}
