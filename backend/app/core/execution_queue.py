import asyncio
import uuid
from typing import Dict, Set, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ExecutionQueue:
    """
    Workflow execution'larını sıraya sokan sistem.
    Aynı workflow için aynı anda birden fazla execution çalışmasını önler.
    """
    
    def __init__(self):
        self._running_executions: Dict[str, Dict] = {}  # workflow_id -> execution_info
        self._pending_executions: Dict[str, asyncio.Queue] = {}  # workflow_id -> queue
        self._locks: Dict[str, asyncio.Lock] = {}  # workflow_id -> lock
        
    def _get_workflow_key(self, workflow_id: str, user_id: str) -> str:
        """Workflow için unique key oluştur"""
        return f"{workflow_id}:{user_id}"
    
    async def acquire_execution_slot(self, workflow_id: str, user_id: str, execution_id: str) -> bool:
        """
        Execution slot'u al. Eğer workflow zaten çalışıyorsa False döner.
        """
        key = self._get_workflow_key(workflow_id, user_id)
        
        # Lock oluştur (eğer yoksa)
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        
        async with self._locks[key]:
            # Eğer workflow zaten çalışıyorsa
            if key in self._running_executions:
                running_exec = self._running_executions[key]
                
                # Eğer execution 30 dakikadan eskiyse, temizle
                if datetime.now() - running_exec['started_at'] > timedelta(minutes=30):
                    logger.warning(f"Cleaning up stale execution for workflow {workflow_id}")
                    del self._running_executions[key]
                else:
                    logger.info(f"Workflow {workflow_id} is already running, queuing execution {execution_id}")
                    return False
            
            # Execution slot'u al
            self._running_executions[key] = {
                'execution_id': execution_id,
                'started_at': datetime.now(),
                'workflow_id': workflow_id,
                'user_id': user_id
            }
            
            logger.info(f"Acquired execution slot for workflow {workflow_id}, execution {execution_id}")
            return True
    
    async def release_execution_slot(self, workflow_id: str, user_id: str):
        """
        Execution slot'unu serbest bırak.
        """
        key = self._get_workflow_key(workflow_id, user_id)
        
        if key in self._locks:
            async with self._locks[key]:
                if key in self._running_executions:
                    execution_info = self._running_executions[key]
                    logger.info(f"Released execution slot for workflow {workflow_id}, execution {execution_info['execution_id']}")
                    del self._running_executions[key]
    
    async def wait_for_slot(self, workflow_id: str, user_id: str, timeout: int = 60) -> bool:
        """
        Execution slot'u için bekle. Timeout süresi içinde slot alınamazsa False döner.
        """
        start_time = datetime.now()
        
        while datetime.now() - start_time < timedelta(seconds=timeout):
            if await self.acquire_execution_slot(workflow_id, user_id, str(uuid.uuid4())):
                return True
            
            # 1 saniye bekle
            await asyncio.sleep(1)
        
        logger.warning(f"Timeout waiting for execution slot for workflow {workflow_id}")
        return False
    
    def get_running_executions(self) -> Dict[str, Dict]:
        """Şu anda çalışan execution'ları döndür"""
        return self._running_executions.copy()
    
    def cleanup_stale_executions(self):
        """30 dakikadan eski execution'ları temizle"""
        now = datetime.now()
        stale_keys = []
        
        for key, execution_info in self._running_executions.items():
            if now - execution_info['started_at'] > timedelta(minutes=30):
                stale_keys.append(key)
        
        for key in stale_keys:
            logger.warning(f"Cleaning up stale execution: {self._running_executions[key]}")
            del self._running_executions[key]

# Global execution queue instance
execution_queue = ExecutionQueue() 