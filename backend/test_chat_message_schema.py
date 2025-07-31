#!/usr/bin/env python3
"""
Test script to verify chat_message table schema fix.
This script validates that the missing columns have been added successfully
and tests that the SQL insertion error is resolved.
"""

import asyncio
import sys
import os
import uuid
import logging
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Backend dizinini Python path'ine ekle
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.models.chat import ChatMessage
from app.models.user import User
from app.models.workflow import Workflow

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment variables
ASYNC_DATABASE_URL = os.getenv("ASYNC_DATABASE_URL")

class ChatMessageSchemaTest:
    """Chat message schema test sınıfı."""
    
    def __init__(self):
        self.engine = None
        
    async def initialize(self):
        """Database connection initialize eder."""
        if not ASYNC_DATABASE_URL:
            logger.error("ASYNC_DATABASE_URL environment variable is not set")
            return False
            
        try:
            self.engine = create_async_engine(
                ASYNC_DATABASE_URL,
                echo=False,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            logger.info("✅ Database connection initialized")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    async def test_schema_changes(self):
        """Schema değişikliklerini test eder."""
        try:
            async with self.engine.begin() as conn:
                # chat_message tablosunun sütunlarını kontrol et
                result = await conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'chat_message'
                    ORDER BY ordinal_position
                """))
                
                columns = result.fetchall()
                column_info = {row[0]: {'type': row[1], 'nullable': row[2], 'default': row[3]} for row in columns}
                
                logger.info("📋 chat_message table columns:")
                for col_name, info in column_info.items():
                    nullable_str = "NULL" if info['nullable'] == 'YES' else "NOT NULL"
                    logger.info(f"   {col_name}: {info['type']} {nullable_str}")
                
                # Required columns check
                required_columns = ['user_id', 'workflow_id']
                missing_columns = [col for col in required_columns if col not in column_info]
                
                if missing_columns:
                    logger.error(f"❌ Missing columns: {missing_columns}")
                    return False
                else:
                    logger.info("✅ All required columns present")
                
                # Check foreign key constraints
                fk_result = await conn.execute(text("""
                    SELECT 
                        tc.constraint_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND tc.table_name = 'chat_message'
                    AND kcu.column_name IN ('user_id', 'workflow_id')
                """))
                
                fk_constraints = result.fetchall()
                logger.info("🔗 Foreign key constraints:")
                for constraint in fk_constraints:
                    logger.info(f"   {constraint[1]} -> {constraint[2]}.{constraint[3]}")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Schema test failed: {e}")
            return False
    
    async def test_chat_message_insertion(self):
        """Chat message ekleme işlemini test eder."""
        try:
            async with self.engine.begin() as conn:
                # İlk önce bir test user'ı bulalım
                user_result = await conn.execute(text("SELECT id FROM users LIMIT 1"))
                user_row = user_result.fetchone()
                
                if not user_row:
                    logger.error("❌ No test user found in database")
                    return False
                
                test_user_id = user_row[0]
                logger.info(f"📋 Using test user_id: {test_user_id}")
                
                # Test workflow bul (optional)
                workflow_result = await conn.execute(text(f"SELECT id FROM workflows WHERE user_id = '{test_user_id}' LIMIT 1"))
                workflow_row = workflow_result.fetchone()
                test_workflow_id = workflow_row[0] if workflow_row else None
                
                if test_workflow_id:
                    logger.info(f"📋 Using test workflow_id: {test_workflow_id}")
                else:
                    logger.info("📋 No test workflow found, using NULL for workflow_id")
                
                # Chat message ekleme testi
                test_message_id = uuid.uuid4()
                test_chatflow_id = uuid.uuid4()
                
                insert_sql = """
                    INSERT INTO chat_message (
                        id, user_id, workflow_id, role, chatflow_id, content, created_at
                    ) VALUES (
                        :id, :user_id, :workflow_id, :role, :chatflow_id, :content, :created_at
                    )
                """
                
                await conn.execute(text(insert_sql), {
                    'id': test_message_id,
                    'user_id': test_user_id,
                    'workflow_id': test_workflow_id,
                    'role': 'user',
                    'chatflow_id': test_chatflow_id,
                    'content': 'Test message - schema validation',
                    'created_at': datetime.utcnow()
                })
                
                logger.info("✅ Chat message insertion successful")
                
                # Test mesajını sil
                await conn.execute(text("DELETE FROM chat_message WHERE id = :id"), {
                    'id': test_message_id
                })
                logger.info("✅ Test cleanup completed")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Chat message insertion test failed: {e}")
            return False
    
    async def run_tests(self):
        """Tüm testleri çalıştırır."""
        logger.info("🚀 Chat Message Schema Test Starting...")
        
        if not await self.initialize():
            return False
        
        # Schema test
        logger.info("\n" + "="*60)
        logger.info("📊 TESTING SCHEMA CHANGES")
        logger.info("="*60)
        
        if not await self.test_schema_changes():
            return False
        
        # Insertion test
        logger.info("\n" + "="*60)
        logger.info("📊 TESTING CHAT MESSAGE INSERTION")
        logger.info("="*60)
        
        if not await self.test_chat_message_insertion():
            return False
        
        logger.info("\n🎉 All tests passed successfully!")
        return True

async def main():
    test = ChatMessageSchemaTest()
    success = await test.run_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())