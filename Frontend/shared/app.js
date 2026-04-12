/* global window, document */

(function initMediChainApp() {
  const API_BASE = 'http://localhost:5001/api/v1';

  function getLocal(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  function setLocal(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* noop */ }
  }

  function shortAddr(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  function ensurePatientId(address) {
    const existing = getLocal('medichain_patient_id');
    if (existing) return existing;
    if (address) {
      const pid = '#MC-' + address.slice(2, 6).toUpperCase() + address.slice(-4).toUpperCase();
      setLocal('medichain_patient_id', pid);
      return pid;
    }
    const fallback = '#MC-' + Date.now().toString(36).toUpperCase().slice(-6);
    setLocal('medichain_patient_id', fallback);
    return fallback;
  }

  async function connectWallet() {
    if (!window.ethereum || !window.ethereum.request) {
      return null;
    }
    try {
      // Disconnect first to force MetaMask to show connection popup
      await window.ethereum.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }).catch(() => {});
    } catch { /* ignore revoke errors */ }
    
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts && accounts[0] ? accounts[0] : null;
    if (address) {
      setLocal('medichain_wallet', address);
      ensurePatientId(address);
      updateWalletButton();
      // Notify all pages that wallet has changed
      document.dispatchEvent(new Event('wallet-changed'));
    }
    return address;
  }

  function getWallet() {
    return getLocal('medichain_wallet');
  }

  function getPatientId() {
    const address = getWallet();
    return ensurePatientId(address);
  }

  function updateWalletButton() {
    const btn = document.querySelector('[data-wallet-btn]');
    if (!btn) return;
    const addr = getWallet();
    btn.textContent = addr ? shortAddr(addr) : 'Connect Wallet';
  }

  function setRole(role) {
    if (role) setLocal('medichain_role', role);
  }

  function disconnectWallet() {
    try {
      window.localStorage.removeItem('medichain_wallet');
      window.localStorage.removeItem('medichain_patient_id');
      window.localStorage.removeItem('medichain_role');
      window.localStorage.removeItem('medichain_last_profile_address');
    } catch { /* noop */ }
    updateWalletButton();
    // Notify all pages that wallet has changed
    document.dispatchEvent(new Event('wallet-changed'));
    return true;
  }

  window.MediChain = {
    API_BASE,
    connectWallet,
    getWallet,
    getPatientId,
    shortAddr,
    setRole,
    updateWalletButton,
    disconnectWallet
  };

  document.addEventListener('DOMContentLoaded', () => {
    updateWalletButton();
    const btn = document.querySelector('[data-wallet-btn]');
    if (btn) {
      btn.addEventListener('click', async () => {
        const addr = await connectWallet();
        if (addr) updateWalletButton();
      });
    }
    if (!window.ethereum) {
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      banner.style.top = '12px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.zIndex = '9999';
      banner.style.background = '#fff3cd';
      banner.style.color = '#7a5c00';
      banner.style.border = '1px solid #ffeeba';
      banner.style.padding = '10px 14px';
      banner.style.borderRadius = '999px';
      banner.style.fontSize = '12px';
      banner.style.fontWeight = '600';
      banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
      const protocol = window.location.protocol;
      const msg = protocol === 'file:'
        ? 'MetaMask is blocked on file://. Open via http://localhost:5000/landing_page/landingpage.html'
        : 'MetaMask not detected. Make sure the extension is enabled on this site.';
      banner.textContent = msg;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 12000);
    }
  });
})();
