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
    <div className={`bg-white rounded-[16px] p-5 border border-[#1d9e99] ${className}`}>
      {hasBnfUrl ? (
        <a
          href={bnfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[18px] leading-[24px] text-[#0c3555] hover:underline mb-3"
        >
          <span>{drugName}</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      ) : (
        <div className="text-[18px] leading-[24px] text-[#0c3555] mb-3">{drugName}</div>
      )}
      <ul className="space-y-2 text-[15px] leading-[22px] text-[#0c3555]">
        <li><span className="text-[#5C3E53]">Dose:</span> {dose}</li>
        <li><span className="text-[#5C3E53]">Route:</span> {route}</li>
        <li><span className="text-[#5C3E53]">Duration:</span> {duration}</li>
        {notes && <li><span className="text-[#5C3E53]">Notes:</span> {notes}</li>}
        {drugInteractions && <li><span className="text-[#5C3E53]">Drug Interactions:</span> {drugInteractions}</li>}
      </ul>
    </div>
  );
}
