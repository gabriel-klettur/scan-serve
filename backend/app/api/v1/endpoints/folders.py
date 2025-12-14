from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_receipts_service
from app.models.folders import CreateFolderRequest, ReceiptFolder, UpdateFolderRequest

router = APIRouter()


@router.get("", response_model=list[ReceiptFolder])
def list_folders(service=Depends(get_receipts_service)) -> list[ReceiptFolder]:
    return service.list_folders()


@router.post("", response_model=ReceiptFolder)
def create_folder(payload: CreateFolderRequest, service=Depends(get_receipts_service)) -> ReceiptFolder:
    return service.create_folder(payload.name)


@router.put("/{folder_id}", response_model=ReceiptFolder)
def update_folder(folder_id: str, payload: UpdateFolderRequest, service=Depends(get_receipts_service)) -> ReceiptFolder:
    try:
        return service.update_folder(folder_id, payload.name)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{folder_id}")
def delete_folder(folder_id: str, service=Depends(get_receipts_service)) -> dict[str, str]:
    service.delete_folder(folder_id)
    return {"status": "ok"}
