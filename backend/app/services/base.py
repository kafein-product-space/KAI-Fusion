from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql.expression import func
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseService(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        """
        Base service class that other services can inherit from.

        :param model: The SQLAlchemy model.
        """
        self.model = model

    async def get_all(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """
        Get all records.
        """
        result = await db.execute(select(self.model).offset(skip).limit(limit))
        return result.scalars().all()

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        """
        Get a single record by ID.
        """
        result = await db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()

    async def create(
        self, db: AsyncSession, *, obj_in: CreateSchemaType
    ) -> ModelType:
        """
        Create a new record.
        """
        obj_in_data = obj_in.model_dump()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
    ) -> ModelType:
        """
        Update a record.
        """
        obj_data = db_obj.as_dict()
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: int) -> ModelType:
        """
        Delete a record.
        """
        obj = await self.get(db, id)
        await db.delete(obj)
        await db.commit()
        return obj 