from OpenSSL import crypto
import os

def generate_self_signed_cert():
    """Generate self-signed certificates for development."""
    # Generate key
    key = crypto.PKey()
    key.generate_key(crypto.TYPE_RSA, 2048)

    # Generate certificate
    cert = crypto.X509()
    cert.get_subject().C = "US"
    cert.get_subject().ST = "Development"
    cert.get_subject().L = "Development"
    cert.get_subject().O = "ScholarAI Development"
    cert.get_subject().OU = "Development"
    cert.get_subject().CN = "localhost"

    # Set certificate details
    cert.set_serial_number(1000)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(365*24*60*60)  # Valid for one year
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(key)
    cert.sign(key, 'sha256')

    # Create certificates directory if it doesn't exist
    cert_dir = 'certificates'
    if not os.path.exists(cert_dir):
        os.makedirs(cert_dir)

    # Write certificate and private key to files
    with open(os.path.join(cert_dir, 'cert.pem'), "wb") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
    
    with open(os.path.join(cert_dir, 'key.pem'), "wb") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, key))

    print("Self-signed certificates generated successfully in 'certificates' directory")
    print("WARNING: These certificates are for development only. Use proper SSL certificates in production.")

if __name__ == '__main__':
    generate_self_signed_cert() 