import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

import notify from "../../lib/notify";
import { prepareAvatarUpload } from "../../utils/avatarUpload";
import { Button } from "../ui";
import ProfileAvatar from "./ProfileAvatar";
import "./AvatarUploadField.css";

const AvatarUploadField = ({
  name = "",
  value = "",
  label = "Profile photo",
  helperText = "Upload a photo from this device. If you skip it, the profile will use initials.",
  disabled = false,
  error = "",
  onChange,
}) => {
  const inputRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!value) {
      setSelectedFileName("");
    }
  }, [value]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const uploadedAvatar = await prepareAvatarUpload(file);
      onChange?.(uploadedAvatar.dataUrl);
      setSelectedFileName(uploadedAvatar.fileName);
    } catch (uploadError) {
      notify.error(uploadError?.message || "Could not prepare the selected image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const hasAvatar = Boolean(value);
  const title = selectedFileName || (hasAvatar ? "Profile photo ready" : "Upload a profile photo");
  const description = uploading
    ? "Optimizing the image so it stays fast and reliable in the app."
    : hasAvatar
      ? "You can replace the photo anytime or remove it to return to initials."
      : helperText;

  return (
    <div className="avatar-upload">
      <span className="avatar-upload__label">{label}</span>
      <div className="avatar-upload__card">
        <ProfileAvatar name={name || "Family member"} src={value} size="lg" className="avatar-upload__preview" />

        <div className="avatar-upload__copy">
          <strong>{title}</strong>
          <p>{description}</p>

          <div className="avatar-upload__actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              leftIcon={uploading ? <LoaderCircle size={16} className="spin" /> : <ImagePlus size={16} />}
              disabled={disabled || uploading}
            >
              {hasAvatar ? "Replace photo" : "Upload photo"}
            </Button>

            {hasAvatar ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFileName("");
                  onChange?.("");
                }}
                leftIcon={<Trash2 size={16} />}
                disabled={disabled || uploading}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        className="avatar-upload__input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {error ? <span className="ui-field__error">{error}</span> : null}
      {!error && !hasAvatar ? <span className="ui-field__helper">{helperText}</span> : null}
    </div>
  );
};

export default AvatarUploadField;
