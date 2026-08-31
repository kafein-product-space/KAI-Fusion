import boto3
import json
import re
from typing import Any, Dict, List, Optional
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


_AWS_S3_ENDPOINT_RE = re.compile(
    r"^s3(?:[.-](?:(?:dualstack)[.-])?(?P<region>[a-z0-9-]+))?"
    r"\.amazonaws\.com(?:\.cn)?(?::\d+)?$",
    re.IGNORECASE,
)

class MinioService:
    """S3-compatible object storage client using boto3.
    
    This service is designed to work with MinIO or any S3-compatible API.
    It takes credentials dynamically rather than relying on environment variables,
    allowing users to specify different MinIO credentials per node via the 
    KAI-Flow Credential Service.
    """

    @staticmethod
    def _normalize_endpoint(endpoint: str) -> str:
        """Return an endpoint host suitable for constructing an S3 URL."""
        normalized = str(endpoint or "").strip()
        if normalized.startswith("http://"):
            normalized = normalized[7:]
        elif normalized.startswith("https://"):
            normalized = normalized[8:]
        return normalized.rstrip("/")

    @classmethod
    def _infer_region(cls, endpoint: str) -> Optional[str]:
        """Infer an AWS region from a regional S3 endpoint when possible."""
        match = _AWS_S3_ENDPOINT_RE.fullmatch(cls._normalize_endpoint(endpoint))
        return match.group("region") if match else None

    def get_client(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        use_ssl: bool = False,
        region_name: Optional[str] = None,
    ):
        """Initialize and return a boto3 S3 client with the provided credentials."""
        normalized_endpoint = self._normalize_endpoint(endpoint)
        protocol = "https" if use_ssl else "http"
        endpoint_url = f"{protocol}://{normalized_endpoint}"
        resolved_region = str(region_name or "").strip() or self._infer_region(
            normalized_endpoint
        )
        
        try:
            client_kwargs = {
                "endpoint_url": endpoint_url,
                "aws_access_key_id": access_key,
                "aws_secret_access_key": secret_key,
                # For MinIO, we typically need addressing style path rather than virtual-hosted
                "config": boto3.session.Config(signature_version="s3v4"),
            }
            if resolved_region:
                # AWS rejects requests signed for us-east-1 when a regional
                # bucket is in another region. MinIO ignores this optional value.
                client_kwargs["region_name"] = resolved_region

            client = boto3.client("s3", **client_kwargs)
            return client
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {str(e)}")
            raise ValueError(f"Failed to connect to MinIO: {str(e)}")

    def ensure_bucket(self, client, bucket: str) -> None:
        """Ensure the specified bucket exists, create if it doesn't."""
        try:
            client.head_bucket(Bucket=bucket)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                try:
                    logger.info(f"Bucket {bucket} does not exist, creating it.")
                    client.create_bucket(Bucket=bucket)
                except Exception as create_error:
                    logger.error(f"Failed to create bucket {bucket}: {str(create_error)}")
                    raise ValueError(f"Could not create bucket '{bucket}': {str(create_error)}")
            else:
                logger.error(f"Error checking bucket {bucket}: {str(e)}")
                raise

    def download_dataset(self, client, bucket: str, key: str) -> Dict[str, Any]:
        """Download and parse a JSON dataset from MinIO."""
        try:
            self.ensure_bucket(client, bucket)
            response = client.get_object(Bucket=bucket, Key=key)
            content = response['Body'].read().decode('utf-8')
            return json.loads(content)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == 'NoSuchKey':
                raise ValueError(f"Dataset '{key}' not found in bucket '{bucket}'")
            raise ValueError(f"MinIO error: {str(e)}")
        except json.JSONDecodeError:
            raise ValueError(f"Dataset '{key}' is not a valid JSON file")
        except Exception as e:
            logger.error(f"Failed to download dataset {key}: {str(e)}")
            raise

    def upload_dataset(self, client, bucket: str, key: str, payload: Dict[str, Any]) -> str:
        """Upload a JSON dataset to MinIO."""
        try:
            self.ensure_bucket(client, bucket)
            json_data = json.dumps(payload, indent=2).encode('utf-8')
            client.put_object(
                Bucket=bucket,
                Key=key,
                Body=json_data,
                ContentType='application/json'
            )
            return key
        except Exception as e:
            logger.error(f"Failed to upload dataset {key}: {str(e)}")
            raise ValueError(f"Failed to upload dataset to MinIO: {str(e)}")

minio_service = MinioService()
