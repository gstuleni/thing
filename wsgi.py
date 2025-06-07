from ai_server import app as application
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Production configurations
application.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
    PREFERRED_URL_SCHEME='https'
)

if __name__ == '__main__':
    # SSL certificate paths
    cert_path = os.getenv('SSL_CERT_PATH', 'certificates/cert.pem')
    key_path = os.getenv('SSL_KEY_PATH', 'certificates/key.pem')
    
    # Check if certificates exist
    if not (os.path.exists(cert_path) and os.path.exists(key_path)):
        raise RuntimeError("SSL certificates not found. Please configure proper SSL certificates.")
    
    # Run with HTTPS
    application.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        ssl_context=(cert_path, key_path)
    ) 