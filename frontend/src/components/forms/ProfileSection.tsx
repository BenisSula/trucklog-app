import React from 'react';
import { LucideIcon } from 'lucide-react';
import FormButton from './FormButton';
import { ICON_STYLES, CARD_STYLES } from '../../config/theme';

interface ProfileSectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  onSave?: () => void;
  isSaving?: boolean;
  saveButtonText?: string;
  saveButtonVariant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  title,
  icon: Icon,
  children,
  onSave,
  isSaving = false,
  saveButtonText = 'Save',
  saveButtonVariant = 'primary',
  className = ''
}) => {
  return (
    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} ${className}`}>
      <div className={CARD_STYLES.header}>
        <div className="flex items-center space-x-3 mb-3 sm:mb-0">
          {Icon && (
            <div className={ICON_STYLES.sectionHeader}>
              <Icon className={ICON_STYLES.sectionHeaderIcon} />
            </div>
          )}
          <h2 className={CARD_STYLES.title}>{title}</h2>
        </div>
        {onSave && (
          <FormButton
            type="button"
            onClick={onSave}
            disabled={isSaving}
            loading={isSaving}
            variant={saveButtonVariant}
            size="md"
            className="w-full sm:w-auto"
          >
            {saveButtonText}
          </FormButton>
        )}
      </div>
      {children}
    </div>
  );
};

export default ProfileSection;