import React, { useState, useRef } from 'react';
import { Users, UserPlus, Camera } from 'lucide-react';
import { supabase, encodeToken, decodeToken } from '../../../lib/supabase';
import { Button } from 'antd';

interface UserItem {
  id: string;
  username: string;
  role: string;
  komoditi?: string | null;
  departemen?: string | null;
  login_token?: string | null;
  created_at: string;
  allowed_komoditi?: string[] | null;
  allowed_departemen?: string[] | null;
}

interface UsersTabProps {
  usersList: UserItem[];
  loadingUsers: boolean;
  handleDeleteUser: (userId: string, username: string) => void;
  openRegModal: () => void;
  showRegModal: boolean;
  closeRegModal: () => void;
  regUsername: string;
  setRegUsername: (val: string) => void;
  regRole: string;
  setRegRole: (val: string) => void;
  regKomoditi: string;
  setRegKomoditi: (val: string) => void;
  regDepartemen: string;
  setRegDepartemen: (val: string) => void;
  regLoginToken: string;
  setRegLoginToken: (val: string) => void;
  regMethod: 'face_token' | 'token_only';
  setRegMethod: (val: 'face_token' | 'token_only') => void;
  regCameraActive: boolean;
  startRegCamera: () => void;
  stopRegCamera: () => void;
  regScanning: boolean;
  regStatus: string;
  regError: string;
  regSuccess: string;
  isModelLoading: boolean;
  handleSpvRegister: () => void;
  regVideoRef: React.RefObject<HTMLVideoElement | null>;
  onRefreshUsers: () => void;
}

export default function UsersTab({
  usersList,
  loadingUsers,
  handleDeleteUser,
  openRegModal,
  showRegModal,
  closeRegModal,
  regUsername,
  setRegUsername,
  regRole,
  setRegRole,
  regKomoditi,
  setRegKomoditi,
  regDepartemen,
  setRegDepartemen,
  regLoginToken,
  setRegLoginToken,
  regMethod,
  setRegMethod,
  regCameraActive,
  startRegCamera,
  stopRegCamera,
  regScanning,
  regStatus,
  regError,
  regSuccess,
  isModelLoading,
  handleSpvRegister,
  regVideoRef,
  onRefreshUsers
}: UsersTabProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserItem | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<string>('admin');
  const [editKomoditi, setEditKomoditi] = useState('Elektronik');
  const [editDepartemen, setEditDepartemen] = useState('Safety');
  const [editLoginToken, setEditLoginToken] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [isEditCustomRole, setIsEditCustomRole] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editAllowedKomoditi, setEditAllowedKomoditi] = useState<string[]>([]);
  const [editAllowedDepartemen, setEditAllowedDepartemen] = useState<string[]>([]);
  const [dbDivisions, setDbDivisions] = useState<string[]>([]);
  
  // Division master states
  const [divisionsList, setDivisionsList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [newDivName, setNewDivName] = useState('');
  const [newDivCode, setNewDivCode] = useState('');
  const [editingDiv, setEditingDiv] = useState<{ id: string; name: string; code: string } | null>(null);
  const [editDivName, setEditDivName] = useState('');
  const [editDivCode, setEditDivCode] = useState('');
  const [isProcessingDiv, setIsProcessingDiv] = useState(false);
  const [divError, setDivError] = useState('');
  const [divSuccess, setDivSuccess] = useState('');

  const fetchDivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('lhu_divisions')
        .select('id, name, code')
        .order('name', { ascending: true });
      if (error) throw error;
      if (data) {
        setDivisionsList(data);
        setDbDivisions(data.map(d => d.name));
      }
    } catch (err) {
      console.error('Failed to load divisions:', err);
    }
  };

  React.useEffect(() => {
    fetchDivisions();
  }, []);

  const handleAddDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim() || !newDivCode.trim()) {
      setDivError('Nama dan Kode divisi wajib diisi.');
      return;
    }
    setIsProcessingDiv(true);
    setDivError('');
    setDivSuccess('');
    try {
      const { error } = await supabase
        .from('lhu_divisions')
        .insert([{ 
          name: newDivName.trim(), 
          code: newDivCode.trim().toUpperCase() 
        }]);

      if (error) {
        if (error.code === '23505') throw new Error('Nama atau Kode divisi sudah digunakan.');
        throw error;
      }

      setDivSuccess('Divisi baru berhasil ditambahkan!');
      setNewDivName('');
      setNewDivCode('');
      await fetchDivisions();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      setDivError(err.message || 'Gagal menambahkan divisi.');
    } finally {
      setIsProcessingDiv(false);
    }
  };

  const handleStartEditDiv = (div: { id: string; name: string; code: string }) => {
    setEditingDiv(div);
    setEditDivName(div.name);
    setEditDivCode(div.code);
    setDivError('');
    setDivSuccess('');
  };

  const handleSaveEditDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiv) return;
    if (!editDivName.trim() || !editDivCode.trim()) {
      setDivError('Nama dan Kode divisi wajib diisi.');
      return;
    }
    setIsProcessingDiv(true);
    setDivError('');
    setDivSuccess('');
    try {
      const oldName = editingDiv.name;
      const newName = editDivName.trim();
      const newCode = editDivCode.trim().toUpperCase();

      const { error } = await supabase
        .from('lhu_divisions')
        .update({ name: newName, code: newCode })
        .eq('id', editingDiv.id);

      if (error) {
        if (error.code === '23505') throw new Error('Nama atau Kode divisi sudah digunakan.');
        throw error;
      }

      if (oldName !== newName) {
        const { data: usersToUpdate, error: fetchUsersErr } = await supabase
          .from('lhu_users')
          .select('id, allowed_komoditi')
          .contains('allowed_komoditi', [oldName]);

        if (!fetchUsersErr && usersToUpdate) {
          for (const user of usersToUpdate) {
            const updatedKomoditi = user.allowed_komoditi?.map((k: string) => k === oldName ? newName : k) || [];
            await supabase
              .from('lhu_users')
              .update({ allowed_komoditi: updatedKomoditi })
              .eq('id', user.id);
          }
        }
      }

      setDivSuccess('Divisi berhasil diperbarui!');
      setEditingDiv(null);
      setEditDivName('');
      setEditDivCode('');
      await fetchDivisions();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      setDivError(err.message || 'Gagal memperbarui divisi.');
    } finally {
      setIsProcessingDiv(false);
    }
  };

  const handleDeleteDivision = async (divId: string, divName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus divisi "${divName}"? Menghapus divisi ini akan mencabut akses departemen ini dari semua anggota.`)) {
      return;
    }
    setIsProcessingDiv(true);
    setDivError('');
    setDivSuccess('');
    try {
      const { error } = await supabase
        .from('lhu_divisions')
        .delete()
        .eq('id', divId);

      if (error) throw error;

      const { data: usersToUpdate, error: fetchUsersErr } = await supabase
        .from('lhu_users')
        .select('id, allowed_komoditi')
        .contains('allowed_komoditi', [divName]);

      if (!fetchUsersErr && usersToUpdate) {
        for (const user of usersToUpdate) {
          const updatedKomoditi = user.allowed_komoditi?.filter((k: string) => k !== divName) || [];
          await supabase
            .from('lhu_users')
            .update({ allowed_komoditi: updatedKomoditi })
            .eq('id', user.id);
        }
      }

      setDivSuccess(`Divisi "${divName}" berhasil dihapus.`);
      await fetchDivisions();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      setDivError('Gagal menghapus divisi: ' + err.message);
    } finally {
      setIsProcessingDiv(false);
    }
  };

  const [faceapi, setFaceapi] = useState<any>(null);
  const [editCameraActive, setEditCameraActive] = useState(false);
  const [editScanning, setEditScanning] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  const editVideoRef = useRef<HTMLVideoElement>(null);
  const editStreamRef = useRef<MediaStream | null>(null);

  const initEditFaceApi = async () => {
    if (faceapi) return faceapi;
    try {
      setEditStatus('Memuat model deteksi wajah...');
      const faceapiModule = await import('@vladmandic/face-api');
      setFaceapi(faceapiModule);
      const MODEL_URL = '/models/';
      await faceapiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setEditStatus('Model AI siap.');
      return faceapiModule;
    } catch (err: any) {
      setEditError('Gagal memuat model pengenal wajah: ' + err.message);
      return null;
    }
  };

  const startEditCamera = async () => {
    setEditError('');
    setEditSuccess('');
    try {
      const api = await initEditFaceApi();
      if (!api) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      editStreamRef.current = stream;
      if (editVideoRef.current) {
        editVideoRef.current.srcObject = stream;
        editVideoRef.current.onloadedmetadata = () => {
          editVideoRef.current?.play().catch(() => {});
        };
      }
      setEditCameraActive(true);
      setEditStatus('Kamera aktif. Posisikan wajah di tengah layar.');
    } catch (err: any) {
      setEditError('Gagal mengakses kamera: ' + err.message);
    }
  };

  const stopEditCamera = () => {
    if (editStreamRef.current) {
      editStreamRef.current.getTracks().forEach(track => track.stop());
      editStreamRef.current = null;
    }
    if (editVideoRef.current) {
      editVideoRef.current.srcObject = null;
      editVideoRef.current.onloadedmetadata = null;
    }
    setEditCameraActive(false);
  };

  const handleFaceUpdate = async () => {
    if (!selectedUserForEdit) return;
    if (!editCameraActive || !editVideoRef.current || !faceapi) {
      setEditError('Kamera belum aktif.');
      return;
    }

    setEditScanning(true);
    setEditStatus('Memindai wajah baru...');
    setEditError('');
    setEditSuccess('');

    try {
      const detection = await faceapi.detectSingleFace(
        editVideoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        throw new Error('Wajah tidak terdeteksi. Silakan atur posisi dan cahaya.');
      }

      const descriptorArray = Array.from(detection.descriptor);

      setEditStatus('Memeriksa keunikan biometrik...');

      // Check if duplicate of another user (excluding current user)
      const { data: allUsers, error: fetchErr } = await supabase
        .from('lhu_users')
        .select('id, username, face_descriptor');

      if (fetchErr) throw fetchErr;

      if (allUsers && allUsers.length > 0) {
        for (const user of allUsers) {
          if (user.id !== selectedUserForEdit.id && user.face_descriptor && user.face_descriptor.length === 128) {
            const storedDesc = new Float32Array(user.face_descriptor);
            const dist = faceapi.euclideanDistance(detection.descriptor, storedDesc);
            if (dist <= 0.40) {
              throw new Error(`Wajah ini terdeteksi mirip dengan "${user.username}" (sudah terdaftar).`);
            }
          }
        }
      }

      setEditStatus('Menyimpan data wajah baru...');

      const { error: updateErr } = await supabase
        .from('lhu_users')
        .update({ face_descriptor: descriptorArray })
        .eq('id', selectedUserForEdit.id);

      if (updateErr) throw updateErr;

      setEditSuccess('Biometrik wajah berhasil diperbarui!');
      setEditStatus('Pembaruan biometrik selesai.');
      stopEditCamera();
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui wajah.');
      setEditStatus('Gagal memperbarui.');
    } finally {
      setEditScanning(false);
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUserForEdit(user);
    setEditUsername(user.username);
    if (user.role === 'manager_lab') {
      setEditRole(user.departemen === 'direktur' ? 'direktur' : 'manager_mutu');
    } else {
      setEditRole(user.role);
    }
    setEditKomoditi(user.komoditi || 'Elektronik');
    setEditDepartemen(user.departemen || 'Safety');
    setEditLoginToken(decodeToken(user.login_token) || '');
    setEditAllowedKomoditi(user.allowed_komoditi || []);
    setEditAllowedDepartemen(user.allowed_departemen || []);
    setEditError('');
    setEditSuccess('');

    // Auto-detect custom commodities
    const defaultKomoditis = ['Elektronik', 'RF', 'Besi Baja'];
    const isCustom = user.komoditi && !defaultKomoditis.includes(user.komoditi);
    setIsEditCustomRole(!!isCustom);

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    stopEditCamera();
    setShowEditModal(false);
    setSelectedUserForEdit(null);
    setIsEditCustomRole(false);
    setEditLoginToken('');
    setEditStatus('');
  };

  const saveUpdatedUser = async () => {
    if (!selectedUserForEdit) return;
    setIsUpdating(true);
    setEditError('');
    setEditSuccess('');

    try {
      const dbRole = editRole;
      const payload: any = {
        username: editUsername.trim(),
        role: dbRole,
        komoditi: (editRole === 'admin' || editRole === 'supervisor') ? editKomoditi.trim() : null,
        departemen: editRole === 'manager_mutu' ? 'manager_mutu' : editRole === 'direktur' ? 'direktur' : null,
        login_token: encodeToken(editLoginToken.trim()) || null,
        allowed_komoditi: (editRole === 'admin' || editRole === 'supervisor') ? editAllowedKomoditi : null,
        allowed_departemen: (editRole === 'admin' || editRole === 'supervisor') ? editAllowedDepartemen : null
      };

      const { error } = await supabase
        .from('lhu_users')
        .update(payload)
        .eq('id', selectedUserForEdit.id);

      if (error) throw error;
      
      setEditSuccess('Data anggota berhasil diperbarui!');
      setTimeout(() => {
        closeEditModal();
        onRefreshUsers();
      }, 1000);
    } catch (err: any) {
      setEditError('Gagal memperbarui data: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const defaultKomoditis = ['Elektronik', 'RF', 'Besi Baja'];
  
  // Extract any custom commodities already existing in the database users list
  const uniqueDbKomoditis = Array.from(new Set(usersList.map(u => u.komoditi).filter(Boolean))) as string[];
  
  // Combine them, keeping Elektronik, RF, Besi Baja at the top
  const allKomoditis = Array.from(new Set([
    ...defaultKomoditis,
    ...dbDivisions,
    ...uniqueDbKomoditis,
    ...(editKomoditi ? [editKomoditi] : []),
    ...(regKomoditi ? [regKomoditi] : [])
  ]));

  const defaultDepartemens = ['Safety', 'SKEM'];
  
  // Extract any custom departments already existing in the database users list
  const uniqueDbDepartemens = Array.from(new Set(usersList.map(u => u.departemen).filter(Boolean))) as string[];
  
  // Combine them, keeping Safety, SKEM at the top (excluding internal roles)
  const allDepartemens = Array.from(new Set([
    ...defaultDepartemens,
    ...uniqueDbDepartemens.filter(d => d !== 'direktur' && d !== 'manager_mutu' && d !== 'Direktur' && d !== 'Manager Mutu' && d !== 'Manager QHSE' && d !== 'manager_qhse'),
    ...(editDepartemen ? [editDepartemen] : []),
    ...(regDepartemen ? [regDepartemen] : [])
  ]));

  return (
    <>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text">
            <Users size={18} className="text-status-orange-text" /> Manajemen Pengguna & Biometrik Wajah
          </h3>
          <p className="text-xs text-theme-muted mt-1">
            Daftarkan atau hapus hak akses biometrik wajah staf (Admin, Supervisor, Manager QHSE, Direktur) beserta departemennya.
          </p>
        </div>
        <Button
          type="primary"
          onClick={openRegModal}
          icon={<UserPlus size={16} />}
          className="h-10 text-xs font-bold"
        >
          Daftar Anggota Baru
        </Button>
      </div>

      {loadingUsers ? (
        <div className="text-center py-8 text-xs text-theme-dim font-semibold animate-pulse">
          Memuat daftar pengguna...
        </div>
      ) : usersList.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-theme-border rounded-xl text-xs text-theme-dim bg-theme-input">
          Belum ada pengguna terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usersList.map(user => (
            <div key={user.id} className="bg-theme-input border border-theme-border rounded-2xl p-4 flex justify-between items-start hover:border-theme-border transition-all">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-theme-text">{user.username}</span>
                <div className="flex flex-wrap gap-1 items-center">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    user.role === 'manager_mutu' || user.role === 'direktur' || user.role === 'manager_lab' ? 'bg-status-purple-bg text-status-purple-text border border-status-purple-border' :
                    user.role === 'supervisor' ? 'bg-status-amber-bg text-status-amber-text border border-status-amber-border' :
                    user.role === 'admin' ? 'bg-status-blue-bg text-status-blue-text border border-status-blue-border' :
                    'bg-status-indigo-bg text-status-indigo-text border border-status-indigo-border'
                  }`}>
                    {user.role === 'manager_mutu' ? 'Manager QHSE' :
                     user.role === 'direktur' ? 'Direktur' :
                     user.role === 'manager_lab' ? (user.departemen === 'direktur' ? 'Direktur' : 'Manager QHSE') : 
                     user.role === 'supervisor' ? `Supervisor ${user.komoditi || ''}`.trim() : 
                     user.role === 'admin' ? `Admin ${user.komoditi || ''}`.trim() : 
                     user.role}
                  </span>
                  {user.departemen && user.departemen !== 'manager_mutu' && user.departemen !== 'direktur' && user.departemen !== 'Manager Mutu' && user.departemen !== 'Manager QHSE' && user.departemen !== 'Direktur' && (
                    <span className="text-[9px] font-semibold bg-status-orange-bg border border-status-orange-border text-status-orange-text px-1.5 py-0.5 rounded">
                      {user.departemen}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-theme-dim mt-1">
                  Terdaftar: {new Date(user.created_at).toLocaleDateString('id-ID')}
                </span>
                {user.login_token && (
                  <div className="flex items-center gap-1 text-[9px] text-status-emerald-text font-mono mt-1">
                    <span>🔑 Token:</span>
                    <span className="bg-theme-input border border-theme-border px-1.5 py-0.5 rounded font-bold text-status-emerald-text">{decodeToken(user.login_token)}</span>
                  </div>
                )}
                {((user.role === 'admin' || user.role === 'supervisor') && 
                  ((user.allowed_komoditi && user.allowed_komoditi.length > 0) || 
                   (user.allowed_departemen && user.allowed_departemen.length > 0))) && (
                  <div className="flex flex-col gap-1 mt-1.5 pt-1.5 border-t border-theme-border">
                    {user.allowed_komoditi && user.allowed_komoditi.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[8px] text-theme-dim font-bold uppercase">Departemen:</span>
                        {user.allowed_komoditi.map(c => (
                          <span key={c} className="text-[8px] font-semibold bg-status-blue-bg text-status-blue-text border border-status-blue-border px-1 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {user.allowed_departemen && user.allowed_departemen.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[8px] text-theme-dim font-bold uppercase">Jenis:</span>
                        {user.allowed_departemen.map(d => (
                          <span key={d} className="text-[8px] font-semibold bg-teal-950/20 text-teal-400 border border-teal-900/30 px-1 rounded">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="small"
                  onClick={() => openEditModal(user)}
                  title="Ubah Profil Pengguna"
                  className="text-[10px] font-bold"
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => handleDeleteUser(user.id, user.username)}
                  title="Hapus Pengguna"
                  className="text-[10px] font-bold"
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION MASTER DEPARTEMEN / DIVISI */}
      <div className="mt-8 border-t border-theme-border pt-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text">
            🏢 Kelola Master Departemen / Divisi
          </h3>
          <p className="text-xs text-theme-muted mt-1">
            Kelola daftar divisi/departemen resmi yang akan digunakan untuk pengelompokan LHU/Sertifikat dan hak akses staf.
          </p>
        </div>

        {divError && (
          <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-3.5 py-2.5 rounded-xl mb-4 animate-fade-in">
            ⚠️ {divError}
          </div>
        )}

        {divSuccess && (
          <div className="bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text text-xs px-3.5 py-2.5 rounded-xl mb-4 animate-fade-in">
            🎉 {divSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <div className="lg:col-span-4 bg-theme-input border border-theme-border rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="text-sm font-bold text-theme-text flex items-center gap-1.5 border-b border-theme-border pb-3">
              {editingDiv ? '✏️ Edit Departemen / Divisi' : '➕ Tambah Departemen / Divisi'}
            </h4>

            <form onSubmit={editingDiv ? handleSaveEditDivision : handleAddDivision} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-theme-muted">Nama Divisi</label>
                <input 
                  type="text" 
                  value={editingDiv ? editDivName : newDivName}
                  onChange={(e) => editingDiv ? setEditDivName(e.target.value) : setNewDivName(e.target.value)}
                  placeholder="Contoh: Kimia, Safety, Sipil"
                  className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-theme-muted">Kode Divisi (Maks 10 Karakter)</label>
                <input 
                  type="text" 
                  value={editingDiv ? editDivCode : newDivCode}
                  onChange={(e) => editingDiv ? setEditDivCode(e.target.value) : setNewDivCode(e.target.value)}
                  placeholder="Contoh: KM, SF, SP"
                  maxLength={10}
                  className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500 font-mono uppercase"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editingDiv && (
                  <Button
                    onClick={() => {
                      setEditingDiv(null);
                      setEditDivName('');
                      setEditDivCode('');
                      setDivError('');
                      setDivSuccess('');
                    }}
                    className="font-bold text-xs"
                  >
                    Batal
                  </Button>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isProcessingDiv}
                  className="font-bold text-xs"
                >
                  {editingDiv ? 'Simpan' : 'Tambah'}
                </Button>
              </div>
            </form>
          </div>

          {/* List Column */}
          <div className="lg:col-span-8 bg-theme-input border border-theme-border rounded-2xl p-5">
            <h4 className="text-sm font-bold text-theme-text flex items-center gap-1.5 border-b border-theme-border pb-3 mb-4">
              📋 Daftar Departemen / Divisi Terdaftar
            </h4>

            {divisionsList.length === 0 ? (
              <div className="text-center py-8 text-xs text-theme-dim">
                Belum ada divisi terdaftar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-theme-border text-theme-muted font-bold">
                      <th className="py-2.5 px-3">Nama Divisi</th>
                      <th className="py-2.5 px-3">Kode Divisi</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionsList.map((div) => (
                      <tr key={div.id} className="border-b border-theme-border/50 hover:bg-theme-card/30 transition-all">
                        <td className="py-3 px-3 font-semibold text-theme-text">{div.name}</td>
                        <td className="py-3 px-3 font-mono text-status-blue-text font-bold">{div.code}</td>
                        <td className="py-3 px-3 text-right flex gap-1.5 justify-end">
                          <Button
                            size="small"
                            onClick={() => handleStartEditDiv(div)}
                            className="text-[10px] font-bold"
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => handleDeleteDivision(div.id, div.name)}
                            className="text-[10px] font-bold"
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRegModal && (
        <div className="fixed inset-0 bg-theme-card backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-theme-border">
              <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
                <UserPlus size={16} className="text-status-orange-text" /> Daftarkan Anggota Baru (Biometrik)
              </h3>
              <button 
                onClick={closeRegModal}
                className="text-theme-muted hover:text-theme-text text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {regError && (
              <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-3.5 py-2.5 rounded-xl">
                ⚠️ {regError}
              </div>
            )}

            {regSuccess && (
              <div className="bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text text-xs px-3.5 py-2.5 rounded-xl">
                🎉 {regSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-theme-muted">Nama Pengguna (Username)</label>
                  <input 
                    type="text" 
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-theme-muted">Peran Utama (Base Role)</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager_mutu">Manager QHSE</option>
                    <option value="direktur">Direktur</option>
                  </select>
                </div>

                {(regRole === 'admin' || regRole === 'supervisor') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-theme-muted">Departemen</label>
                    <select
                      value={isCustomRole ? 'custom' : (regKomoditi || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomRole(true);
                          setRegKomoditi('');
                        } else {
                          setIsCustomRole(false);
                          setRegKomoditi(val);
                        }
                      }}
                      className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
                    >
                      <option value="">Tanpa Keterangan</option>
                      {allKomoditis.map(k => (
                        <option key={`reg_kom_${k}`} value={k}>{k}</option>
                      ))}
                      <option value="custom">➕ Tambah Kustom...</option>
                    </select>
                  </div>
                )}

                {(regRole === 'admin' || regRole === 'supervisor') && isCustomRole && (
                  <div className="flex flex-col gap-1.5 bg-theme-input p-3 border border-theme-border rounded-xl">
                    <label className="text-[10px] font-bold text-theme-muted uppercase">Departemen Kustom Baru</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={regKomoditi}
                        onChange={(e) => setRegKomoditi(e.target.value)}
                        placeholder="Contoh: Kimia, Metal, Sipil, dll."
                        className="flex-1 bg-theme-card border border-theme-border rounded-lg px-3 py-1.5 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all"
                      />
                      <Button
                        onClick={() => {
                          setIsCustomRole(false);
                          setRegKomoditi('Elektronik');
                        }}
                        className="font-semibold text-[10px]"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-theme-muted">Metode Verifikasi Login</label>
              <div className="flex bg-theme-input border border-theme-border rounded-xl p-1 w-full justify-between gap-1">
                <Button
                  type={regMethod === 'face_token' ? 'primary' : 'default'}
                  onClick={() => {
                    setRegMethod('face_token');
                  }}
                  className="flex-1 font-bold text-xs"
                >
                  📹 Biometrik Wajah & Token
                </Button>
                <Button
                  type={regMethod === 'token_only' ? 'primary' : 'default'}
                  onClick={() => {
                    setRegMethod('token_only');
                    stopRegCamera();
                  }}
                  className="flex-1 font-bold text-xs"
                >
                  🔑 Hanya Token Akses
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-theme-muted flex justify-between">
                <span>{regMethod === 'token_only' ? 'Token Akses Login (Wajib)' : 'Token Akses Login (Opsional)'}</span>
                <span className="text-[10px] text-theme-dim italic">Bypass Face Login</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={regLoginToken}
                  onChange={(e) => setRegLoginToken(e.target.value)}
                  placeholder={regMethod === 'token_only' ? "Contoh: STAFF2026 (Wajib diisi)" : "Contoh: STAFF2026 (Kosongkan jika hanya wajah)"}
                  className="flex-1 bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500 font-mono"
                />
                <Button
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let token = '';
                    for (let i = 0; i < 8; i++) {
                      token += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setRegLoginToken(token);
                  }}
                  className="h-10 font-bold"
                >
                  Acak
                </Button>
            </div>
          </div>
        </div>

              <div className="flex flex-col gap-4 bg-theme-input/30 p-4 sm:p-5 border border-theme-border rounded-2xl">
                {regMethod === 'face_token' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-theme-muted">Pemindai Wajah Biometrik</label>
                    
                    <div className="relative w-full h-[320px] bg-theme-card border border-theme-border rounded-2xl overflow-hidden flex items-center justify-center">
                      <video 
                        ref={regVideoRef}
                        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${regCameraActive ? 'block' : 'hidden'}`}
                        muted
                        playsInline
                      />
                      {!regCameraActive && (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-theme-muted">
                          <Camera size={36} className="mb-2" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Kamera Tidak Aktif</span>
                        </div>
                      )}

                      {regScanning && (
                        <div className="absolute inset-0 bg-theme-card flex flex-col items-center justify-center gap-2">
                          <span className="w-8 h-8 rounded-full border-2 border-status-orange-border border-t-transparent animate-spin"></span>
                          <span className="text-xs text-theme-text font-semibold animate-pulse">Memindai Wajah...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!regCameraActive ? (
                        <Button
                          onClick={startRegCamera}
                          className="font-bold text-[10px]"
                        >
                          Nyalakan Kamera
                        </Button>
                      ) : (
                        <Button
                          onClick={stopRegCamera}
                          className="font-bold text-[10px]"
                        >
                          Matikan Kamera
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-theme-input border border-dashed border-theme-border p-5 rounded-2xl text-center text-theme-muted text-xs leading-relaxed min-h-[160px] flex items-center justify-center">
                    <div>
                      🔒 Mode <strong>Hanya Token</strong> aktif.<br/>Anggota baru ini akan login menggunakan token akses dan tidak memerlukan pemindaian biometrik wajah.
                    </div>
                  </div>
                )}

                {regStatus && (
                  <div className="text-[10px] text-theme-muted bg-theme-input px-3 py-2 border border-theme-border rounded-lg">
                    💡 Status: {regStatus}
                  </div>
                )}
              </div>

              <div className="col-span-1 md:col-span-2 flex gap-2 justify-end border-t border-theme-border pt-4 mt-2">
                <Button
                  onClick={closeRegModal}
                  className="font-bold text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="primary"
                  onClick={handleSpvRegister}
                  disabled={
                    regMethod === 'face_token'
                      ? (isModelLoading || regScanning || !regCameraActive || !regUsername.trim())
                      : (regScanning || !regUsername.trim() || !regLoginToken.trim())
                  }
                  className="font-bold text-xs h-10"
                >
                  {regMethod === 'face_token' ? 'Pindai & Simpan Wajah' : 'Daftarkan Anggota Baru'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUserForEdit && (
        <div className="fixed inset-0 bg-theme-card backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-theme-border">
              <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
                ⚙️ Ubah Profil Anggota
              </h3>
              <Button
                onClick={closeEditModal}
                className="font-bold text-xs"
              >
                ✕ Tutup
              </Button>
            </div>

            {editError && (
              <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-3.5 py-2.5 rounded-xl">
                ⚠️ {editError}
              </div>
            )}

            {editSuccess && (
              <div className="bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text text-xs px-3.5 py-2.5 rounded-xl">
                🎉 {editSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-theme-muted">Nama Pengguna (Username)</label>
                  <input 
                    type="text" 
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-theme-muted">Peran Utama (Base Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager_mutu">Manager QHSE</option>
                    <option value="direktur">Direktur</option>
                  </select>
                </div>

                {(editRole === 'admin' || editRole === 'supervisor') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-theme-muted">Departemen</label>
                    <select
                      value={isEditCustomRole ? 'custom' : (editKomoditi || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsEditCustomRole(true);
                          setEditKomoditi('');
                        } else {
                          setIsEditCustomRole(false);
                          setEditKomoditi(val);
                        }
                      }}
                      className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
                    >
                      <option value="">Tanpa Keterangan</option>
                      {allKomoditis.map(k => (
                        <option key={`edit_kom_${k}`} value={k}>{k}</option>
                      ))}
                      <option value="custom">➕ Tambah Kustom...</option>
                    </select>
                  </div>
                )}

                {(editRole === 'admin' || editRole === 'supervisor') && isEditCustomRole && (
                  <div className="flex flex-col gap-1.5 bg-theme-input p-3 border border-theme-border rounded-xl">
                    <label className="text-[10px] font-bold text-theme-muted uppercase">Departemen Kustom Baru</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editKomoditi}
                        onChange={(e) => setEditKomoditi(e.target.value)}
                        placeholder="Contoh: Kimia, Metal, Sipil, dll."
                        className="flex-1 bg-theme-card border border-theme-border rounded-lg px-3 py-1.5 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditCustomRole(false);
                          setEditKomoditi(selectedUserForEdit?.komoditi || 'Elektronik');
                        }}
                        className="bg-theme-hover hover:bg-slate-700 text-theme-muted px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-theme-muted flex justify-between">
                    <span>Token Akses Login</span>
                    <span className="text-[10px] text-theme-dim italic">Bypass Face Login</span>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editLoginToken}
                      onChange={(e) => setEditLoginToken(e.target.value)}
                      placeholder="Contoh: TOKEN123 (Kosongkan jika hanya wajah)"
                      className="flex-1 bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500 font-mono"
                    />
                    <Button
                      onClick={() => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                        let token = '';
                        for (let i = 0; i < 8; i++) {
                          token += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        setEditLoginToken(token);
                      }}
                      className="h-10 font-bold"
                    >
                      Acak
                    </Button>
                  </div>
                </div>

                {(editRole === 'admin' || editRole === 'supervisor') && (
                  <div className="bg-theme-input p-4 border border-theme-border rounded-xl flex flex-col gap-3">
                    <span className="text-xs font-bold text-status-orange-text">🔒 Izin Akses Granular</span>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-theme-muted uppercase">Departemen yang Diizinkan:</label>
                      <div className="flex gap-2.5 flex-wrap mt-0.5">
                        {['ALL', ...allKomoditis].map(kom => {
                          const isChecked = editAllowedKomoditi.includes(kom);
                          return (
                            <label key={kom} className="flex items-center gap-1.5 text-xs text-theme-muted cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (kom === 'ALL') {
                                      setEditAllowedKomoditi(['ALL']);
                                    } else {
                                      setEditAllowedKomoditi([...editAllowedKomoditi.filter(x => x !== 'ALL'), kom]);
                                    }
                                  } else {
                                    setEditAllowedKomoditi(editAllowedKomoditi.filter(x => x !== kom));
                                  }
                                }}
                                className="w-4 h-4 rounded bg-theme-card border-theme-border text-status-orange-text focus:ring-0 cursor-pointer"
                              />
                              <span>{kom}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-[10px] font-bold text-theme-muted uppercase">Jenis Dokumen yang Diizinkan:</label>
                      <div className="flex gap-2.5 flex-wrap mt-0.5">
                        {['ALL', ...allDepartemens].map(dep => {
                          const isChecked = editAllowedDepartemen.includes(dep);
                          return (
                            <label key={dep} className="flex items-center gap-1.5 text-xs text-theme-muted cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (dep === 'ALL') {
                                      setEditAllowedDepartemen(['ALL']);
                                    } else {
                                      setEditAllowedDepartemen([...editAllowedDepartemen.filter(x => x !== 'ALL'), dep]);
                                    }
                                  } else {
                                    setEditAllowedDepartemen(editAllowedDepartemen.filter(x => x !== dep));
                                  }
                                }}
                                className="w-4 h-4 rounded bg-theme-card border-theme-border text-status-orange-text focus:ring-0 cursor-pointer"
                              />
                              <span>{dep}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-theme-input p-4 border border-theme-border rounded-xl flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-theme-muted">Pembaruan Biometrik Wajah</label>
                  <p className="text-[10px] text-theme-muted">Gunakan fitur ini jika wajah anggota perlu didaftarkan ulang (misal: karena kendala pencahayaan saat daftar pertama kali).</p>
                  
                  <div className="relative w-full h-[320px] bg-theme-card border border-theme-border rounded-2xl overflow-hidden flex items-center justify-center mt-1">
                    <video 
                      ref={editVideoRef}
                      className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${editCameraActive ? 'block' : 'hidden'}`}
                      muted
                      playsInline
                    />
                    {!editCameraActive && (
                      <div className="flex flex-col items-center justify-center p-4 text-center text-theme-muted">
                        <Camera size={30} className="mb-1.5" />
                        <span className="text-[9px] uppercase font-bold tracking-wider">Kamera Edit Nonaktif</span>
                      </div>
                    )}

                    {editScanning && (
                      <div className="absolute inset-0 bg-theme-card flex flex-col items-center justify-center gap-2">
                        <span className="w-8 h-8 rounded-full border-2 border-status-orange-border border-t-transparent animate-spin"></span>
                        <span className="text-xs text-theme-text font-semibold animate-pulse">Memindai & Memperbarui...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-1">
                    {!editCameraActive ? (
                      <Button
                        onClick={startEditCamera}
                        className="font-bold text-[10px]"
                      >
                        Nyalakan Kamera
                      </Button>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <Button
                          onClick={stopEditCamera}
                          className="font-bold text-[10px]"
                        >
                          Matikan Kamera
                        </Button>
                        <Button
                          type="primary"
                          onClick={handleFaceUpdate}
                          loading={editScanning}
                          className="flex-1 font-bold text-[10px]"
                        >
                          Pindai & Simpan Wajah Baru
                        </Button>
                      </div>
                    )}
                  </div>

                  {editStatus && (
                    <div className="text-[9px] text-theme-muted bg-theme-card px-3 py-1.5 border border-theme-border rounded-lg">
                      💡 Status: {editStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-theme-border pt-4 mt-2">
              <Button
                onClick={closeEditModal}
                className="font-bold text-xs"
              >
                Batal
              </Button>
              <Button
                type="primary"
                onClick={saveUpdatedUser}
                disabled={!editUsername.trim()}
                loading={isUpdating}
                className="font-bold text-xs h-10"
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
