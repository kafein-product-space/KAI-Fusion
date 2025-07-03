#!/usr/bin/env python3
"""
Database Connection Test Script
Tests PostgreSQL connection to Supabase database
"""
import psycopg2
from dotenv import load_dotenv
import os
import sys
from typing import Optional

# Load environment variables from .env
load_dotenv()

def test_database_connection():
    """Test database connection using environment variables"""
    
    print("🔍 Testing Supabase PostgreSQL Database Connection...")
    print("=" * 60)
    
    # Method 1: Using DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        print(f"📋 DATABASE_URL found: {database_url[:50]}...")
        try:
            connection = psycopg2.connect(database_url)
            print("✅ DATABASE_URL connection successful!")
            
            cursor = connection.cursor()
            cursor.execute("SELECT NOW(), version();")
            result = cursor.fetchone()
            
            if result:
                print(f"📅 Current Time: {result[0]}")
                print(f"🗄️  PostgreSQL Version: {result[1][:50]}...")
            
            # Test creating a simple table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS connection_test (
                    id SERIAL PRIMARY KEY,
                    test_timestamp TIMESTAMP DEFAULT NOW(),
                    message TEXT
                );
            """)
            
            # Insert test data
            cursor.execute(
                "INSERT INTO connection_test (message) VALUES (%s) RETURNING id;",
                ("Database connection test successful",)
            )
            result = cursor.fetchone()
            if result:
                test_id = result[0]
                print(f"✅ Test record created with ID: {test_id}")
                
                # Clean up test data
                cursor.execute("DELETE FROM connection_test WHERE id = %s;", (test_id,))
                connection.commit()
                print("🧹 Test data cleaned up")
            
            cursor.close()
            connection.close()
            print("✅ DATABASE_URL connection test completed successfully!")
            return True
            
        except Exception as e:
            print(f"❌ DATABASE_URL connection failed: {e}")
    
    # Method 2: Using individual parameters
    print("\n" + "=" * 60)
    print("🔍 Testing with individual database parameters...")
    
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")
    
    missing_params = []
    if not db_user:
        missing_params.append("DB_USER")
    if not db_password:
        missing_params.append("DB_PASSWORD")
    if not db_host:
        missing_params.append("DB_HOST")
    if not db_port:
        missing_params.append("DB_PORT")
    if not db_name:
        missing_params.append("DB_NAME")
    
    if missing_params:
        print(f"❌ Missing database parameters: {missing_params}")
        return False
    
    print(f"📋 Host: {db_host}")
    print(f"📋 Port: {db_port}")
    print(f"📋 Database: {db_name}")
    print(f"📋 User: {db_user}")
    
    try:
        connection = psycopg2.connect(
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
            dbname=db_name
        )
        print("✅ Individual parameters connection successful!")
        
        cursor = connection.cursor()
        cursor.execute("SELECT NOW();")
        result = cursor.fetchone()
        if result:
            print(f"📅 Current Time: {result[0]}")
        
        cursor.close()
        connection.close()
        print("✅ Individual parameters connection test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Individual parameters connection failed: {e}")
        return False

def test_supabase_client():
    """Test Supabase client connection"""
    print("\n" + "=" * 60)
    print("🔍 Testing Supabase Client Connection...")
    
    try:
        from supabase import create_client
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            print("❌ Missing SUPABASE_URL or SUPABASE_KEY")
            return False
        
        print(f"📋 Supabase URL: {supabase_url}")
        print(f"📋 Supabase Key: {supabase_key[:20]}...")
        
        client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client created successfully!")
        
        # Test a simple query (this might fail if no tables exist, which is OK)
        try:
            result = client.table('workflows').select('*').limit(1).execute()
            print(f"✅ Supabase query test successful! Tables accessible.")
        except Exception as e:
            print(f"ℹ️  Supabase query test: {e} (This is expected if tables don't exist yet)")
        
        return True
        
    except ImportError:
        print("❌ Supabase client not installed. Run: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Supabase client test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Database Connection Test Suite")
    print("=" * 60)
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("❌ No .env file found!")
        print("📝 Please create a .env file based on .env.example")
        sys.exit(1)
    
    print("✅ .env file found")
    
    # Run tests
    db_success = test_database_connection()
    supabase_success = test_supabase_client()
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"PostgreSQL Connection: {'✅ PASS' if db_success else '❌ FAIL'}")
    print(f"Supabase Client:       {'✅ PASS' if supabase_success else '❌ FAIL'}")
    
    if db_success and supabase_success:
        print("\n🎉 All database tests passed! Your database is ready.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Please check your database configuration.")
        sys.exit(1) 