"""
Log Certification Workflow Service
Handles the certification process for driver log sheets
"""

from typing import Dict, Any, List, Optional
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
from enum import Enum
import logging

from .models import LogEntry
from core_utils.models import AuditLog

logger = logging.getLogger(__name__)


class CertificationStatus(Enum):
    """Certification workflow statuses"""

    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CERTIFIED = "certified"


class CertificationWorkflow:
    """
    Manages the certification workflow for driver log sheets
    """

    def __init__(self, user: User):
        self.user = user

    def initiate_certification(self, log_ids: List[int], certification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate certification workflow for multiple log entries

        Args:
            log_ids: List of log entry IDs to certify
            certification_data: Certification metadata

        Returns:
            Dictionary with certification results
        """
        results = {
            "certification_id": None,
            "status": CertificationStatus.PENDING.value,
            "logs": [],
            "errors": [],
            "total_processed": len(log_ids),
            "success_count": 0,
            "error_count": 0,
        }

        try:
            with transaction.atomic():
                # Get log entries
                log_entries = LogEntry.objects.filter(id__in=log_ids, driver=self.user)

                if not log_entries.exists():
                    results["errors"].append({"error": "No log entries found for the provided IDs"})
                    return results

                # Validate logs for certification eligibility
                validation_result = self._validate_for_certification(log_entries)
                if not validation_result["is_eligible"]:
                    results["errors"].extend(validation_result["errors"])
                    return results

                # Create certification record
                certification_id = self._create_certification_record(log_entries, certification_data)
                results["certification_id"] = certification_id

                # Update log entries with certification status
                for log_entry in log_entries:
                    log_entry.certification_status = CertificationStatus.PENDING.value
                    log_entry.certification_id = certification_id
                    log_entry.save()

                    results["logs"].append(
                        {
                            "id": log_entry.id,
                            "start_time": log_entry.start_time,
                            "end_time": log_entry.end_time,
                            "location": log_entry.location,
                            "status": CertificationStatus.PENDING.value,
                        }
                    )
                    results["success_count"] += 1

                # Create audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="initiate_certification",
                    model_name="LogEntry",
                    object_id=str(certification_id),
                    description=f"Initiated certification for {len(log_entries)} log entries",
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Certification initiation error: {str(e)}")
            results["errors"].append({"error": str(e)})
            results["error_count"] = 1

        return results

    def review_certification(self, certification_id: str, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Review a certification request

        Args:
            certification_id: Certification ID to review
            review_data: Review metadata and decision

        Returns:
            Dictionary with review results
        """
        results = {
            "certification_id": certification_id,
            "status": None,
            "reviewer": review_data.get("reviewer", self.user.username),
            "review_notes": review_data.get("notes", ""),
            "errors": [],
        }

        try:
            with transaction.atomic():
                # Get log entries for this certification
                log_entries = LogEntry.objects.filter(certification_id=certification_id, driver=self.user)

                if not log_entries.exists():
                    results["errors"].append({"error": "No log entries found for certification ID"})
                    return results

                # Determine new status
                decision = review_data.get("decision", "approve")
                if decision == "approve":
                    new_status = CertificationStatus.APPROVED.value
                elif decision == "reject":
                    new_status = CertificationStatus.REJECTED.value
                else:
                    new_status = CertificationStatus.IN_REVIEW.value

                results["status"] = new_status

                # Update log entries
                for log_entry in log_entries:
                    log_entry.certification_status = new_status
                    log_entry.reviewed_at = timezone.now()
                    log_entry.reviewed_by = review_data.get("reviewer", self.user.username)
                    log_entry.review_notes = review_data.get("notes", "")

                    if new_status == CertificationStatus.APPROVED.value:
                        log_entry.is_certified = True
                        log_entry.certified_at = timezone.now()
                        log_entry.certified_by = review_data.get("reviewer", self.user.username)

                    log_entry.save()

                # Create audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="review_certification",
                    model_name="LogEntry",
                    object_id=str(certification_id),
                    description=f"Reviewed certification {certification_id}: {new_status}",
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Certification review error: {str(e)}")
            results["errors"].append({"error": str(e)})

        return results

    def finalize_certification(self, certification_id: str, finalization_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Finalize a certification after approval

        Args:
            certification_id: Certification ID to finalize
            finalization_data: Finalization metadata

        Returns:
            Dictionary with finalization results
        """
        results = {
            "certification_id": certification_id,
            "status": CertificationStatus.CERTIFIED.value,
            "finalized_at": timezone.now().isoformat(),
            "errors": [],
        }

        try:
            with transaction.atomic():
                # Get log entries for this certification
                log_entries = LogEntry.objects.filter(
                    certification_id=certification_id,
                    driver=self.user,
                    certification_status=CertificationStatus.APPROVED.value,
                )

                if not log_entries.exists():
                    results["errors"].append({"error": "No approved log entries found for certification ID"})
                    return results

                # Finalize certification
                for log_entry in log_entries:
                    log_entry.certification_status = CertificationStatus.CERTIFIED.value
                    log_entry.finalized_at = timezone.now()
                    log_entry.finalized_by = finalization_data.get("finalized_by", self.user.username)
                    log_entry.certification_notes = finalization_data.get("notes", "")
                    log_entry.save()

                # Create audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="finalize_certification",
                    model_name="LogEntry",
                    object_id=str(certification_id),
                    description=f"Finalized certification {certification_id}",
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Certification finalization error: {str(e)}")
            results["errors"].append({"error": str(e)})

        return results

    def get_certification_status(self, certification_id: str) -> Dict[str, Any]:
        """
        Get the current status of a certification

        Args:
            certification_id: Certification ID to check

        Returns:
            Dictionary with certification status information
        """
        try:
            log_entries = LogEntry.objects.filter(certification_id=certification_id, driver=self.user)

            if not log_entries.exists():
                return {"error": "Certification not found"}

            # Get status from first log entry (all should have same status)
            first_entry = log_entries.first()

            return {
                "certification_id": certification_id,
                "status": first_entry.certification_status,
                "total_logs": log_entries.count(),
                "certified_logs": log_entries.filter(is_certified=True).count(),
                "initiated_at": first_entry.created_at.isoformat() if hasattr(first_entry, "created_at") else None,
                "reviewed_at": first_entry.reviewed_at.isoformat() if first_entry.reviewed_at else None,
                "certified_at": first_entry.certified_at.isoformat() if first_entry.certified_at else None,
                "finalized_at": first_entry.finalized_at.isoformat() if first_entry.finalized_at else None,
                "reviewer": first_entry.reviewed_by,
                "certifier": first_entry.certified_by,
                "finalizer": first_entry.finalized_by,
                "notes": first_entry.certification_notes,
            }

        except Exception as e:
            logger.error(f"Get certification status error: {str(e)}")
            return {"error": str(e)}

    def get_user_certifications(self, status_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all certifications for the user

        Args:
            status_filter: Optional status filter

        Returns:
            Dictionary with user certifications
        """
        try:
            queryset = (
                LogEntry.objects.filter(driver=self.user, certification_id__isnull=False)
                .values("certification_id")
                .distinct()
            )

            if status_filter:
                queryset = queryset.filter(certification_status=status_filter)

            certifications = []
            for cert_id in queryset:
                cert_info = self.get_certification_status(cert_id["certification_id"])
                if "error" not in cert_info:
                    certifications.append(cert_info)

            return {
                "certifications": certifications,
                "total_count": len(certifications),
                "status_filter": status_filter,
            }

        except Exception as e:
            logger.error(f"Get user certifications error: {str(e)}")
            return {"error": str(e), "certifications": []}

    def _validate_for_certification(self, log_entries) -> Dict[str, Any]:
        """
        Validate log entries for certification eligibility

        Args:
            log_entries: QuerySet of log entries to validate

        Returns:
            Dictionary with validation results
        """
        errors = []

        # Check if logs are already certified
        certified_logs = log_entries.filter(is_certified=True)
        if certified_logs.exists():
            errors.append({"error": f"{certified_logs.count()} log entries are already certified"})

        # Check if logs are in pending certification
        pending_logs = log_entries.filter(certification_status=CertificationStatus.PENDING.value)
        if pending_logs.exists():
            errors.append({"error": f"{pending_logs.count()} log entries are already in certification process"})

        # Validate log completeness
        incomplete_logs = log_entries.filter(location__isnull=True).union(log_entries.filter(location=""))
        if incomplete_logs.exists():
            errors.append({"error": f"{incomplete_logs.count()} log entries have incomplete location information"})

        # Validate time ranges
        for log_entry in log_entries:
            if log_entry.end_time <= log_entry.start_time:
                errors.append({"error": f"Log entry {log_entry.id} has invalid time range"})

        return {"is_eligible": len(errors) == 0, "errors": errors}

    def _create_certification_record(self, log_entries, certification_data: Dict[str, Any]) -> str:
        """
        Create a certification record

        Args:
            log_entries: QuerySet of log entries
            certification_data: Certification metadata

        Returns:
            Certification ID
        """
        # Generate unique certification ID
        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        certification_id = f"CERT_{self.user.id}_{timestamp}"

        # Store certification metadata in the first log entry
        first_entry = log_entries.first()
        first_entry.certification_metadata = {
            "certification_id": certification_id,
            "initiated_by": self.user.username,
            "initiated_at": timezone.now().isoformat(),
            "total_logs": log_entries.count(),
            "notes": certification_data.get("notes", ""),
            "purpose": certification_data.get("purpose", "routine_certification"),
        }
        first_entry.save()

        return certification_id

    def _get_client_ip(self) -> str:
        """Get client IP address for audit logging"""
        # This would typically come from the request object
        # For now, return a placeholder
        return "127.0.0.1"
