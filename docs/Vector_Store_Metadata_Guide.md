# Vector Store Metadata Kullanım Kılavuzu

Bu kılavuz, KAI-Fusion platformunda vector store'ları kullanırken metadata'yı nasıl kullanacağınızı, ekleyeceğinizi ve yöneteceğinizi açıklar.

## 📊 Metadata Nedir?

Metadata, dokümanlarınızla birlikte saklanan ek bilgilerdir. Bu bilgiler:
- Dökümanın kaynağı
- Kategori bilgileri  
- Tarih/zaman bilgileri
- Özel etiketler
- Filtreleme için kullanılan alanlar

## 🔧 VectorStoreOrchestrator ile Metadata

### 1. Temel Metadata Ekleme

```json
{
  "custom_metadata": {
    "source": "amazon_catalog",
    "category": "electronics", 
    "department": "mobile_phones",
    "version": "2024-q4",
    "language": "tr",
    "processed_date": "2024-08-06"
  }
}
```

### 2. Metadata Stratejileri

#### a) **Merge (Birleştirme)** - Varsayılan
```json
{
  "metadata_strategy": "merge",
  "preserve_document_metadata": true,
  "custom_metadata": {
    "project": "kai-fusion",
    "env": "production"
  }
}
```
- Döküman metadata'sı korunur
- Custom metadata eklenir
- Çakışma durumunda custom metadata öncelikli

#### b) **Replace (Değiştirme)**
```json
{
  "metadata_strategy": "replace", 
  "custom_metadata": {
    "source": "clean_data",
    "category": "manual_override"
  }
}
```
- Sadece custom metadata kullanılır
- Döküman metadata'sı yok sayılır

#### c) **Document Only (Sadece Döküman)**
```json
{
  "metadata_strategy": "document_only"
}
```
- Sadece döküman metadata'sı korunur
- Custom metadata yok sayılır

## 🏷️ Metadata Örnekleri

### E-ticaret Ürün Kataloğu
```json
{
  "custom_metadata": {
    "source": "product_catalog",
    "category": "electronics",
    "subcategory": "smartphones", 
    "brand": "Samsung",
    "price_range": "high",
    "availability": "in_stock",
    "rating": 4.5,
    "created_by": "catalog_import",
    "last_updated": "2024-08-06T10:00:00Z"
  }
}
```

### Müşteri Destek Dökümanları
```json
{
  "custom_metadata": {
    "source": "support_docs",
    "document_type": "faq", 
    "department": "technical_support",
    "priority": "high",
    "language": "tr",
    "target_audience": ["beginners", "advanced"],
    "tags": ["troubleshooting", "installation", "configuration"],
    "version": "v2.1"
  }
}
```

### Hukuki Dökümanlar
```json
{
  "custom_metadata": {
    "source": "legal_documents",
    "document_type": "contract",
    "jurisdiction": "Turkey",
    "law_area": "commercial",
    "confidentiality": "high",
    "client": "acme_corp", 
    "date_created": "2024-01-15",
    "expiry_date": "2025-01-15",
    "status": "active"
  }
}
```

## 🔍 Metadata ile Filtreleme

### 1. Retriever Konfigürasyonu
```python
# Vector store'dan belirli metadata ile filtreleme
search_kwargs = {
    "k": 10,
    "filter": {
        "source": "product_catalog",
        "category": "electronics",
        "price_range": {"$in": ["medium", "high"]}
    }
}

retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)
```

### 2. Kompleks Filtreler
```python
# Çoklu koşul filtreleme
filter_conditions = {
    "department": "technical_support",
    "language": "tr",
    "priority": {"$in": ["high", "critical"]},
    "created_date": {"$gte": "2024-01-01"},
    "tags": {"$contains": "troubleshooting"}
}
```

## 📋 Metadata Best Practices

### 1. **Tutarlı Alan Adları**
```json
// ✅ Doğru
{
  "source": "catalog",
  "category": "electronics", 
  "created_date": "2024-08-06"
}

// ❌ Yanlış (tutarsız naming)
{
  "Source": "catalog",
  "Category": "electronics",
  "createdDate": "2024-08-06"
}
```

### 2. **Standardize Değerler**
```json
// ✅ Doğru - kontrollü değerler
{
  "priority": "high",  // "high" | "medium" | "low"
  "status": "active",  // "active" | "archived" | "draft"
  "language": "tr"     // ISO codes
}

// ❌ Yanlış - serbest metin
{
  "priority": "Very Important",
  "status": "Currently Active", 
  "language": "Turkish"
}
```

### 3. **Hierarchical Metadata**
```json
{
  "source": {
    "system": "ecommerce",
    "module": "product_catalog", 
    "version": "v2.1"
  },
  "classification": {
    "category": "electronics",
    "subcategory": "mobile",
    "brand": "apple"
  },
  "timestamps": {
    "created": "2024-08-06T10:00:00Z",
    "modified": "2024-08-06T12:30:00Z",
    "indexed": "2024-08-06T13:00:00Z"
  }
}
```

## 🚀 Workflow Entegrasyonu

### 1. Document Loader + Metadata
```json
{
  "nodes": [
    {
      "id": "doc_loader",
      "type": "DocumentLoader",
      "data": {
        "source": "web_scraping",
        "metadata_extraction": true
      }
    },
    {
      "id": "vector_store", 
      "type": "VectorStoreOrchestrator",
      "data": {
        "custom_metadata": {
          "project": "web_knowledge_base",
          "scraped_date": "{{current_date}}",
          "batch_id": "{{batch_id}}"
        },
        "metadata_strategy": "merge"
      }
    }
  ]
}
```

### 2. Dynamic Metadata
```json
{
  "custom_metadata": {
    "source": "{{source_system}}",
    "processed_by": "{{user_id}}",
    "workflow_id": "{{workflow.id}}",
    "processing_date": "{{current_timestamp}}",
    "input_hash": "{{documents.hash}}"
  }
}
```

## 🎯 Performans Optimizasyonu

### 1. **Index Edilmiş Alanlar**
```sql
-- Metadata için GIN index (otomatik oluşturulur)
CREATE INDEX idx_metadata_gin ON langchain_pg_embedding USING gin (cmetadata);
```

### 2. **Sık Kullanılan Filtreler**
```json
{
  "frequent_filters": {
    "source": "Kaynak sistemi - çok sık filtrelenir",
    "category": "Kategori - arama daralması için",  
    "language": "Dil - uluslararası uygulamalar için",
    "status": "Durum - aktif/pasif filtreleme",
    "date_range": "Tarih - zaman bazlı filtreleme"
  }
}
```

### 3. **Metadata Boyutu Optimizasyonu**
```json
// ✅ Optimal - compact metadata
{
  "src": "cat",          // "source": "catalog"
  "cat": "elec",         // "category": "electronics" 
  "lang": "tr",          // "language": "tr"
  "prio": 1,             // "priority": "high" -> numeric
  "created": 1704067200  // Unix timestamp
}

// ❌ Büyük metadata
{
  "source_system_full_name": "Product Catalog Management System v2.1",
  "category_description": "Electronics and Digital Devices Category",
  "detailed_priority_explanation": "High priority document requiring immediate attention"
}
```

## 🔗 API Kullanımı

### 1. Metadata ile Arama
```python
from app.nodes.vector_stores import VectorStoreOrchestrator

# Vector store oluşturma
orchestrator = VectorStoreOrchestrator()
result = orchestrator.execute(
    inputs={
        "connection_string": "postgresql://...",
        "collection_name": "products",
        "custom_metadata": {
            "source": "api_import",
            "batch_id": "batch_001",
            "imported_at": datetime.now().isoformat()
        }
    },
    connected_nodes={
        "documents": documents,
        "embedder": embedder
    }
)

# Retriever ile metadata filtreleme
retriever = result["result"]
filtered_docs = retriever.get_relevant_documents(
    query="iPhone özellikleri",
    search_kwargs={
        "filter": {"source": "api_import", "category": "electronics"}
    }
)
```

### 2. Metadata İstatistikleri
```python
# Storage stats ile metadata analizi
stats = result["storage_stats"]
print(f"Stored documents: {stats['documents_stored']}")
print(f"Processing time: {stats['processing_time_seconds']}s")
```

## ⚡ Gerçek Dünya Örnekleri

### 1. **Multi-tenant Uygulama**
```json
{
  "custom_metadata": {
    "tenant_id": "company_123",
    "user_group": "sales_team", 
    "access_level": "internal",
    "data_classification": "confidential"
  }
}
```

### 2. **Versiyonlama**
```json
{
  "custom_metadata": {
    "document_version": "v1.2.3",
    "schema_version": "2024.1",
    "content_hash": "sha256:abc123...",
    "parent_document_id": "doc_456",
    "is_latest_version": true
  }
}
```

### 3. **A/B Testing**
```json
{
  "custom_metadata": {
    "experiment_id": "search_test_001",
    "variant": "B",
    "test_group": "power_users",
    "experiment_start": "2024-08-01",
    "success_metrics": ["click_rate", "conversion"]
  }
}
```

## 🛡️ Güvenlik Notları

### 1. **Hassas Bilgi**
```json
// ❌ Metadata'ya hassas bilgi koyma
{
  "user_password": "secret123",
  "credit_card": "1234-5678-9012-3456",
  "ssn": "123-45-6789"
}

// ✅ Güvenli metadata
{
  "user_id_hash": "sha256:abc...",
  "has_payment_info": true,
  "verification_status": "verified"
}
```

### 2. **Access Control**
```json
{
  "custom_metadata": {
    "visibility": "internal",
    "required_role": "analyst", 
    "security_clearance": "level_2",
    "data_owner": "marketing_dept"
  }
}
```

Bu kılavuz, KAI-Fusion vector store sisteminde metadata'yı etkin şekilde kullanmanız için gerekli tüm bilgileri sağlar. Metadata doğru kullanıldığında, arama performansını artırır ve veri yönetimini kolaylaştırır.