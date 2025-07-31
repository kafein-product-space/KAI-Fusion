#!/usr/bin/env python3
"""
Chat Message Table Column Migration Script
=========================================

This script adds the missing user_id and workflow_id columns to the chat_message table.
These columns are defined in the ChatMessage model but missing from the actual database table.

Missing Columns:
- user_id (UUID, NOT NULL, Foreign Key to users.id)
- workflow_id (UUID, NULLABLE, Foreign Key to workflows.id)

Usage:
    python add_chat_message_columns.py [--dry-run] [--force]

Parameters:
    --dry-run: Show what would be done without making changes
    --force: Apply changes even if columns already exist
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
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Logging konfigürasyonu
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('chat_message_migration.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL")
ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL")

class ChatMessageColumnMigration:
    """Chat message tablo sütun migrasyonu."""
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        
    async def initialize(self):
        """Veritabanı bağlantısını başlatır."""            
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
                    "server_settings": {"application_name": "kai-fusion-chat-migration"},
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
    
    async def check_table_exists(self) -> bool:
        """Chat message tablosunun varlığını kontrol eder."""
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'chat_message'
                    )
                """))
                
                exists = result.fetchone()[0]
                if exists:
                    logger.info("✅ chat_message tablosu mevcut")
                else:
                    logger.error("❌ chat_message tablosu bulunamadı")
                return exists
                
        except Exception as e:
            logger.error(f"❌ Tablo varlık kontrolü hatası: {e}")
            return False
    
    async def check_columns_exist(self) -> Dict[str, bool]:
        """Eksik sütunları kontrol eder."""
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'chat_message'
                    AND column_name IN ('user_id', 'workflow_id')
                """))
                
                existing_columns = [row[0] for row in result.fetchall()]
                
                column_status = {
                    'user_id': 'user_id' in existing_columns,
                    'workflow_id': 'workflow_id' in existing_columns
                }
                
                logger.info(f"📋 Sütun durumu: {column_status}")
                return column_status
                
        except Exception as e:
            logger.error(f"❌ Sütun kontrol hatası: {e}")
            return {'user_id': False, 'workflow_id': False}
    
    async def check_foreign_key_tables_exist(self) -> Dict[str, bool]:
        """Foreign key referans tablolarının varlığını kontrol eder."""
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('users', 'workflows')
                """))
                
                existing_tables = [row[0] for row in result.fetchall()]
                
                table_status = {
                    'users': 'users' in existing_tables,
                    'workflows': 'workflows' in existing_tables
                }
                
                logger.info(f"📋 Referans tablo durumu: {table_status}")
                return table_status
                
        except Exception as e:
            logger.error(f"❌ Referans tablo kontrol hatası: {e}")
            return {'users': False, 'workflows': False}
    
    async def get_chat_message_count(self) -> int:
        """Mevcut chat message kayıt sayısını döndürür."""
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(text("SELECT COUNT(*) FROM chat_message"))
                count = result.fetchone()[0]
                logger.info(f"📊 Mevcut chat_message kayıt sayısı: {count}")
                return count
        except Exception as e:
            logger.error(f"❌ Kayıt sayısı alma hatası: {e}")
            return 0
    
    async def add_user_id_column(self, dry_run: bool = False) -> bool:
        """user_id sütununu ekler."""
        try:
            # First, add the column as nullable
            add_column_sql = """
                ALTER TABLE chat_message 
                ADD COLUMN user_id UUID
            """
            
            # Add index
            add_index_sql = """
                CREATE INDEX idx_chat_message_user_id ON chat_message (user_id)
            """
            
            # Add foreign key constraint
            add_fk_sql = """
                ALTER TABLE chat_message 
                ADD CONSTRAINT fk_chat_message_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            """
            
            # Make column NOT NULL after setting default values
            set_not_null_sql = """
                ALTER TABLE chat_message 
                ALTER COLUMN user_id SET NOT NULL
            """
            
            if dry_run:
                logger.info("🔍 DRY RUN - user_id sütunu için çalıştırılacak SQL komutları:")
                logger.info(f"   1. {add_column_sql.strip()}")
                logger.info(f"   2. {add_index_sql.strip()}")
                logger.info(f"   3. {add_fk_sql.strip()}")
                logger.info(f"   4. {set_not_null_sql.strip()}")
                return True
            
            async with self.engine.begin() as conn:
                # Add column
                await conn.execute(text(add_column_sql))
                logger.info("✅ user_id sütunu eklendi")
                
                # NOTE: We need to populate this column with actual user IDs before making it NOT NULL
                # For now, we'll leave it nullable and log a warning
                logger.warning("⚠️ user_id sütunu NULL değerlerle eklendi")
                logger.warning("⚠️ Bu sütunu NOT NULL yapmadan önce mevcut kayıtları uygun user_id değerleriyle güncellemelisiniz")
                
                # Add index
                await conn.execute(text(add_index_sql))
                logger.info("✅ user_id index'i eklendi")
                
                # Add foreign key (but column remains nullable for now)
                await conn.execute(text(add_fk_sql))
                logger.info("✅ user_id foreign key constraint'i eklendi")
                
            return True
            
        except Exception as e:
            logger.error(f"❌ user_id sütunu ekleme hatası: {e}")
            return False
    
    async def add_workflow_id_column(self, dry_run: bool = False) -> bool:
        """workflow_id sütununu ekler."""
        try:
            # Add column (nullable)
            add_column_sql = """
                ALTER TABLE chat_message 
                ADD COLUMN workflow_id UUID
            """
            
            # Add index
            add_index_sql = """
                CREATE INDEX idx_chat_message_workflow_id ON chat_message (workflow_id)
            """
            
            # Add foreign key constraint
            add_fk_sql = """
                ALTER TABLE chat_message 
                ADD CONSTRAINT fk_chat_message_workflow_id 
                FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
            """
            
            if dry_run:
                logger.info("🔍 DRY RUN - workflow_id sütunu için çalıştırılacak SQL komutları:")
                logger.info(f"   1. {add_column_sql.strip()}")
                logger.info(f"   2. {add_index_sql.strip()}")
                logger.info(f"   3. {add_fk_sql.strip()}")
                return True
            
            async with self.engine.begin() as conn:
                # Add column
                await conn.execute(text(add_column_sql))
                logger.info("✅ workflow_id sütunu eklendi")
                
                # Add index
                await conn.execute(text(add_index_sql))
                logger.info("✅ workflow_id index'i eklendi")
                
                # Add foreign key
                await conn.execute(text(add_fk_sql))
                logger.info("✅ workflow_id foreign key constraint'i eklendi")
                
            return True
            
        except Exception as e:
            logger.error(f"❌ workflow_id sütunu ekleme hatası: {e}")
            return False
    
    async def run_migration(self, dry_run: bool = False, force: bool = False):
        """Ana migrasyon fonksiyonu."""
        logger.info("🚀 Chat Message Sütun Migrasyonu Başlatılıyor...")
        
        # Başlatma
        if not await self.initialize():
            return False
        
        # Bağlantı testi
        if not await self.check_connection():
            return False
        
        # Tablo varlığını kontrol et
        if not await self.check_table_exists():
            logger.error("❌ chat_message tablosu bulunamadı. Önce veritabanı kurulumunu çalıştırın.")
            return False
        
        # Referans tabloları kontrol et
        ref_tables = await self.check_foreign_key_tables_exist()
        if not ref_tables['users']:
            logger.error("❌ users tablosu bulunamadı. Foreign key eklenemez.")
            return False
        if not ref_tables['workflows']:
            logger.error("❌ workflows tablosu bulunamadı. Foreign key eklenemez.")
            return False
        
        # Mevcut kayıt sayısını al
        record_count = await self.get_chat_message_count()
        
        # Sütun durumunu kontrol et
        column_status = await self.check_columns_exist()
        
        missing_columns = []
        if not column_status['user_id']:
            missing_columns.append('user_id')
        if not column_status['workflow_id']:
            missing_columns.append('workflow_id')
        
        if not missing_columns and not force:
            logger.info("✅ Tüm gerekli sütunlar zaten mevcut")
            return True
        
        if force and not missing_columns:
            logger.warning("⚠️ FORCE modu: Sütunlar zaten mevcut ama tekrar ekleme denemesi yapılacak")
        
        logger.info("=" * 60)
        logger.info("📊 MİGRASYON DURUM RAPORU")
        logger.info("=" * 60)
        logger.info(f"Mevcut kayıt sayısı: {record_count}")
        logger.info(f"Eksik sütunlar: {missing_columns}")
        logger.info(f"DRY RUN modu: {'Aktif' if dry_run else 'Pasif'}")
        logger.info(f"FORCE modu: {'Aktif' if force else 'Pasif'}")
        logger.info("=" * 60)
        
        if record_count > 0:
            logger.warning("⚠️ DİKKAT: Tabloda mevcut kayıtlar var!")
            logger.warning("⚠️ user_id sütunu NOT NULL olduğu için mevcut kayıtları güncellemek gerekebilir")
        
        # Migrasyonu çalıştır
        success = True
        
        if 'user_id' in missing_columns or force:
            if not await self.add_user_id_column(dry_run=dry_run):
                success = False
        
        if 'workflow_id' in missing_columns or force:
            if not await self.add_workflow_id_column(dry_run=dry_run):
                success = False
        
        if success:
            if dry_run:
                logger.info("🔍 DRY RUN tamamlandı - değişiklik yapılmadı")
            else:
                logger.info("✅ Migrasyon başarıyla tamamlandı!")
                logger.warning("⚠️ ÖNEMLİ: user_id sütunu şu an NULL değerlerle eklendi")
                logger.warning("⚠️ Mevcut kayıtları uygun user_id değerleriyle güncelledikten sonra NOT NULL constraint'ini aktif etmelisiniz")
        else:
            logger.error("❌ Migrasyon başarısız!")
            
        return success

async def main():
    """Ana fonksiyon."""
    parser = argparse.ArgumentParser(description="Chat Message Sütun Migrasyonu")
    parser.add_argument("--dry-run", action="store_true", help="Değişiklikleri göster ama uygulama")
    parser.add_argument("--force", action="store_true", help="Sütunlar zaten varsa bile ekleme dene")
    
    args = parser.parse_args()
    
    # Environment kontrolü
    if not ASYNC_DATABASE_URL:
        logger.error("❌ ASYNC_DATABASE_URL environment variable ayarlanmamış")
        logger.info("💡 Çözüm: export ASYNC_DATABASE_URL='your_database_url'")
        sys.exit(1)
    
    # Migration başlat
    migration = ChatMessageColumnMigration()
    
    try:
        success = await migration.run_migration(
            dry_run=args.dry_run,
            force=args.force
        )
        
        if success:
            logger.info("🎉 Chat message sütun migrasyonu tamamlandı!")
            sys.exit(0)
        else:
            logger.error("❌ Chat message sütun migrasyonu başarısız!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("⏹️ Kullanıcı tarafından durduruldu")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Beklenmeyen hata: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())