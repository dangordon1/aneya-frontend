import { ExternalLink } from 'lucide-react';

interface MedicationBoxProps {
  drugName: string;
  dose: string;
  route: string;
  duration: string;
  notes?: string;
  drugInteractions?: string;
  bnfUrl?: string;
  className?: string;
}

export function MedicationBox({
  drugName,
  dose,
  route,
  duration,
  notes,
  drugInteractions,
  bnfUrl,
  className = ''
}: MedicationBoxProps) {
  const hasBnfUrl = bnfUrl && bnfUrl !== '#';

  return (
    <div className={`bg-white rounded-[16px] p-5 border border-aneya-soft-pink ${className}`}>
      {hasBnfUrl ? (
        <a
          href={bnfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[18px] leading-[24px] text-aneya-navy hover:underline mb-3"
        >
          <span>{drugName}</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      ) : (
        <div className="text-[18px] leading-[24px] text-aneya-navy mb-3">{drugName}</div>
      )}
      <ul className="space-y-2 text-[15px] leading-[22px] text-aneya-navy">
        <li><span className="text-aneya-text-secondary">Dose:</span> {dose}</li>
        <li><span className="text-aneya-text-secondary">Route:</span> {route}</li>
        <li><span className="text-aneya-text-secondary">Duration:</span> {duration}</li>
        {notes && <li><span className="text-aneya-text-secondary">Notes:</span> {notes}</li>}
        {drugInteractions && <li><span className="text-aneya-text-secondary">Drug Interactions:</span> {drugInteractions}</li>}
      </ul>
    </div>
  );
}
