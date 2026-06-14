import React, { useEffect, useState, useRef } from 'react';
import { Settings, Save, AlertCircle, RefreshCw, Plus, Trash2, RotateCcw, ClipboardList, Undo, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { parseTemplate } from '../../../lib/template';
import { logAudit } from '../../../lib/audit';
import { TemplateMemento, TemplateCaretaker } from '../../../lib/templateMemento';
import { Button } from 'antd';

const defaultPlaceholders = [
  { key: '{nomor_2}', description: 'Nomor urut 2 digit (e.g. 01)', formula: 'pad(nomor, 2)', category: 'Nomor Urut' },
  { key: '{nomor}', description: 'Nomor urut 3 digit (e.g. 045)', formula: 'pad(nomor, 3)', category: 'Nomor Urut' },
  { key: '{nomor_4}', description: 'Nomor urut 4 digit (e.g. 0045)', formula: 'pad(nomor, 4)', category: 'Nomor Urut' },
  { key: '{nomor_raw}', description: 'Nomor urut tanpa padding (e.g. 45)', formula: 'nomor', category: 'Nomor Urut' },
  { key: '{departemen}', description: 'Nama Departemen (e.g. Elektronik)', formula: 'komoditi', category: 'Departemen' },
  { key: '{DEPARTEMEN}', description: 'Departemen Kapital (e.g. ELEKTRONIK)', formula: 'komoditi.toUpperCase()', category: 'Departemen' },
  { key: '{departemen_kode}', description: 'Singkatan Dept. (e.g. EL, BB, RF)', formula: 'shortCommodity[komoditi] || komoditi', category: 'Departemen' },
  { key: '{jenis_dokumen}', description: 'Nama Jenis Dokumen (e.g. Safety)', formula: 'departemen', category: 'Jenis Dokumen' },
  { key: '{JENIS_DOKUMEN}', description: 'Jenis Dokumen Kapital (e.g. SAFETY)', formula: 'departemen.toUpperCase()', category: 'Jenis Dokumen' },
  { key: '{jenis_dokumen_kode}', description: 'Singkatan Jenis Dok. (e.g. SF, SK)', formula: 'shortDept[departemen] || departemen', category: 'Jenis Dokumen' },
  { key: '{hari}', description: 'Hari rilis LHU (e.g. 09)', formula: 'pad(date.getDate(), 2)', category: 'Tanggal' },
  { key: '{bulan}', description: 'Bulan rilis LHU (e.g. 06)', formula: 'pad(date.getMonth() + 1, 2)', category: 'Tanggal' },
  { key: '{bulan_romawi}', description: 'Bulan dalam romawi (e.g. VI)', formula: 'getRomanMonth(date.getMonth())', category: 'Tanggal' },
  { key: '{tahun}', description: 'Tahun penuh (e.g. 2026)', formula: 'date.getFullYear()', category: 'Tanggal' },
  { key: '{tahun_2}', description: 'Tahun 2 digit (e.g. 26)', formula: 'String(date.getFullYear()).slice(-2)', category: 'Tanggal' }
];

interface TemplateTabProps {
  userName: string;
}

export default function TemplateTab({ userName }: TemplateTabProps) {
  const userRole = (typeof window !== 'undefined' ? localStorage.getItem('lhu_user_role') : '') || 'manager_mutu';
  const [lhuTemplate, setLhuTemplate] = useState('{nomor_2}.PROLAB/LHU-HOUSEHOLD/{bulan_romawi}/{tahun}');
  const [certTemplate, setCertTemplate] = useState('CERT/{departemen_kode}/{tahun}/{nomor}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [newPlaceholderKey, setNewPlaceholderKey] = useState('');
  const [newPlaceholderDesc, setNewPlaceholderDesc] = useState('');
  const [newPlaceholderFormula, setNewPlaceholderFormula] = useState('pad(nomor, 2)');
  const [newPlaceholderCategory, setNewPlaceholderCategory] = useState('Custom');
  const [formulaPreset, setFormulaPreset] = useState('pad(nomor, 2)');
  const [staticText, setStaticText] = useState('');

  const caretakerRef = useRef(new TemplateCaretaker());
  const [canUndo, setCanUndo] = useState(false);

  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [selectedKomoditi, setSelectedKomoditi] = useState('Elektronik');
  const [departments, setDepartments] = useState<string[]>(['Elektronik', 'Besi Baja', 'RF']);
  const [currentItems, setCurrentItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const [maxLhuNumber, setMaxLhuNumber] = useState<number>(0);
  const [maxCertNumber, setMaxCertNumber] = useState<number>(0);
  const [nextLhuNumberInput, setNextLhuNumberInput] = useState<string>('');
  const [nextCertNumberInput, setNextCertNumberInput] = useState<string>('');
  const [savingSequence, setSavingSequence] = useState(false);

  const mockData = {
    nomor: 45,
    komoditi: 'Elektronik',
    departemen: 'Safety',
    date: new Date()
  };

  useEffect(() => {
    fetchTemplates();
    fetchChecklists();
  }, []);

  useEffect(() => {
    const matching = checklistTemplates.find(t => t.komoditi === selectedKomoditi);
    if (matching) {
      setCurrentItems(matching.checklist_items || []);
    } else {
      setCurrentItems([]);
    }
  }, [selectedKomoditi, checklistTemplates]);

  const fetchChecklists = async () => {
    try {
      const { data: checklistData, error: checklistErr } = await supabase
        .from('lhu_checklist_templates')
        .select('*');
      if (checklistErr) throw checklistErr;
      
      setChecklistTemplates(checklistData || []);

      const { data: usersData } = await supabase
        .from('lhu_users')
        .select('komoditi');
      
      const { data: docsData } = await supabase
        .from('lhu_document')
        .select('komoditi');

      const { data: divisionsData } = await supabase
        .from('lhu_divisions')
        .select('name');

      const dbKomoditis = [
        ...(checklistData || []).map(t => t.komoditi),
        ...(usersData || []).map(u => u.komoditi),
        ...(docsData || []).map(d => d.komoditi),
        ...(divisionsData || []).map(div => div.name)
      ].filter(Boolean);

      const uniqueDepts = Array.from(new Set(['Elektronik', 'Besi Baja', 'RF', ...dbKomoditis]));
      setDepartments(uniqueDepts);
    } catch (err) {
      console.error('Failed to load checklist templates:', err);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: maxLhuDocs } = await supabase
        .from('lhu_document')
        .select('nomor_lhu')
        .eq('tipe_dokumen', 'LHU')
        .order('nomor_lhu', { ascending: false })
        .limit(1);
      const maxLhu = maxLhuDocs && maxLhuDocs.length > 0 ? maxLhuDocs[0].nomor_lhu : 0;
      setMaxLhuNumber(maxLhu);

      const { data: maxCertDocs } = await supabase
        .from('lhu_document')
        .select('nomor_lhu')
        .eq('tipe_dokumen', 'Sertifikat')
        .order('nomor_lhu', { ascending: false })
        .limit(1);
      const maxCert = maxCertDocs && maxCertDocs.length > 0 ? maxCertDocs[0].nomor_lhu : 0;
      setMaxCertNumber(maxCert);

      const { data, error: fetchErr } = await supabase
        .from('lhu_settings')
        .select('*');

      if (fetchErr) throw fetchErr;

      if (data && data.length > 0) {
        const lhuSetting = data.find(s => s.key === 'lhu_code_template');
        const certSetting = data.find(s => s.key === 'cert_code_template');
        if (lhuSetting) setLhuTemplate(lhuSetting.value);
        if (certSetting) setCertTemplate(certSetting.value);

        const nextLhuSetting = data.find(s => s.key === 'next_lhu_number');
        if (nextLhuSetting) {
          setNextLhuNumberInput(nextLhuSetting.value);
        } else {
          setNextLhuNumberInput(String(maxLhu + 1));
        }

        const nextCertSetting = data.find(s => s.key === 'next_cert_number');
        if (nextCertSetting) {
          setNextCertNumberInput(nextCertSetting.value);
        } else {
          setNextCertNumberInput(String(maxCert + 1));
        }

        const placeholderSetting = data.find(s => s.key === 'lhu_placeholders');
        if (placeholderSetting) {
          setPlaceholders(JSON.parse(placeholderSetting.value));
        } else {
          setPlaceholders(defaultPlaceholders);
          await supabase.from('lhu_settings').upsert({
            key: 'lhu_placeholders',
            value: JSON.stringify(defaultPlaceholders)
          });
        }
      } else {
        setNextLhuNumberInput(String(maxLhu + 1));
        setNextCertNumberInput(String(maxCert + 1));
        setPlaceholders(defaultPlaceholders);
        await supabase.from('lhu_settings').upsert({
          key: 'lhu_placeholders',
          value: JSON.stringify(defaultPlaceholders)
        });
      }
    } catch (err: any) {
      console.error('Gagal mengambil template:', err);
      setError('Gagal memuat template dari database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSequence = async () => {
    const lhuNum = parseInt(nextLhuNumberInput);
    const certNum = parseInt(nextCertNumberInput);
    if (isNaN(lhuNum) || lhuNum <= 0 || isNaN(certNum) || certNum <= 0) {
      setError('Nomor induk harus berupa angka positif.');
      return;
    }

    setSavingSequence(true);
    setError('');
    setSuccess('');
    try {
      const { error: lhuErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'next_lhu_number', value: String(lhuNum) }, { onConflict: 'key' });
      if (lhuErr) throw lhuErr;

      const { error: certErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'next_cert_number', value: String(certNum) }, { onConflict: 'key' });
      if (certErr) throw certErr;

      await logAudit(
        userName,
        userRole,
        'MANAGER_UPDATE_NEXT_NUMBER',
        `Mereset/mengubah nomor induk berikutnya (LHU ke ${lhuNum}, Sertifikat ke ${certNum})`
      );

      setSuccess('Nomor induk berikutnya untuk LHU dan Sertifikat berhasil diperbarui!');
      
      fetchTemplates();
    } catch (err: any) {
      console.error('Gagal mengeset nomor induk:', err);
      setError('Gagal menyimpan nomor induk: ' + err.message);
    } finally {
      setSavingSequence(false);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error: lhuErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'lhu_code_template', value: lhuTemplate }, { onConflict: 'key' });

      if (lhuErr) throw lhuErr;

      const { error: certErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'cert_code_template', value: certTemplate }, { onConflict: 'key' });

      if (certErr) throw certErr;

      await logAudit(
        userName,
        userRole,
        'MANAGER_UPDATE_TEMPLATE',
        `Mengupdate template kode LHU ke "${lhuTemplate}" dan Certificate ke "${certTemplate}"`
      );

      setSuccess('Template kode berhasil diperbarui dan diterapkan ke seluruh dokumen baru!');
    } catch (err: any) {
      console.error('Gagal menyimpan template:', err);
      setError('Gagal menyimpan perubahan template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (type: 'lhu' | 'cert', value: string) => {
    caretakerRef.current.addMemento(new TemplateMemento(lhuTemplate, certTemplate));
    setCanUndo(true);

    if (type === 'lhu') setLhuTemplate(value);
    if (type === 'cert') setCertTemplate(value);
  };

  const handleUndo = () => {
    if (!caretakerRef.current.hasHistory()) return;
    
    const lastState = caretakerRef.current.getMemento();
    if (lastState) {
      setLhuTemplate(lastState.getLhuTemplate());
      setCertTemplate(lastState.getCertTemplate());
      setCanUndo(caretakerRef.current.hasHistory());
    }
  };

  const handleAddPlaceholder = async () => {
    const key = newPlaceholderKey.trim();
    const desc = newPlaceholderDesc.trim();
    const formula = newPlaceholderFormula.trim();
    
    if (!key || !desc || !formula) {
      setError('Harap isi semua kolom untuk placeholder baru.');
      return;
    }
    
    if (!key.startsWith('{') || !key.endsWith('}')) {
      setError('Format key placeholder harus diawali "{" dan diakhiri "}" (e.g. {kode_custom}).');
      return;
    }

    if (placeholders.some(p => p.key === key)) {
      setError('Key placeholder tersebut sudah ada.');
      return;
    }

    const updated = [
      ...placeholders,
      { key, description: desc, formula, category: newPlaceholderCategory }
    ];

    try {
      const { error: saveErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'lhu_placeholders', value: JSON.stringify(updated) });

      if (saveErr) throw saveErr;

      setPlaceholders(updated);
      setNewPlaceholderKey('');
      setNewPlaceholderDesc('');
      setNewPlaceholderFormula('pad(nomor, 2)');
      setStaticText('');
      setFormulaPreset('pad(nomor, 2)');
      setSuccess('Placeholder baru berhasil ditambahkan ke panduan!');
      
      await logAudit(
        userName,
        userRole,
        'MANAGER_ADD_PLACEHOLDER',
        `Menambahkan placeholder dinamis baru: ${key}`
      );
    } catch (err: any) {
      setError('Gagal menambahkan placeholder: ' + err.message);
    }
  };

  const handleDeletePlaceholder = async (keyToDelete: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus placeholder "${keyToDelete}" dari panduan?`);
    if (!confirmDelete) return;

    const updated = placeholders.filter(p => p.key !== keyToDelete);

    try {
      const { error: saveErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'lhu_placeholders', value: JSON.stringify(updated) });

      if (saveErr) throw saveErr;

      setPlaceholders(updated);
      setSuccess(`Placeholder "${keyToDelete}" berhasil dihapus.`);
      
      await logAudit(
        userName,
        userRole,
        'MANAGER_DELETE_PLACEHOLDER',
        `Menghapus placeholder dinamis: ${keyToDelete}`
      );
    } catch (err: any) {
      setError('Gagal menghapus placeholder: ' + err.message);
    }
  };

  const handleResetPlaceholders = async () => {
    const confirmReset = window.confirm('Apakah Anda yakin ingin mereset semua panduan placeholder ke bawaan sistem?');
    if (!confirmReset) return;

    try {
      const { error: saveErr } = await supabase
        .from('lhu_settings')
        .upsert({ key: 'lhu_placeholders', value: JSON.stringify(defaultPlaceholders) });

      if (saveErr) throw saveErr;

      setPlaceholders(defaultPlaceholders);
      setSuccess('Semua panduan placeholder berhasil direset ke bawaan sistem.');
      
      await logAudit(
        userName,
        userRole,
        'MANAGER_RESET_PLACEHOLDERS',
        'Mereset semua panduan placeholder ke bawaan'
      );
    } catch (err: any) {
      setError('Gagal mereset placeholder: ' + err.message);
    }
  };

  const handleSaveChecklist = async () => {
    if (currentItems.length === 0) {
      setError('Checklist tidak boleh kosong. Harap tambahkan minimal 1 item.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase
        .from('lhu_checklist_templates')
        .upsert({
          komoditi: selectedKomoditi,
          checklist_items: currentItems,
          updated_at: new Date().toISOString()
        }, { onConflict: 'komoditi' });

      if (error) throw error;

      await logAudit(
        userName,
        userRole,
        'MANAGER_UPDATE_CHECKLIST_TEMPLATE',
        `Mengupdate template checklist SOP untuk departemen "${selectedKomoditi}" dengan ${currentItems.length} item`
      );

      setSuccess(`Template checklist SOP untuk departemen "${selectedKomoditi}" berhasil disimpan!`);
      fetchChecklists();
    } catch (err: any) {
      console.error('Failed to save checklist template:', err);
      setError('Gagal menyimpan checklist template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetChecklist = async () => {
    const confirmReset = window.confirm(`Apakah Anda yakin ingin menghapus template checklist untuk "${selectedKomoditi}"? Hal ini akan mengembalikan ke checklist bawaan sistem.`);
    if (!confirmReset) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase
        .from('lhu_checklist_templates')
        .delete()
        .eq('komoditi', selectedKomoditi);

      if (error) throw error;

      await logAudit(
        userName,
        userRole,
        'MANAGER_RESET_CHECKLIST_TEMPLATE',
        `Mereset template checklist SOP untuk departemen "${selectedKomoditi}" ke bawaan`
      );

      setSuccess(`Template checklist SOP untuk "${selectedKomoditi}" telah dihapus.`);
      setCurrentItems([]);
      fetchChecklists();
    } catch (err: any) {
      console.error('Failed to reset checklist template:', err);
      setError('Gagal mereset checklist template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    if (currentItems.includes(newItemText.trim())) {
      setError('Item checklist sudah ada.');
      return;
    }
    setCurrentItems([...currentItems, newItemText.trim()]);
    setNewItemText('');
    setError('');
  };

  const removeItem = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index));
    setError('');
    if (editingIdx === index) {
      setEditingIdx(null);
      setEditingText('');
    }
  };

  const startEditing = (idx: number, text: string) => {
    setEditingIdx(idx);
    setEditingText(text);
  };

  const saveEdit = (idx: number) => {
    if (!editingText.trim()) return;
    const updated = [...currentItems];
    updated[idx] = editingText.trim();
    setCurrentItems(updated);
    setEditingIdx(null);
    setEditingText('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditingText('');
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text">
            <Settings size={18} className="text-status-orange-text" /> Pengaturan Template Kode Dokumen
          </h3>
          <p className="text-xs text-theme-muted mt-1">
            Modifikasi format penamaan dinamis untuk Kode LHU dan Kode Sertifikat yang diterbitkan sistem.
          </p>
        </div>
        <div className="flex gap-2">
          {canUndo && (
            <Button
              type="dashed"
              onClick={handleUndo}
              icon={<Undo size={14} />}
              title="Urungkan Perubahan (Undo)"
              className="flex items-center"
            >
              Undo
            </Button>
          )}
          <Button
            onClick={fetchTemplates}
            icon={<RefreshCw size={14} />}
            title="Segarkan Template"
            className="flex items-center justify-center"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-theme-dim font-semibold animate-pulse">
          Memuat konfigurasi template...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {error && (
            <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-4 py-3 rounded-none flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {success && (
            <div className="bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text text-xs px-4 py-3 rounded-none">
              🎉 {success}
            </div>
          )}

          <div className="bg-theme-input border border-theme-border p-5 rounded-2xl flex flex-col gap-5">
            <div className="flex gap-2 items-center flex-wrap pb-2 border-b border-theme-border/50">
              <span className="text-[10px] font-bold text-theme-dim uppercase tracking-wider">Preset Pola Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  const lhuVal = '{nomor_2}.PROLAB/LHU/{bulan_romawi}/{tahun}';
                  const certVal = '{nomor_2}.PROLAB/CERT/{bulan_romawi}/{tahun}';
                  setLhuTemplate(lhuVal);
                  setCertTemplate(certVal);
                  handleTemplateChange('lhu', lhuVal);
                  handleTemplateChange('cert', certVal);
                }}
                className="text-[10px] bg-theme-card hover:bg-theme-input border border-theme-border rounded-lg px-2.5 py-1 text-theme-text transition-all cursor-pointer font-medium"
              >
                Pola Standar (Romawi)
              </button>
              <button
                type="button"
                onClick={() => {
                  const lhuVal = '{nomor}.LHU/{departemen_kode}/{bulan}/{tahun_2}';
                  const certVal = '{nomor}.CERT/{departemen_kode}/{bulan}/{tahun_2}';
                  setLhuTemplate(lhuVal);
                  setCertTemplate(certVal);
                  handleTemplateChange('lhu', lhuVal);
                  handleTemplateChange('cert', certVal);
                }}
                className="text-[10px] bg-theme-card hover:bg-theme-input border border-theme-border rounded-lg px-2.5 py-1 text-theme-text transition-all cursor-pointer font-medium"
              >
                Pola Departemen & Angka
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-theme-muted">Format Kode LHU</label>
                  <span className="text-[10px] text-theme-dim italic">Ketik bebas di antara kata kunci</span>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: {nomor_2}.PROLAB/LHU/{bulan_romawi}/{tahun}"
                  value={lhuTemplate}
                  onChange={(e) => handleTemplateChange('lhu', e.target.value)}
                  className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all font-mono"
                />

                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] font-bold text-theme-dim uppercase tracking-wider">Sisipkan Kata Kunci (Klik):</span>
                  <div className="flex flex-wrap gap-1 bg-theme-card/40 p-2 rounded-xl border border-theme-border/50 max-h-[100px] overflow-y-auto">
                    {placeholders.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          const newVal = lhuTemplate + p.key;
                          setLhuTemplate(newVal);
                          handleTemplateChange('lhu', newVal);
                        }}
                        className="text-[9px] bg-theme-card hover:bg-theme-input border border-theme-border hover:border-status-emerald-border text-theme-text font-mono px-2 py-0.75 rounded-lg transition-all flex items-center gap-0.5 cursor-pointer"
                        title={p.description}
                      >
                        <span className="text-status-emerald-text font-bold">+</span>
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 bg-theme-card border border-theme-border p-3.5 rounded-xl">
                  <span className="text-[10px] text-theme-dim font-bold block uppercase tracking-wider mb-1">Preview Real-Time</span>
                  <span className="text-xs font-mono text-status-emerald-text font-bold break-all">
                    {parseTemplate(lhuTemplate, mockData, placeholders)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-theme-muted">Format Kode Sertifikat</label>
                  <span className="text-[10px] text-theme-dim italic">Ketik bebas di antara kata kunci</span>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: {nomor_2}.PROLAB/CERT/{bulan_romawi}/{tahun}"
                  value={certTemplate}
                  onChange={(e) => handleTemplateChange('cert', e.target.value)}
                  className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all font-mono"
                />

                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9px] font-bold text-theme-dim uppercase tracking-wider">Sisipkan Kata Kunci (Klik):</span>
                  <div className="flex flex-wrap gap-1 bg-theme-card/40 p-2 rounded-xl border border-theme-border/50 max-h-[100px] overflow-y-auto">
                    {placeholders.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          const newVal = certTemplate + p.key;
                          setCertTemplate(newVal);
                          handleTemplateChange('cert', newVal);
                        }}
                        className="text-[9px] bg-theme-card hover:bg-theme-input border border-theme-border hover:border-status-blue-border text-theme-text font-mono px-2 py-0.75 rounded-lg transition-all flex items-center gap-0.5 cursor-pointer"
                        title={p.description}
                      >
                        <span className="text-status-blue-text font-bold">+</span>
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 bg-theme-card border border-theme-border p-3.5 rounded-xl">
                  <span className="text-[10px] text-theme-dim font-bold block uppercase tracking-wider mb-1">Preview Real-Time</span>
                  <span className="text-xs font-mono text-status-blue-text font-bold break-all">
                    {parseTemplate(certTemplate, mockData, placeholders)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end border-t border-theme-border/60 pt-4">
              <Button
                type="primary"
                onClick={handleSave}
                loading={saving}
                icon={<Save size={15} />}
                className="h-10 text-xs font-bold px-6 flex items-center justify-center gap-1.5"
              >
                Simpan Format Template
              </Button>
            </div>
          </div>

          <div className="bg-theme-input border border-theme-border p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-3">
              Panduan Placeholder Dinamis
            </h4>
            <p className="text-[11px] text-theme-muted mb-4">
              Anda dapat menggunakan kata kunci berikut dalam template Anda. Sistem akan mengganti kata kunci ini secara otomatis saat membuat LHU baru.
            </p>

            <div className="flex flex-col gap-5">
              {Array.from(new Set(placeholders.map(p => p.category || 'Custom'))).map(categoryName => {
                const categoryPlaceholders = placeholders.filter(p => (p.category || 'Custom') === categoryName);
                if (categoryPlaceholders.length === 0) return null;
                return (
                  <div key={categoryName} className="flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-status-blue-text uppercase tracking-wider border-b border-theme-border pb-1">
                      {categoryName}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                      {categoryPlaceholders.map(p => (
                        <div key={p.key} className="flex justify-between items-center border-b border-theme-border/50 pb-1.5 hover:bg-theme-card/30 px-2 py-1 rounded-xl transition-all group">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-status-orange-text font-mono font-semibold">{p.key}</code>
                              <span className="text-[9px] text-theme-dim font-mono bg-theme-card px-1 py-0.25 border border-theme-border rounded">
                                {p.formula}
                              </span>
                            </div>
                            <span className="text-theme-muted text-[10px]">{p.description}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePlaceholder(p.key)}
                            className="text-status-red-text opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-all rounded shrink-0"
                            title={`Hapus placeholder ${p.key}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-theme-border pt-4">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h5 className="text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                  ➕ Tambah Placeholder Baru
                </h5>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={handleResetPlaceholders}
                  icon={<RotateCcw size={10} />}
                  className="text-[10px] text-status-orange-text hover:text-status-orange-text/80 p-0 flex items-center gap-1"
                >
                  Reset Panduan ke Bawaan
                </Button>
              </div>
              
              <div className="bg-theme-card border border-theme-border p-5 rounded-2xl flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-theme-muted">Placeholder Key</label>
                    <input
                      type="text"
                      placeholder="e.g. {kode_custom}"
                      value={newPlaceholderKey}
                      onChange={(e) => setNewPlaceholderKey(e.target.value)}
                      className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-theme-muted">Deskripsi Panduan</label>
                    <input
                      type="text"
                      placeholder="e.g. Kode internal PROLAB"
                      value={newPlaceholderDesc}
                      onChange={(e) => setNewPlaceholderDesc(e.target.value)}
                      className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-theme-muted">Kategori</label>
                    <select
                      value={newPlaceholderCategory}
                      onChange={(e) => setNewPlaceholderCategory(e.target.value)}
                      className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all"
                    >
                      <option value="Nomor Urut">Nomor Urut</option>
                      <option value="Departemen">Departemen</option>
                      <option value="Jenis Dokumen">Jenis Dokumen</option>
                      <option value="Tanggal">Tanggal</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-theme-border/50 pt-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-theme-muted">Jenis Nilai / Preset Rumus</label>
                    <select
                      value={formulaPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormulaPreset(val);
                        if (val !== 'custom' && val !== 'static') {
                          setNewPlaceholderFormula(val);
                        } else if (val === 'static') {
                          setNewPlaceholderFormula(`'${staticText || 'KODE'}'`);
                        } else {
                          setNewPlaceholderFormula('');
                        }
                      }}
                      className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all"
                    >
                      <option value="pad(nomor, 2)">Nomor Urut 2 Digit (01, 02...)</option>
                      <option value="pad(nomor, 3)">Nomor Urut 3 Digit (001, 002...)</option>
                      <option value="pad(nomor, 4)">Nomor Urut 4 Digit (0001, 0002...)</option>
                      <option value="nomor">Nomor Urut Tanpa Nol (1, 2...)</option>
                      <option value="static">Teks Manual / Statis (Tetap)</option>
                      <option value="shortCommodity[komoditi] || komoditi">Singkatan Departemen (EL, BB...)</option>
                      <option value="komoditi.toUpperCase()">Nama Departemen Kapital (ELEKTRONIK)</option>
                      <option value="shortDept[departemen] || departemen">Singkatan Jenis Dokumen (SF, SK...)</option>
                      <option value="getRomanMonth(date.getMonth())">Bulan Romawi (I, II, III...)</option>
                      <option value="date.getFullYear()">Tahun 4 Digit (2026)</option>
                      <option value="String(date.getFullYear()).slice(-2)">Tahun 2 Digit (26)</option>
                      <option value="custom">Kustom (Tulis JS Sendiri)</option>
                    </select>
                  </div>

                  {formulaPreset === 'static' ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-theme-muted">Masukkan Teks Statis</label>
                      <input
                        type="text"
                        placeholder="Contoh: PROLAB, LHU, dll"
                        value={staticText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStaticText(val);
                          setNewPlaceholderFormula(`'${val}'`);
                        }}
                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-theme-text text-xs outline-none focus:border-status-blue-border transition-all"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-theme-muted">
                        {formulaPreset === 'custom' ? 'Rumus / Formula JS Kustom' : 'Rumus JS Terbuat'}
                      </label>
                      <input
                        type="text"
                        placeholder="Tulis kode Javascript..."
                        value={newPlaceholderFormula}
                        readOnly={formulaPreset !== 'custom'}
                        onChange={(e) => {
                          if (formulaPreset === 'custom') {
                            setNewPlaceholderFormula(e.target.value);
                          }
                        }}
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none transition-all font-mono ${
                          formulaPreset === 'custom' 
                            ? 'bg-theme-input border-theme-border focus:border-status-blue-border text-theme-text' 
                            : 'bg-theme-input/50 border-theme-border/50 text-theme-dim cursor-not-allowed'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-2 border-t border-theme-border/50 pt-3">
                  <Button
                    type="primary"
                    onClick={handleAddPlaceholder}
                    icon={<Plus size={15} />}
                    className="h-10 text-xs font-bold px-6 flex items-center justify-center gap-1.5"
                  >
                    Tambah ke Panduan
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-theme-dim mt-2 italic">
                * Rumus dapat berupa ekspresi JS valid. Variabel yang tersedia: <code>nomor</code>, <code>komoditi</code>, <code>departemen</code>, <code>date</code>. Fungsi helper: <code>pad(num, size)</code>, <code>getRomanMonth(month)</code>.
              </p>
            </div>

            <div className="mt-5 bg-theme-card border border-status-blue-border p-4 rounded-xl">
              <span className="text-[10px] font-bold text-status-blue-text uppercase tracking-wider block mb-2">💡 Contoh Penggunaan</span>
              <div className="flex flex-col gap-2 text-[11px]">
                <div>
                  <span className="text-theme-dim">Template:</span>
                  <code className="text-status-orange-text font-mono ml-2">{`{nomor_2}.PROLAB/LHU-HOUSEHOLD/{bulan_romawi}/{tahun}`}</code>
                </div>
                <div>
                  <span className="text-theme-dim">Hasil:</span>
                  <code className="text-status-emerald-text font-mono font-bold ml-2">01.PROLAB/LHU-HOUSEHOLD/VI/2026</code>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-theme-input border border-theme-border p-5 rounded-2xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider">
              🔢 Pengaturan Nomor Induk Berikutnya (LHU & Sertifikat Terpisah)
            </h4>
            <p className="text-[11px] text-theme-muted">
              LHU dan Sertifikat memiliki penomoran mandiri yang terpisah. Tentukan nomor urut berikutnya yang akan diterbitkan oleh sistem untuk masing-masing jenis dokumen.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-theme-card border border-theme-border p-4 rounded-xl flex flex-col gap-3">
                <span className="text-[10px] text-status-emerald-text font-bold uppercase tracking-wider">Nomor Induk LHU</span>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-theme-dim font-bold uppercase">Terakhir Terbit</span>
                    <span className="text-sm font-mono font-bold text-theme-text mt-1">
                      LHU (Nomor: {maxLhuNumber})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-theme-muted uppercase">Berikutnya</label>
                    <input
                      type="number"
                      min="1"
                      value={nextLhuNumberInput}
                      onChange={(e) => setNextLhuNumberInput(e.target.value)}
                      className="bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-1 focus:ring-blue-500/20 rounded-lg px-3 py-1.5 text-theme-text text-xs outline-none transition-all font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-theme-card border border-theme-border p-4 rounded-xl flex flex-col gap-3">
                <span className="text-[10px] text-status-blue-text font-bold uppercase tracking-wider">Nomor Induk Sertifikat</span>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-theme-dim font-bold uppercase">Terakhir Terbit</span>
                    <span className="text-sm font-mono font-bold text-theme-text mt-1">
                      CERT (Nomor: {maxCertNumber})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-theme-muted uppercase">Berikutnya</label>
                    <input
                      type="number"
                      min="1"
                      value={nextCertNumberInput}
                      onChange={(e) => setNextCertNumberInput(e.target.value)}
                      className="bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-1 focus:ring-blue-500/20 rounded-lg px-3 py-1.5 text-theme-text text-xs outline-none transition-all font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleSaveSequence}
                disabled={savingSequence}
                className="bg-status-orange-bg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-theme-text font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
              >
                {savingSequence ? 'Menyimpan...' : 'Simpan & Terapkan Nomor Induk'}
              </button>
            </div>
          </div>

          <hr className="border-theme-border my-8" />

          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text">
                <ClipboardList size={18} className="text-status-orange-text" /> Template Checklist SOP Per Departemen
              </h3>
              <p className="text-xs text-theme-muted mt-1">
                Atur item verifikasi wajib yang harus dicentang oleh Supervisor berdasarkan departemen dokumen LHU.
              </p>
            </div>
          </div>

          <div className="bg-theme-input p-5 border border-theme-border rounded-2xl flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-theme-muted">Pilih Departemen</label>
              <div className="flex gap-2 flex-wrap items-center">
                {departments.map(kom => {
                  const isActive = selectedKomoditi === kom;
                  return (
                    <button
                      key={kom}
                      onClick={() => setSelectedKomoditi(kom)}
                      className={`px-4 py-2 text-xs font-bold transition-all duration-200 border cursor-pointer ${
                        isActive
                          ? 'bg-status-orange-bg text-status-orange-text border-status-orange-border shadow-sm shadow-orange-500/10'
                          : 'bg-theme-card text-theme-muted border-theme-border hover:text-theme-text hover:bg-theme-hover'
                      }`}
                    >
                      {kom}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-theme-muted flex justify-between items-center">
                <span>Daftar Item Checklist (Departemen: <strong className="text-status-orange-text">{selectedKomoditi}</strong>)</span>
                {currentItems.length === 0 && (
                  <span className="text-[10px] text-status-amber-text font-semibold italic">
                    (Menggunakan checklist SOP 7 default)
                  </span>
                )}
              </label>

              {currentItems.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {currentItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-theme-card border border-theme-border px-4 py-2 flex-wrap sm:flex-nowrap gap-2 rounded-xl">
                      {editingIdx === idx ? (
                        <div className="flex-1 flex gap-2 w-full">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit(idx);
                              } else if (e.key === 'Escape') {
                                cancelEdit();
                              }
                            }}
                            className="flex-1 bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-1 focus:ring-blue-500/20 rounded-none px-3 py-1.5 text-theme-text text-xs outline-none transition-all"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              type="text"
                              icon={<Check size={14} className="text-status-emerald-text" />}
                              onClick={() => saveEdit(idx)}
                              title="Simpan"
                              className="flex items-center justify-center hover:bg-status-emerald-bg rounded-none"
                            />
                            <Button
                              type="text"
                              icon={<X size={14} className="text-status-red-text" />}
                              onClick={cancelEdit}
                              title="Batal"
                              className="flex items-center justify-center hover:bg-status-red-bg rounded-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-theme-muted flex-1">{idx + 1}. {item}</span>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              type="text"
                              icon={<Edit2 size={14} className="text-status-blue-text" />}
                              onClick={() => startEditing(idx, item)}
                              title="Edit Item"
                              className="flex items-center justify-center hover:bg-status-blue-bg rounded-none"
                            />
                            <Button
                              type="text"
                              danger
                              icon={<Trash2 size={14} />}
                              onClick={() => removeItem(idx)}
                              title="Hapus Item"
                              className="flex items-center justify-center rounded-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 bg-theme-card border border-theme-border rounded-xl text-theme-dim text-xs">
                  <span className="font-semibold mb-4 text-center px-4">Belum ada checklist khusus. Supervisor akan melihat SOP 7 default:</span>
                  <div className="flex flex-col gap-2 w-full max-w-md px-4 text-left">
                    <div className="flex items-center gap-2.5 bg-theme-input/40 px-3 py-2 border border-theme-border/60 rounded-lg text-theme-muted">
                      <span className="w-1.5 h-1.5 bg-status-orange-text rounded-full shrink-0 animate-pulse" />
                      <span>Kesesuaian identitas sampel LHU</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-theme-input/40 px-3 py-2 border border-theme-border/60 rounded-lg text-theme-muted">
                      <span className="w-1.5 h-1.5 bg-status-orange-text rounded-full shrink-0 animate-pulse" />
                      <span>Hasil pengujian parameter utama</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-theme-input/40 px-3 py-2 border border-theme-border/60 rounded-lg text-theme-muted">
                      <span className="w-1.5 h-1.5 bg-status-orange-text rounded-full shrink-0 animate-pulse" />
                      <span>Foto bukti pengujian sampel lengkap</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-theme-input/40 px-3 py-2 border border-theme-border/60 rounded-lg text-theme-muted">
                      <span className="w-1.5 h-1.5 bg-status-orange-text rounded-full shrink-0 animate-pulse" />
                      <span>Tanda tangan verifikasi pengaju lengkap</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Masukkan item verifikasi SOP baru..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  className="flex-1 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-none px-4 py-2.5 text-theme-text text-xs outline-none transition-all"
                />
                <Button
                  type="primary"
                  onClick={addItem}
                  icon={<Plus size={16} />}
                  className="h-[38px] flex items-center justify-center rounded-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-theme-border pt-4">
              {currentItems.length > 0 && (
                <Button
                  danger
                  onClick={handleResetChecklist}
                  loading={saving}
                  icon={<RotateCcw size={14} />}
                  className="flex items-center rounded-none"
                >
                  Reset ke Default
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleSaveChecklist}
                loading={saving}
                icon={<Save size={14} />}
                className="h-10 text-xs font-bold rounded-none"
              >
                Simpan Checklist SOP
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
