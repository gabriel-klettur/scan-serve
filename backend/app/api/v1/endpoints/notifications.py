"""
Email notification endpoints for batch processing completion.
"""
from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class NotificationRequest(BaseModel):
    """Request model for sending notifications."""
    email: EmailStr
    notification_type: Literal["per-image", "all-complete"]
    receipt_count: int = 1
    receipt_name: str | None = None
    success_count: int | None = None
    error_count: int | None = None


class NotificationResponse(BaseModel):
    """Response model for notification requests."""
    success: bool
    message: str


async def send_email_notification(
    email: str,
    notification_type: str,
    receipt_count: int,
    receipt_name: str | None,
    success_count: int | None,
    error_count: int | None,
) -> None:
    """
    Send email notification (placeholder implementation).
    
    In production, this would integrate with an email service like:
    - SendGrid
    - AWS SES
    - Mailgun
    - SMTP server
    """
    logger.info(
        "Email notification requested",
        extra={
            "email": email,
            "type": notification_type,
            "receipt_count": receipt_count,
            "receipt_name": receipt_name,
            "success_count": success_count,
            "error_count": error_count,
        },
    )
    
    # TODO: Implement actual email sending
    # Example with SendGrid:
    # from sendgrid import SendGridAPIClient
    # from sendgrid.helpers.mail import Mail
    # 
    # message = Mail(
    #     from_email='noreply@receiptvision.app',
    #     to_emails=email,
    #     subject=f'Receipt Processing Complete - {receipt_count} receipts',
    #     html_content=f'<p>Your receipts have been processed...</p>'
    # )
    # sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    # sg.send(message)


@router.post("/notify", response_model=NotificationResponse)
async def send_notification(
    request: NotificationRequest,
    background_tasks: BackgroundTasks,
) -> NotificationResponse:
    """
    Queue an email notification for receipt processing.
    
    This endpoint accepts notification requests and processes them
    asynchronously to avoid blocking the main request.
    """
    try:
        background_tasks.add_task(
            send_email_notification,
            email=request.email,
            notification_type=request.notification_type,
            receipt_count=request.receipt_count,
            receipt_name=request.receipt_name,
            success_count=request.success_count,
            error_count=request.error_count,
        )
        
        return NotificationResponse(
            success=True,
            message=f"Notification queued for {request.email}",
        )
    except Exception as e:
        logger.error("Failed to queue notification", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail="Failed to queue notification",
        ) from e


@router.post("/notify/batch-complete", response_model=NotificationResponse)
async def notify_batch_complete(
    email: EmailStr,
    total_count: int,
    success_count: int,
    error_count: int,
    background_tasks: BackgroundTasks,
) -> NotificationResponse:
    """
    Send a notification when batch processing completes.
    """
    background_tasks.add_task(
        send_email_notification,
        email=email,
        notification_type="all-complete",
        receipt_count=total_count,
        receipt_name=None,
        success_count=success_count,
        error_count=error_count,
    )
    
    return NotificationResponse(
        success=True,
        message=f"Batch completion notification queued for {email}",
    )
