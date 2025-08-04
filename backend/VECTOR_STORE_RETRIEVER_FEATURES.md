# KAI-Fusion Vector Store & Retriever - Yeni UI Özellikleri

## 📋 Genel Bakış

VectorStoreOrchestrator ve RetrieverProvider nodelarına manuel metadata kontrolü ve veri izolasyonu özellikleri eklendi. Bu özellikler frontend'de kullanıcıya sunulmalıdır.

---

## 🎯 VectorStoreOrchestrator - Yeni UI Özellikleri

### **1. Zorunlu Collection Name**
```typescript
{
  name: "collection_name",
  type: "text",
  required: true,  // ÖNEMLİ: Artık zorunlu
  label: "Collection Name",
  placeholder: "e.g., amazon_products, user_manuals, company_docs",
  description: "Vector collection name - separates different datasets (REQUIRED for data isolation)",
  validation: {
    required: true,
    minLength: 1
  }
}
```

### **2. Table Prefix (Yeni)**
```typescript
{
  name: "table_prefix",
  type: "text",
  required: false,
  label: "Table Prefix (Optional)",
  placeholder: "e.g., project1_, client_a_",
  description: "Custom table prefix for complete database isolation (optional)",
  helpText: "Use different prefixes to completely separate data for different clients/projects"
}
```

### **3. Custom Metadata (Yeni)**
```typescript
{
  name: "custom_metadata",
  type: "json", // JSON editor komponenti
  required: false,
  label: "Custom Metadata",
  placeholder: '{"source": "amazon_catalog", "category": "electronics", "version": "2024"}',
  description: "Custom metadata to add to all documents (JSON format)",
  defaultValue: "{}",
  validation: {
    isValidJSON: true
  }
}
```

### **4. Preserve Document Metadata (Yeni)**
```typescript
{
  name: "preserve_document_metadata",
  type: "boolean",
  required: false,
  label: "Preserve Document Metadata",
  description: "Keep original document metadata alongside custom metadata",
  defaultValue: true
}
```

### **5. Metadata Strategy (Yeni)**
```typescript
{
  name: "metadata_strategy",
  type: "select",
  required: false,
  label: "Metadata Strategy",
  description: "How to handle metadata conflicts",
  defaultValue: "merge",
  options: [
    {
      value: "merge",
      label: "Merge (custom overrides document)",
      description: "Combine both, custom metadata takes priority"
    },
    {
      value: "replace", 
      label: "Replace (only custom metadata)",
      description: "Use only custom metadata, ignore document metadata"
    },
    {
      value: "document_only",
      label: "Document Only", 
      description: "Use only document metadata, ignore custom metadata"
    }
  ]
}
```

---

## 🔍 RetrieverProvider - Yeni UI Özellikleri

### **1. Enable Metadata Filtering (Yeni)**
```typescript
{
  name: "enable_metadata_filtering",
  type: "boolean",
  required: false,
  label: "Enable Metadata Filtering",
  description: "Enable metadata-based filtering for search results",
  defaultValue: false
}
```

### **2. Metadata Filter (Yeni)**
```typescript
{
  name: "metadata_filter",
  type: "json", // JSON editor komponenti
  required: false,
  label: "Metadata Filter",
  placeholder: '{"data_type": "products", "category": "electronics"}',
  description: "Filter documents by metadata (JSON format)",
  defaultValue: "{}",
  dependsOn: "enable_metadata_filtering", // Sadece filtering enabled ise göster
  validation: {
    isValidJSON: true
  }
}
```

### **3. Filter Strategy (Yeni)**
```typescript
{
  name: "filter_strategy",
  type: "select",
  required: false,
  label: "Filter Strategy",
  description: "How to apply metadata filters",
  defaultValue: "exact",
  dependsOn: "enable_metadata_filtering", // Sadece filtering enabled ise göster
  options: [
    {
      value: "exact",
      label: "Exact Match",
      description: "All filter conditions must match exactly"
    },
    {
      value: "contains",
      label: "Contains",
      description: "Metadata must contain filter values (useful for arrays)"
    },
    {
      value: "or",
      label: "Any Match (OR)",
      description: "At least one filter condition must match"
    }
  ]
}
```

---

## 🎨 UI/UX Önerileri

### **VectorStoreOrchestrator UI Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Data Configuration                                   │
├─────────────────────────────────────────────────────────┤
│ Collection Name *          [text input]                 │
│ Table Prefix (Optional)    [text input]                 │
│                                                         │
│ 🏷️ Metadata Configuration                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Custom Metadata (JSON)                              │ │
│ │ {                                                   │ │
│ │   "source": "amazon_api",                          │ │
│ │   "category": "electronics"                        │ │
│ │ }                                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ☑️ Preserve Document Metadata                           │
│ Metadata Strategy          [dropdown: Merge ▼]         │
└─────────────────────────────────────────────────────────┘
```

### **RetrieverProvider UI Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search Configuration                                 │
├─────────────────────────────────────────────────────────┤
│ Search K                   [6        ]                  │
│ Score Threshold            [0.0      ]                  │
│                                                         │
│ 🏷️ Metadata Filtering                                   │
│ ☑️ Enable Metadata Filtering                            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Metadata Filter (JSON)                              │ │
│ │ {                                                   │ │
│ │   "data_type": "products",                         │ │
│ │   "category": "electronics"                        │ │
│ │ }                                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Filter Strategy            [dropdown: Exact Match ▼]   │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Kullanıcı Senaryoları ve UI Davranışları

### **Senaryo 1: İlk Defa Embedding**
```typescript
// UI durumu:
collection_name: "amazon_products" // Zorunlu, kırmızı border eğer boş
table_prefix: ""                  // Opsiyonel
custom_metadata: {
  "source": "amazon_api",
  "data_type": "products"
}
metadata_strategy: "merge"
```

### **Senaryo 2: Aynı Collection'a Ekleme**
```typescript
// UI'da kullanıcıya uyarı göster:
collection_name: "amazon_products" // Aynı isim
pre_delete_collection: false       // ÖNEMLİ: false olmalı
custom_metadata: {
  "source": "customer_reviews",
  "data_type": "reviews"           // Farklı metadata
}
```

### **Senaryo 3: Metadata Filtering**
```typescript
// RetrieverProvider'da:
enable_metadata_filtering: true
metadata_filter: {
  "data_type": "products"          // Sadece ürün verilerini ara
}
filter_strategy: "exact"
```

---

## ⚠️ Önemli UI Validasyonları

### **VectorStoreOrchestrator:**
1. **Collection Name** boş olamaz (required validation)
2. **Custom Metadata** valid JSON olmalı
3. **Table Prefix** sadece alfanumerik + "_" karakterleri
4. Eğer **pre_delete_collection = true** ise kullanıcıya uyarı göster

### **RetrieverProvider:**
1. **Metadata Filter** valid JSON olmalı
2. **Filter Strategy** sadece metadata filtering enabled ise göster
3. JSON editor'da syntax highlighting olmalı

---

## 🔧 JSON Editor Komponenti Özellikleri

```typescript
// JSON editor için gerekli özellikler:
interface JSONEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  validation?: {
    isValidJSON: boolean;
  };
  height?: number; // default: 120px
  syntaxHighlighting: true;
  autoFormat: true;
  errorHighlighting: true;
}
```

---

## 📊 Test Senaryoları UI İçin

### **Test 1: VectorStoreOrchestrator**
```json
{
  "collection_name": "test_products",
  "custom_metadata": {
    "source": "test_api",
    "category": "electronics"
  },
  "metadata_strategy": "merge"
}
```

### **Test 2: RetrieverProvider**
```json
{
  "enable_metadata_filtering": true,
  "metadata_filter": {
    "category": "electronics"
  },
  "filter_strategy": "exact"
}
```

---

## 🎯 Frontend Geliştirme Checklist

- [ ] VectorStoreOrchestrator'da collection_name required yapıldı
- [ ] Table prefix input eklendi
- [ ] Custom metadata JSON editor eklendi
- [ ] Metadata strategy dropdown eklendi
- [ ] Preserve document metadata checkbox eklendi
- [ ] RetrieverProvider'a metadata filtering toggle eklendi
- [ ] Metadata filter JSON editor eklendi
- [ ] Filter strategy dropdown eklendi
- [ ] JSON validation eklendi
- [ ] Conditional field visibility (dependsOn) eklendi
- [ ] Error handling ve user feedback eklendi
- [ ] Help text ve tooltips eklendi

---

## 🚀 Beklenen Sonuç

Bu özellikler eklendikten sonra kullanıcılar:

1. **Veri İzolasyonu**: Farklı projeler için tamamen ayrı tablolar oluşturabilecek
2. **Metadata Kontrolü**: Her dokümanın hangi etiketlerle saklanacağını belirleyebilecek  
3. **Akıllı Arama**: RAG sırasında sadece istenen veri tiplerini arayabilecek
4. **Esnek Filtreleme**: Exact, contains, or stratejileriyle esnek arama yapabilecek

**Sonuç:** Tek veritabanında çoklu proje desteği ve akıllı veri erişimi! 🎉