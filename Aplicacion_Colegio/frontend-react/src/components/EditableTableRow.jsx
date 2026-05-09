import { useState } from 'react';

export default function EditableTableRow({ renderView, renderEdit, onSave, onCancel, defaultEditing = false }) {
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(data) {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(data);
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    if (onCancel) onCancel();
  }

  if (isEditing) {
    return (
      <tr className="editable-row-editing">
        {renderEdit({ onSave: handleSave, onCancel: handleCancel, isSaving })}
      </tr>
    );
  }

  return (
    <tr className="editable-row-view">
      {renderView({ onEdit: () => setIsEditing(true) })}
    </tr>
  );
}
