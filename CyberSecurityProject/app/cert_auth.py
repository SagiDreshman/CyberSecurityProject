from fastapi import Header, HTTPException
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives.asymmetric import padding
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CERTS_DIR = BASE_DIR / "certs"
CA_CERT_PATH = CERTS_DIR / "ca.crt"


def require_client_certificate(x_client_cert: str = Header(None)) -> str:
    if not x_client_cert:
        raise HTTPException(status_code=401, detail="Client certificate required (X-Client-Cert missing)")

    # ✅ מפענח את מה שהגיע מ-encodeURIComponent
    x_client_cert = urllib.parse.unquote(x_client_cert)

    # ✅ מנרמל newlines (ליתר ביטחון)
    x_client_cert = x_client_cert.replace("\\n", "\n").strip()
    pem_bytes = x_client_cert.encode("utf-8")

    # load client cert
    try:
        cert = x509.load_pem_x509_certificate(pem_bytes)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid certificate PEM")

    # load CA cert
    try:
        ca_cert = x509.load_pem_x509_certificate(CA_CERT_PATH.read_bytes())
    except Exception:
        raise HTTPException(status_code=500, detail="CA certificate not found/invalid")

    # verify signature by CA
    try:
        ca_pub = ca_cert.public_key()
        ca_pub.verify(
            cert.signature,
            cert.tbs_certificate_bytes,
            padding.PKCS1v15(),
            cert.signature_hash_algorithm,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Certificate not signed by CA")

    # extract CN
    try:
        cn = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
    except Exception:
        raise HTTPException(status_code=401, detail="Certificate missing CN")

    return cn
