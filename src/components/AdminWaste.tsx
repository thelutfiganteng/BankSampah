'use client';

import { useState, useEffect } from 'react';

const POINT_RATES: Record<string, number> = {
  'Plastik': 2000,
  'Kertas': 1500,
  'Logam': 5000,
  'Kaca': 1000,
  'Organik': 500,
};

export default function AdminWaste() {
  const [members, setMembers] = useState<any[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [searchMember, setSearchMember] = useState('');
  
  // Form States
  const [newMember, setNewMember] = useState({ name: '', phone: '', address: '' });
  const [deposit, setDeposit] = useState({ memberId: '', wasteType: 'Plastik', weight: '', notes: '' });
  
  // Verification states for pending user deposits
  const [actualWeights, setActualWeights] = useState<Record<number, string>>({});
  const [notesUpdates, setNotesUpdates] = useState<Record<number, string>>({});
  const [verifyLoading, setVerifyLoading] = useState<Record<number, boolean>>({});

  // Status flags
  const [memberLoading, setMemberLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchDeposits();
    fetchRawMaterials();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      if (data.success) setMembers(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/deposit');
      const data = await res.json();
      if (data.success) {
        setRecentDeposits(data.data);
        
        // Pre-fill verification weights with estimated weights
        const weights: Record<number, string> = {};
        data.data.forEach((d: any) => {
          if (d.status === 'PENDING') {
            weights[d.id] = d.weight.toString();
          }
        });
        setActualWeights(weights);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      if (data.success) setRawMaterials(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setMemberLoading(true);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Nasabah '${data.data.name}' berhasil terdaftar!`);
        setNewMember({ name: '', phone: '', address: '' });
        fetchMembers();
      } else {
        setErrorMsg(data.error || 'Gagal mendaftarkan nasabah.');
      }
    } catch (e) {
      setErrorMsg('Masalah koneksi jaringan.');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleLogDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setDepositLoading(true);

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deposit,
          status: 'APPROVED', // Manual deposits by Admin are auto-approved
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Setoran sukses! Diterima Rp ${new Intl.NumberFormat('id-ID').format(data.data.pointsEarned)}.`);
        setDeposit({ memberId: '', wasteType: 'Plastik', weight: '', notes: '' });
        fetchDeposits();
        fetchMembers();
        fetchRawMaterials();
      } else {
        setErrorMsg(data.error || 'Gagal menyimpan setoran.');
      }
    } catch (e) {
      setErrorMsg('Masalah koneksi jaringan.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleVerifyDeposit = async (depositId: number, status: 'APPROVED' | 'REJECTED') => {
    const depositItem = recentDeposits.find(d => d.id === depositId);
    if (!depositItem) return;

    const actualWeight = actualWeights[depositId] || '0';
    const notesUpdate = notesUpdates[depositId] || '';
    const rate = POINT_RATES[depositItem.waste_type] || 0;
    const estPoints = Math.round(parseFloat(actualWeight) * rate);

    const actionText = status === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK';
    const confirmMsg = status === 'APPROVED'
      ? `Apakah Anda yakin ingin MENYETUJUI setoran sampah ini?\n\n` +
        `Nama Nasabah: ${depositItem.member_name}\n` +
        `Kategori Sampah: ${depositItem.waste_type} (Rp ${new Intl.NumberFormat('id-ID').format(rate)}/kg)\n` +
        `Berat Fisik: ${actualWeight} kg\n` +
        `Total Nilai Saldo: Rp ${new Intl.NumberFormat('id-ID').format(estPoints)}\n\n` +
        `Saldo nasabah akan langsung bertambah dan bahan baku gudang akan diperbarui.`
      : `Apakah Anda yakin ingin MENOLAK setoran sampah ini?\n\n` +
        `Nama Nasabah: ${depositItem.member_name}\n` +
        `Kategori Sampah: ${depositItem.waste_type}\n\n` +
        `Setoran ini akan ditolak secara permanen.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setVerifyLoading(prev => ({ ...prev, [depositId]: true }));
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/deposit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId,
          status,
          actualWeight: actualWeight ? parseFloat(actualWeight) : undefined,
          notes: notesUpdate || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(status === 'APPROVED' 
          ? `Setoran berhasil disetujui! Saldo ditambahkan.` 
          : 'Setoran berhasil ditolak.'
        );
        fetchDeposits();
        fetchMembers();
        fetchRawMaterials();
      } else {
        setErrorMsg(data.error || 'Gagal memproses setoran.');
      }
    } catch (e) {
      setErrorMsg('Masalah koneksi jaringan.');
    } finally {
      setVerifyLoading(prev => ({ ...prev, [depositId]: false }));
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchMember.toLowerCase()) || 
    m.phone.includes(searchMember)
  );

  return (
    <div className="waste-manager animate-fade-in">
      {/* Messages */}
      {successMsg && <div className="success-banner">{successMsg}</div>}
      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Left column: Deposit entry & Member registration */}
        <div className="form-column">
          {/* Section: Log Deposit */}
          <div className="card">
            <h3>📝 Catat Setoran Sampah (Langsung)</h3>
            <form onSubmit={handleLogDeposit} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Pilih Nasabah</label>
                <select 
                  className="form-control"
                  required
                  value={deposit.memberId}
                  onChange={(e) => setDeposit({ ...deposit, memberId: e.target.value })}
                >
                  <option value="">-- Pilih Nasabah --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Kategori Sampah</label>
                  <select 
                    className="form-control"
                    value={deposit.wasteType}
                    onChange={(e) => setDeposit({ ...deposit, wasteType: e.target.value })}
                  >
                    <option value="Plastik">Plastik (Rp 2.000/kg)</option>
                    <option value="Kertas">Kertas (Rp 1.500/kg)</option>
                    <option value="Logam">Logam (Rp 5.000/kg)</option>
                    <option value="Kaca">Kaca (Rp 1.000/kg)</option>
                    <option value="Organik">Organik (Rp 500/kg)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Berat Setoran (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.1" 
                    placeholder="0.0" 
                    className="form-control"
                    required
                    value={deposit.weight}
                    onChange={(e) => setDeposit({ ...deposit, weight: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <input 
                  type="text" 
                  placeholder="Kondisi bersih, dipisah per botol, dll" 
                  className="form-control"
                  value={deposit.notes}
                  onChange={(e) => setDeposit({ ...deposit, notes: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={depositLoading}>
                {depositLoading ? 'Menyimpan...' : 'Simpan Setoran Sampah'}
              </button>
            </form>
          </div>

          {/* Section: Register Member */}
          <div className="card" style={{ marginTop: '24px' }}>
            <h3>👥 Pendaftaran Nasabah Baru</h3>
            <form onSubmit={handleRegisterMember} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="Nama nasabah"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nomor Telepon (WhatsApp)</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  required
                  placeholder="Contoh: 0812xxxxxx"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Alamat Rumah</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Alamat lengkap"
                  value={newMember.address}
                  onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%' }} disabled={memberLoading}>
                {memberLoading ? 'Mendaftarkan...' : 'Daftarkan Nasabah'}
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Materials stock & Members list */}
        <div className="inventory-column">
          {/* Live Materials Stock */}
          <div className="card">
            <h3>🏭 Gudang Bahan Baku Daur Ulang</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Stok bahan baku terakumulasi yang siap dikonversi menjadi produk kerajinan daur ulang.
            </p>

            <div className="materials-list" style={{ marginTop: '20px' }}>
              {rawMaterials.map((mat) => (
                <div className="material-progress-item" key={mat.id}>
                  <div className="material-label flex-between">
                    <strong>{mat.waste_type}</strong>
                    <span>{mat.stock_kg.toFixed(1)} kg</span>
                  </div>
                  <div className="progress-bar-bg">
                    {/* Visual cap at 100kg for visualization */}
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${Math.min(100, (mat.stock_kg / 100) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members List */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="flex-between">
              <h3>👥 Data Saldo Nasabah</h3>
              <input 
                type="text" 
                placeholder="Cari nasabah..." 
                className="form-control search-input" 
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
              />
            </div>

            <div className="table-responsive" style={{ marginTop: '16px', maxHeight: '350px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Telepon</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center" style={{ color: 'var(--muted)' }}>
                        Nasabah tidak ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong>{m.name}</strong>
                          <br />
                          <small style={{ color: 'var(--muted)' }}>{m.address || 'Tanpa Alamat'}</small>
                        </td>
                        <td>{m.phone}</td>
                        <td>
                          <span className="badge badge-success">
                            Rp {new Intl.NumberFormat('id-ID').format(m.balance)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Confirm & Verify User Waste Deposits */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h3>⏳ Konfirmasi & Verifikasi Setoran Sampah Warga</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '20px' }}>
          Timbang fisik kiriman sampah warga di bawah ini, sesuaikan berat aktualnya, lalu klik Setujui untuk memproses poin/saldo masuk.
        </p>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Nasabah</th>
                <th>Kategori</th>
                <th>Berat Estimasi</th>
                <th>Berat Aktual (Fisik)</th>
                <th>Total Saldo</th>
                <th>Catatan Warga / Catatan Verifikasi</th>
                <th style={{ width: '220px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recentDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ color: 'var(--muted)', padding: '24px' }}>
                    Belum ada riwayat setoran sampah warga.
                  </td>
                </tr>
              ) : (
                recentDeposits.map((dep) => {
                  const isPending = dep.status === 'PENDING';
                  const rate = POINT_RATES[dep.waste_type] || 0;
                  const currentWeight = isPending
                    ? parseFloat(actualWeights[dep.id] || '0')
                    : dep.weight;
                  const currentTotal = isPending
                    ? Math.round((isNaN(currentWeight) ? 0 : currentWeight) * rate)
                    : dep.points;

                  return (
                    <tr key={dep.id}>
                      <td>{new Date(dep.deposit_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <strong>{dep.member_name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#1e40af', padding: '4px 8px', borderRadius: '4px' }}>
                          {dep.waste_type}
                        </span>
                      </td>
                      <td>{dep.weight} kg</td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input 
                              type="number" 
                              step="0.1"
                              className="form-control"
                              style={{ width: '80px', padding: '4px 8px', fontSize: '0.9rem' }}
                              value={actualWeights[dep.id] || ''}
                              onChange={(e) => setActualWeights({ ...actualWeights, [dep.id]: e.target.value })}
                            />
                            <span>kg</span>
                          </div>
                        ) : (
                          <span>{dep.weight} kg (verified)</span>
                        )}
                      </td>
                      <td>
                        <strong>Rp {new Intl.NumberFormat('id-ID').format(currentTotal)}</strong>
                        {isPending && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '2px' }}>
                            Estimasi: Rp {new Intl.NumberFormat('id-ID').format(dep.points)}
                          </div>
                        )}
                      </td>
                      <td>
                        {isPending ? (
                          <input 
                            type="text" 
                            className="form-control"
                            placeholder="Sesuaikan keterangan..."
                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                            value={notesUpdates[dep.id] || dep.notes || ''}
                            onChange={(e) => setNotesUpdates({ ...notesUpdates, [dep.id]: e.target.value })}
                          />
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{dep.notes || '-'}</span>
                        )}
                      </td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                              disabled={verifyLoading[dep.id]}
                              onClick={() => handleVerifyDeposit(dep.id, 'APPROVED')}
                            >
                              {verifyLoading[dep.id] ? '...' : '✓ Setujui'}
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              disabled={verifyLoading[dep.id]}
                              onClick={() => handleVerifyDeposit(dep.id, 'REJECTED')}
                            >
                              ✕ Tolak
                            </button>
                          </div>
                        ) : (
                          <span className={`status-badge-admin status-${dep.status.toLowerCase()}`}>
                            {dep.status === 'APPROVED' ? '✅ Sukses Terverifikasi' : '❌ Ditolak'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .success-banner {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid var(--success);
          color: #166534;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .error-banner {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          color: #991b1b;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .card {
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow);
        }
        .card h3 {
          font-size: 1.25rem;
          color: var(--foreground);
        }
        
        /* Progress Meters */
        .materials-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .material-progress-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .material-label {
          font-size: 0.9rem;
        }
        .progress-bar-bg {
          height: 10px;
          background-color: var(--muted-bg);
          border-radius: 5px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background-color: var(--primary);
          border-radius: 5px;
          transition: width 0.4s ease-out;
        }
        
        .search-input {
          max-width: 180px;
          padding: 6px 12px;
          font-size: 0.85rem;
        }

        .status-badge-admin {
          font-weight: 700;
          font-size: 0.82rem;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .status-approved {
          background-color: rgba(34, 197, 94, 0.1);
          color: #166534;
        }
        .status-rejected {
          background-color: rgba(239, 68, 68, 0.1);
          color: #991b1b;
        }
      `}</style>
    </div>
  );
}
