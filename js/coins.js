// Coin ekonomi için basit mantık
// Tüm veriler localStorage'da saklanır

const STORAGE_KEY = 'apexGenesisProfile';

// Profil varsayılanı
const DEFAULT_PROFILE = {
    username: 'Oyuncu',
    avatar: '', // local avatar path or URL
    teamId: null,
    bio: '',
    coinBalance: 0,
    ownedItems: [], // ürün ID'leri
    joinDate: new Date().toISOString(),
    lastDailyBonusDate: null, // son günlük bonus alınan tarih (ISO string)
    lastMembershipBonusDate: null, // son üyelik bonusu eklenen tarih
    transactionHistory: [] // {type, amount, description, date}
};

// Internal: get profile from storage or default
function _getProfile() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Profil parse hatası', e);
            return DEFAULT_PROFILE;
        }
    }
    // Yoksa varsayılanı kaydet
    const profile = { ...DEFAULT_PROFILE };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return profile;
}

// Save profile to storage
function _saveProfile(profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

// Coin bakiyesini döner
function getCoinBalance() {
    return _getProfile().coinBalance;
}

// Coin ekler (kazanç)
function addCoin(amount, reason = '') {
    if (amount <= 0) return;
    const profile = _getProfile();
    profile.coinBalance += amount;
    profile.transactionHistory.unshift({
        type: 'earn',
        amount,
        description: reason || 'Kazanım',
        date: new Date().toISOString()
    });
    // Opsiyonel: sadece son 50 işlem tut
    if (profile.transactionHistory.length > 50) {
        profile.transactionHistory = profile.transactionHistory.slice(0, 50);
    }
    _saveProfile(profile);
    return profile.coinBalance;
}

// Coin harcar (alım)
function spendCoin(amount, reason = '') {
    if (amount <= 0) return false;
    const profile = _getProfile();
    if (profile.coinBalance < amount) {
        // Yetersiz bakiye
        return false;
    }
    profile.coinBalance -= amount;
    profile.transactionHistory.unshift({
        type: 'spend',
        amount,
        description: reason || 'Harçama',
        date: new Date().toISOString()
    });
    if (profile.transactionHistory.length > 50) {
        profile.transactionHistory = profile.transactionHistory.slice(0, 50);
    }
    _saveProfile(profile);
    return true;
}

// Profil bilgilerini günceller (username, bio, vb.)
function updateProfile(fields) {
    const profile = _getProfile();
    Object.assign(profile, fields);
    _saveProfile(profile);
    return profile;
}

// Sahip olan ürün ekler
function addOwnedItem(itemId) {
    const profile = _getProfile();
    if (!profile.ownedItems.includes(itemId)) {
        profile.ownedItems.push(itemId);
        _saveProfile(profile);
    }
}

// Sahip olan ürün kaldırır (iade vs.)
function removeOwnedItem(itemId) {
    const profile = _getProfile();
    profile.ownedItems = profile.ownedItems.filter(id => id !== itemId);
    _saveProfile(profile);
}

// Günlük bonus kontrolü ve ekleme
function checkAndAddDailyBonus() {
    const profile = _getProfile();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const lastDate = profile.lastDailyBonusDate ? new Date(profile.lastDailyBonusDate) : null;
    const lastDateString = lastDate ? lastDate.toISOString().split('T')[0] : null;
    if (lastDateString !== todayString) {
        // Günlük bonus ekle
        addCoin(10, 'Günlük giriş bonusu');
        profile.lastDailyBonusDate = today.toISOString(); // store full timestamp
        _saveProfile(profile);
        return true;
    }
    return false;
}

// Üyelik bonusu (katılım tarihinden beri her gün +2 coin)
function addMembershipBonus() {
    const profile = _getProfile();
    if (!profile.lastMembershipBonusDate) {
        profile.lastMembershipBonusDate = profile.joinDate;
        _saveProfile(profile);
    }
    const lastBonus = new Date(profile.lastMembershipBonusDate);
    const today = new Date();
    let daysDiff = Math.floor((today - lastBonus) / (1000 * 60 * 60 * 24));
    if (daysDiff > 0) {
        const bonusAmount = daysDiff * 2;
        addCoin(bonusAmount, 'Üyelik bonusu');
        profile.lastMembershipBonusDate = today.toISOString();
        _saveProfile(profile);
        return bonusAmount;
    }
    return 0;
}

// Tüm bonusları kontrol et ve uygula (uygulama başlangıcında çağrılmalıdır)
function applyAllBonuses() {
    const dailyAdded = checkAndAddDailyBonus();
    const membershipAdded = addMembershipBonus();
    return { dailyAdded, membershipAdded };
}

// Expose API to window (for renderer use)
if (typeof window !== 'undefined') {
    window.coinAPI = {
        getCoinBalance,
        addCoin,
        spendCoin,
        getProfile: _getProfile,
        updateProfile,
        addOwnedItem,
        removeOwnedItem,
        applyAllBonuses
    };
}