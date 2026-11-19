import React from 'react';
import { BLUEPRINT_LIMITS } from '../types/numera';

interface ParticipantContactFieldsProps {
  telefone: string;
  whatsapp: string;
  sameAsPhone: boolean;
  onTelefoneChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onSameAsPhoneChange: (checked: boolean) => void;
  compact?: boolean;
}

export const ParticipantContactFields: React.FC<
  ParticipantContactFieldsProps
> = ({
  telefone,
  whatsapp,
  sameAsPhone,
  onTelefoneChange,
  onWhatsappChange,
  onSameAsPhoneChange,
  compact = false,
}) => {
  const inputBg = compact ? 'bg-white' : 'bg-white';
  const displayedWhatsapp = sameAsPhone ? telefone : whatsapp;

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}
      >
        <div>
          {!compact && (
            <label className="block text-xs font-medium text-[#374151]">
              Telefone
            </label>
          )}
          <input
            type="text"
            maxLength={BLUEPRINT_LIMITS.TELEFONE_MAX}
            value={telefone}
            onChange={(e) => {
              const nextVal = e.target.value;
              onTelefoneChange(nextVal);
              if (sameAsPhone) {
                onWhatsappChange(nextVal);
              }
            }}
            placeholder={compact ? 'Telefone' : '(11) 99999-9999'}
            className={`${compact ? 'py-2 px-3' : 'mt-1.5 px-3.5 py-2.5'} w-full rounded-xl border border-[#D8D5CD] ${inputBg} text-sm text-[#14171A] placeholder:text-[#8E9299] focus:border-emerald-700 focus:outline-none`}
          />
        </div>

        <div>
          {!compact && (
            <label className="block text-xs font-medium text-[#374151]">
              WhatsApp
            </label>
          )}
          <input
            type="text"
            maxLength={BLUEPRINT_LIMITS.TELEFONE_MAX}
            disabled={sameAsPhone}
            value={displayedWhatsapp}
            onChange={(e) => onWhatsappChange(e.target.value)}
            placeholder={
              sameAsPhone
                ? 'Mesmo número do telefone'
                : compact
                  ? 'WhatsApp (opcional)'
                  : '5511999999999'
            }
            className={`${compact ? 'py-2 px-3' : 'mt-1.5 px-3.5 py-2.5'} w-full rounded-xl border border-[#D8D5CD] text-sm focus:border-emerald-700 focus:outline-none ${
              sameAsPhone
                ? 'cursor-not-allowed bg-[#F3F1EC] text-[#64686E]'
                : `${inputBg} text-[#14171A] placeholder:text-[#8E9299]`
            }`}
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-[#374151] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sameAsPhone}
          onChange={(e) => {
            const checked = e.target.checked;
            onSameAsPhoneChange(checked);
            if (checked) {
              onWhatsappChange(telefone);
            }
          }}
          className="h-4 w-4 rounded border-[#D8D5CD] text-emerald-700 focus:ring-emerald-700"
        />
        <span>WhatsApp é o mesmo número do telefone</span>
      </label>
    </div>
  );
};
