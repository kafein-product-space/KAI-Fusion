#!/usr/bin/env python3
"""
KAI-Fusion Database Setup Script
================================

Bu script, KAI-Fusion platformu için veritabanını oluşturur ve günceller.
Mevcut tabloları kontrol eder ve eksik olanları oluşturur.

Kullanım:
    python database_setup.py [--force] [--check-only] [--drop-all]

Parametreler:
    --force: Mevcut tabloları silip yeniden oluşturur
    --check-only: Sadece mevcut tabloları kontrol eder
    --drop-all: Tüm tabloları siler ve yeniden oluşturur
"""

import asyncio
import sys
import os
import argparse
import logging
from typing import List, Dict, Any
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Backend dizinini Python path'ine ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Logging konfigürasyonu
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('database_setup.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL")
CREATE_DATABASE = os.getenv("CREATE_DATABASE", "true").lower() in ("true", "1", "t")

class DatabaseSetup:
    """Veritabanı kurulum ve yönetim sınıfı."""
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        self.expected_tables = [
            "users",
            "user_credentials", 
            "workflows",
            "workflow_templates",
            "workflow_executions",
            "execution_checkpoints",
            "roles",
            "organization",
            "organization_user",
            "login_method",
            "login_activity",
            "chat_message",
            "variable",
            "memories",
            "node_configurations",
            "node_registry",
            "api_keys",
            "scheduled_jobs",
            "job_executions",
            "document_collections",
            "documents",
            "document_chunks",
            "document_access_logs",
            "document_versions",
            "webhook_endpoints",
            "webhook_events"
        ]
        
    async def initialize(self):
        """Veritabanı bağlantısını başlatır."""
        if not CREATE_DATABASE:
            logger.error("CREATE_DATABASE environment variable is not set to 'true'")
            return False
            
        if not ASYNC_DATABASE_URL:
            logger.error("ASYNC_DATABASE_URL environment variable is not set")
            return False
            
        try:
            # Async engine oluştur
            self.engine = create_async_engine(
                ASYNC_DATABASE_URL,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={
                    "server_settings": {"application_name": "kai-fusion-setup"},
                    "statement_cache_size": 1000,
                    "prepared_statement_cache_size": 100,
                    "command_timeout": 60,
                }
            )
            
            # Session factory oluştur
            self.session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            logger.info("✅ Veritabanı bağlantısı başarıyla kuruldu")
            return True
            
        except Exception as e:
            logger.error(f"❌ Veritabanı bağlantısı kurulamadı: {e}")
            return False
    
    async def check_connection(self) -> bool:
        """Veritabanı bağlantısını test eder."""
        if not self.engine:
            logger.error("Engine henüz başlatılmamış")
            return False
            
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(text("SELECT 1 as test"))
                row = result.fetchone()
                if row and row[0] == 1:
                    logger.info("✅ Veritabanı bağlantısı başarılı")
                    return True
                else:
                    logger.error("❌ Veritabanı bağlantı testi başarısız")
                    return False
        except Exception as e:
            logger.error(f"❌ Veritabanı bağlantı testi hatası: {e}")
            return False
    
    async def get_existing_tables(self) -> List[str]:
        """Mevcut tabloları listeler."""
        if not self.engine:
            return []
            
        try:
            async with self.engine.begin() as conn:
                # PostgreSQL için tablo listesi sorgusu - DISTINCT ile tekrarları önle
                result = await conn.execute(text("""
                    SELECT DISTINCT tablename 
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY tablename
                """))
                tables = [row[0] for row in result.fetchall()]
                
                # Tekrarlanan tabloları kontrol et
                if len(tables) != len(set(tables)):
                    logger.warning("⚠️ Tekrarlanan tablo isimleri tespit edildi!")
                    logger.warning(f"Ham liste: {tables}")
                    # Tekrarları kaldır
                    tables = list(dict.fromkeys(tables))  # Sırayı koruyarak tekrarları kaldır
                    logger.info(f"Tekrarlar kaldırıldı: {tables}")
                
                logger.info(f"📋 Mevcut tablolar: {', '.join(tables) if tables else 'Hiç tablo yok'}")
                return tables
        except Exception as e:
            logger.error(f"❌ Tablo listesi alınamadı: {e}")
            return []
    
    async def check_table_structure(self, table_name: str) -> Dict[str, Any]:
        """Belirli bir tablonun yapısını kontrol eder."""
        if not self.engine:
            return {"exists": False, "columns": []}
            
        try:
            async with self.engine.begin() as conn:
                # Tablo var mı kontrol et
                result = await conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = :table_name
                    )
                """), {"table_name": table_name})
                
                exists = result.fetchone()[0]
                
                if not exists:
                    return {"exists": False, "columns": []}
                
                # Tablo sütunlarını al
                result = await conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = :table_name
                    ORDER BY ordinal_position
                """), {"table_name": table_name})
                
                columns = [
                    {
                        "name": row[0],
                        "type": row[1],
                        "nullable": row[2] == "YES",
                        "default": row[3]
                    }
                    for row in result.fetchall()
                ]
                
                return {"exists": True, "columns": columns}
                
        except Exception as e:
            logger.error(f"❌ {table_name} tablosu yapısı kontrol edilemedi: {e}")
            return {"exists": False, "columns": []}
    
    async def create_tables(self, force: bool = False):
        """Tüm tabloları oluşturur."""
        if not self.engine:
            logger.error("Engine henüz başlatılmamış")
            return False
            
        try:
            # Model importları
            from app.models.base import Base
            from app.models import (
                User, UserCredential, Workflow, WorkflowTemplate,
                WorkflowExecution, ExecutionCheckpoint, Role, Organization,
                OrganizationUser, LoginMethod, LoginActivity, ChatMessage,
                Variable, Memory, NodeConfiguration, NodeRegistry,
                ScheduledJob, JobExecution,
                DocumentCollection, Document, DocumentChunk, DocumentAccessLog, DocumentVersion,
                WebhookEndpoint, WebhookEvent
            )
            
            # API Key modelini kontrol et
            try:
                from app.models.api_key import APIKey
                logger.info("✅ API Key modeli bulundu")
            except ImportError:
                logger.warning("⚠️ API Key modeli bulunamadı, atlanıyor")
            
            if force:
                logger.warning("⚠️ FORCE modu: Tüm tablolar silinecek ve yeniden oluşturulacak")
                async with self.engine.begin() as conn:
                    await conn.run_sync(Base.metadata.drop_all)
                logger.info("🗑️ Tüm tablolar silindi")
            
            # Tabloları oluştur
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            logger.info("✅ Tüm tablolar başarıyla oluşturuldu")
            return True
            
        except Exception as e:
            logger.error(f"❌ Tablo oluşturma hatası: {e}")
            return False
    
    async def drop_all_tables(self):
        """Tüm tabloları siler."""
        if not self.engine:
            logger.error("Engine henüz başlatılmamış")
            return False
            
        try:
            from app.models.base import Base
            
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            
            logger.info("🗑️ Tüm tablolar silindi")
            return True
            
        except Exception as e:
            logger.error(f"❌ Tablo silme hatası: {e}")
            return False
    
    async def validate_tables(self) -> Dict[str, Any]:
        """Tüm tabloları doğrular."""
        existing_tables = await self.get_existing_tables()
        
        validation_result = {
            "total_expected": len(self.expected_tables),
            "total_existing": len(existing_tables),
            "missing_tables": [],
            "existing_tables": existing_tables,
            "table_details": {}
        }
        
        # Eksik tabloları bul
        for table in self.expected_tables:
            if table not in existing_tables:
                validation_result["missing_tables"].append(table)
            else:
                # Tablo yapısını kontrol et
                structure = await self.check_table_structure(table)
                validation_result["table_details"][table] = structure
        
        return validation_result
    
    async def setup_database(self, force: bool = False, check_only: bool = False, drop_all: bool = False):
        """Ana veritabanı kurulum fonksiyonu."""
        logger.info("🚀 KAI-Fusion Veritabanı Kurulum Scripti Başlatılıyor...")
        
        # Başlatma
        if not await self.initialize():
            return False
        
        # Bağlantı testi
        if not await self.check_connection():
            return False
        
        # Sadece kontrol modu
        if check_only:
            logger.info("🔍 Sadece kontrol modu - tablolar oluşturulmayacak")
            validation = await self.validate_tables()
            self._print_validation_results(validation)
            return True
        
        # Tüm tabloları sil
        if drop_all:
            logger.warning("⚠️ DROP_ALL modu: Tüm tablolar silinecek!")
            if not await self.drop_all_tables():
                return False
        
        # Mevcut durumu kontrol et
        validation = await self.validate_tables()
        self._print_validation_results(validation)
        
        # Eksik tablolar varsa oluştur
        if validation["missing_tables"] or force:
            if validation["missing_tables"]:
                logger.info(f"📝 Eksik tablolar oluşturuluyor: {', '.join(validation['missing_tables'])}")
            
            if not await self.create_tables(force=force):
                return False
            
            # Oluşturma sonrası kontrol
            logger.info("🔍 Tablo oluşturma sonrası kontrol...")
            post_validation = await self.validate_tables()
            self._print_validation_results(post_validation)
            
            if post_validation["missing_tables"]:
                logger.error(f"❌ Hala eksik tablolar var: {', '.join(post_validation['missing_tables'])}")
                return False
            else:
                logger.info("✅ Tüm tablolar başarıyla oluşturuldu ve doğrulandı")
        else:
            logger.info("✅ Tüm tablolar zaten mevcut")
        
        return True
    
    def _print_validation_results(self, validation: Dict[str, Any]):
        """Doğrulama sonuçlarını yazdırır."""
        logger.info("=" * 60)
        logger.info("📊 VERİTABANI DURUM RAPORU")
        logger.info("=" * 60)
        logger.info(f"Beklenen tablo sayısı: {validation['total_expected']}")
        logger.info(f"Mevcut tablo sayısı: {validation['total_existing']}")
        
        if validation["missing_tables"]:
            logger.warning(f"❌ Eksik tablolar ({len(validation['missing_tables'])}):")
            for table in validation["missing_tables"]:
                logger.warning(f"   - {table}")
        else:
            logger.info("✅ Tüm beklenen tablolar mevcut")
        
        # Mevcut tabloları düzenli şekilde göster
        if validation['existing_tables']:
            logger.info("📋 Mevcut tablolar:")
            # Tabloları alfabetik sıraya göre grupla
            sorted_tables = sorted(validation['existing_tables'])
            for i, table in enumerate(sorted_tables, 1):
                logger.info(f"   {i:2d}. {table}")
        else:
            logger.info("📋 Mevcut tablo yok")
        
        logger.info("=" * 60)

async def main():
    """Ana fonksiyon."""
    parser = argparse.ArgumentParser(description="KAI-Fusion Veritabanı Kurulum Scripti")
    parser.add_argument("--force", action="store_true", help="Mevcut tabloları silip yeniden oluşturur")
    parser.add_argument("--check-only", action="store_true", help="Sadece mevcut tabloları kontrol eder")
    parser.add_argument("--drop-all", action="store_true", help="Tüm tabloları siler ve yeniden oluşturur")
    
    args = parser.parse_args()
    
    # Environment kontrolü
    if not CREATE_DATABASE:
        logger.error("❌ CREATE_DATABASE environment variable 'true' olarak ayarlanmamış")
        logger.info("💡 Çözüm: export CREATE_DATABASE=true")
        sys.exit(1)
    
    if not ASYNC_DATABASE_URL:
        logger.error("❌ ASYNC_DATABASE_URL environment variable ayarlanmamış")
        logger.info("💡 Çözüm: export ASYNC_DATABASE_URL='your_database_url'")
        sys.exit(1)
    
    # Database setup başlat
    db_setup = DatabaseSetup()
    
    try:
        success = await db_setup.setup_database(
            force=args.force,
            check_only=args.check_only,
            drop_all=args.drop_all
        )
        
        if success:
            logger.info("🎉 Veritabanı kurulumu başarıyla tamamlandı!")
            sys.exit(0)
        else:
            logger.error("❌ Veritabanı kurulumu başarısız!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("⏹️ Kullanıcı tarafından durduruldu")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Beklenmeyen hata: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 