# Unsaved Changes Feature

Bu özellik, kullanıcıların canvas ekranında yaptıkları değişiklikleri kaydetmeden sayfadan ayrılmaya çalıştıklarında uyarı almalarını sağlar.

## Özellikler

### 1. Modal Uyarısı
- Kullanıcı kaydedilmemiş değişikliklerle sayfadan ayrılmaya çalıştığında modal açılır
- Modal'da 3 seçenek sunulur:
  - **Kaydet**: Değişiklikleri kaydeder ve sayfadan ayrılır
  - **Değişiklikleri Sil**: Değişiklikleri siler ve sayfadan ayrılır
  - **İptal**: Modal'ı kapatır ve sayfada kalır

### 2. Browser Navigation Koruması
- Browser'ın geri/ileri butonları için koruma
- Sayfa yenileme (F5) için koruma
- Tab kapatma için koruma

### 3. Gerçek Zamanlı Değişiklik Takibi
- Node'ların eklenmesi/çıkarılması
- Edge'lerin eklenmesi/çıkarılması
- Node konumlarının değiştirilmesi
- Node konfigürasyonlarının değiştirilmesi

## Teknik Detaylar

### Bileşenler

#### 1. UnsavedChangesModal
- **Dosya**: `client/app/components/modals/UnsavedChangesModal.tsx`
- Modal dialog bileşeni
- Türkçe arayüz
- Modern tasarım

#### 2. FlowCanvas Güncellemeleri
- **Dosya**: `client/app/components/canvas/FlowCanvas.tsx`
- `hasUnsavedChanges` state takibi
- `beforeunload` event handler
- Modal ref ve handler fonksiyonları

#### 3. Navbar Güncellemeleri
- **Dosya**: `client/app/components/common/Navbar.tsx`
- `checkUnsavedChanges` prop'u eklendi
- Geri butonu için unsaved changes kontrolü

### State Yönetimi

```typescript
// Workflow store'unda
hasUnsavedChanges: boolean
setHasUnsavedChanges: (hasChanges: boolean) => void

// FlowCanvas'ta
const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
const unsavedChangesModalRef = useRef<HTMLDialogElement>(null);
```

### Event Handlers

```typescript
// Browser navigation koruması
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

## Kullanım Senaryoları

### Senaryo 1: Normal Kaydetme
1. Kullanıcı canvas'ta değişiklik yapar
2. Save butonuna tıklar
3. Değişiklikler kaydedilir
4. `hasUnsavedChanges` false olur

### Senaryo 2: Unsaved Changes ile Navigation
1. Kullanıcı canvas'ta değişiklik yapar
2. Geri butonuna tıklar
3. Modal açılır
4. Kullanıcı "Kaydet" seçer
5. Değişiklikler kaydedilir ve sayfa değişir

### Senaryo 3: Değişiklikleri Silme
1. Kullanıcı canvas'ta değişiklik yapar
2. Geri butonuna tıklar
3. Modal açılır
4. Kullanıcı "Değişiklikleri Sil" seçer
5. Değişiklikler silinir ve sayfa değişir

## Test Etme

1. Canvas sayfasına git
2. Bir node ekle veya mevcut bir node'u taşı
3. Geri butonuna tıkla
4. Modal'ın açıldığını gör
5. Farklı seçenekleri test et

## Gelecek Geliştirmeler

- [ ] Keyboard shortcuts (Ctrl+S, Ctrl+Z)
- [ ] Auto-save özelliği
- [ ] Daha detaylı değişiklik takibi
- [ ] Undo/Redo özelliği
- [ ] Session storage ile geçici kaydetme 