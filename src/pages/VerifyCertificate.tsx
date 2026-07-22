import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react';
import { verifyCertificate, certificatePdfUrl, type CertificateInfo } from '@/lib/api/certificates';

const VerifyCertificate = () => {
  const { certId } = useParams<{ certId: string }>();
  const [cert, setCert] = useState<CertificateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!certId) return;
    verifyCertificate(certId)
      .then(setCert)
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [certId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold text-gradient">Resumeness</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          {isLoading && <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />}

          {!isLoading && (notFound || !cert) && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Certificate not found</h1>
              <p className="text-sm text-muted-foreground">
                This certificate ID doesn't match any record we've issued.
              </p>
            </>
          )}

          {!isLoading && cert && (
            <>
              {cert.valid ? (
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
              ) : (
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              )}
              <h1 className="text-xl font-semibold mb-1">
                {cert.valid ? 'Verified' : 'Invalid — tampered or corrupted record'}
              </h1>
              <p className="text-base text-foreground mt-4">{cert.skillTitle}</p>
              <p className="text-3xl font-bold text-primary mt-1">{cert.score}%</p>
              <p className="text-xs text-muted-foreground mt-2">
                Issued {new Date(cert.issuedAt).toLocaleDateString()}
              </p>
              {cert.valid && (
                <a
                  href={certificatePdfUrl(cert.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-6 text-sm text-primary hover:underline"
                >
                  View PDF
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
