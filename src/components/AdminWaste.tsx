'use client';

import { useState, useEffect } from 'react';

export default function AdminWaste() {
  const [members, setMembers] = useState<any[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [searchMember, setSearchMember] = useState('');
  
  // Form States
  const [newMember, setNewMember] = useState({ name: '', phone: '', address: '' });
  const [deposit, setDeposit] = useState({ memberId: '', wasteType: 'Plastik', weight: '', notes: '' });
  
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
      if (data.success) setRecentDeposits(data.data);
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
        body: JSON.stringify(deposit),
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
            <h3>📝 Catat Setoran Sampah</h3>
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
      `}</style>
    </div>
  );
}
