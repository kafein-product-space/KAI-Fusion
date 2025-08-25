import base64
from app.models.variable import Variable
from app.services.base import BaseService
from app.core.encryption import encrypt_data, decrypt_data
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from app.schemas.variable import VariableCreate, VariableUpdate


class VariableService(BaseService[Variable]):
    def __init__(self):
        super().__init__(Variable)
    
    def _encrypt_value(self, value: str) -> str:
        """
        Encrypt a variable value and return as base64 string for database storage. 
        """
        try:
            encrypted_bytes = encrypt_data(value)
            return base64.b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            raise ValueError(f"Failed to encrypt value: {e}")
    
    def _decrypt_value(self, encrypted_value: str) -> str:
        """
        Decrypt a base64 encoded encrypted value from database.
        """
        try:
            encrypted_bytes = base64.b64decode(encrypted_value.encode('utf-8'))
            decrypted_data = decrypt_data(encrypted_bytes)
            # If decrypted_data is a dict with 'value' key, return that
            if isinstance(decrypted_data, dict) and 'value' in decrypted_data:
                return decrypted_data['value']
            # Otherwise, convert dict to string or return as-is
            return str(decrypted_data) if isinstance(decrypted_data, dict) else decrypted_data
        except Exception as e:
            raise ValueError(f"Failed to decrypt value: {e}")
    
    def _prepare_variable_response(self, variable: Variable) -> Variable:
        """
        Decrypt the variable value for API response.
        """
        if variable and variable.value:
            try:
                variable.value = self._decrypt_value(variable.value)
            except Exception:
                # If decryption fails, it might be an unencrypted legacy value
                # Keep as-is for backward compatibility
                pass
        return variable

    async def get(self, db: AsyncSession, id) -> Optional[Variable]:
        """
        Override base get method to decrypt value.
        """
        variable = await super().get(db, id)
        return self._prepare_variable_response(variable) if variable else None

    async def get_all(self, db: AsyncSession, *, skip: int = 0, limit: int = 100, user_id=None) -> List[Variable]:
        """
        Override base get_all method to decrypt values and filter by user.
        """
        if user_id:
            result = await db.execute(
                select(self.model)
                .filter_by(user_id=user_id)
                .offset(skip)
                .limit(limit)
            )
            variables = result.scalars().all()
        else:
            variables = await super().get_all(db, skip=skip, limit=limit)
        return [self._prepare_variable_response(var) for var in variables]

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Variable]:
        """
        Get a variable by its name.
        """
        result = await db.execute(select(self.model).filter_by(name=name))
        variable = result.scalars().first()
        return self._prepare_variable_response(variable) if variable else None

    async def get_by_name_and_user(self, db: AsyncSession, name: str, user_id) -> Optional[Variable]:
        """
        Get a variable by its name and user ID.
        """
        result = await db.execute(select(self.model).filter_by(name=name, user_id=user_id))
        variable = result.scalars().first()
        return self._prepare_variable_response(variable) if variable else None

    async def get_by_type(self, db: AsyncSession, type: str) -> List[Variable]:
        """
        Get all variables by their type.
        """
        result = await db.execute(select(self.model).filter_by(type=type))
        variables = result.scalars().all()
        return [self._prepare_variable_response(var) for var in variables]

    async def create_variable(self, db: AsyncSession, variable_data: VariableCreate, user_id) -> Variable:
        """
        Create a new variable with encrypted value.
        """
        encrypted_value = self._encrypt_value(variable_data.value)
        
        db_variable = Variable(
            name=variable_data.name,
            value=encrypted_value,
            type=variable_data.type,
            user_id=user_id
        )
        db.add(db_variable)
        await db.commit()
        await db.refresh(db_variable)
        
        # Return with decrypted value for API response
        return self._prepare_variable_response(db_variable)

    async def update_variable(self, db: AsyncSession, variable: Variable, update_data: VariableUpdate) -> Variable:
        """
        Update variable details with encryption for value updates.
        """
        if update_data.name is not None:
            variable.name = update_data.name
        if update_data.value is not None:
            variable.value = self._encrypt_value(update_data.value)
        if update_data.type is not None:
            variable.type = update_data.type
        
        db.add(variable)
        await db.commit()
        await db.refresh(variable)
        
        # Return with decrypted value for API response
        return self._prepare_variable_response(variable)

    async def delete_by_name(self, db: AsyncSession, name: str) -> Optional[Variable]:
        """
        Delete a variable by name.
        """
        # Get the variable first (this will also decrypt it for response)
        variable = await self.get_by_name(db, name)
        if variable:
            # Now get the raw variable from DB for deletion
            result = await db.execute(select(self.model).filter_by(name=name))
            db_variable = result.scalars().first()
            if db_variable:
                await db.delete(db_variable)
                await db.commit()
        return variable 