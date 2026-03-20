import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, ChevronDown, ChevronUp, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";

const MAX_OUTPUT_SIZE = 512;
const MIN_PASSWORD_LENGTH = 6;

const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                resolve(result);
            } else {
                reject(new Error("Failed to read selected image."));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read selected image."));
        reader.readAsDataURL(file);
    });

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load image for cropping."));
        image.src = url;
    });

const getCroppedAvatarDataUrl = async (imageSrc: string, cropPixels: Area): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = MAX_OUTPUT_SIZE;
    canvas.height = MAX_OUTPUT_SIZE;
    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Failed to initialize image editor.");
    }

    context.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        MAX_OUTPUT_SIZE,
        MAX_OUTPUT_SIZE,
    );

    return canvas.toDataURL("image/jpeg", 0.92);
};

const Profile = () => {
    const { user, profile, updateUserProfile, changePassword } = useAuth();
    const [isEditingName, setIsEditingName] = useState(false);
    const [draftName, setDraftName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isCropOpen, setIsCropOpen] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const displayName = useMemo(
        () => profile?.display_name || user?.displayName || "GatorChef User",
        [profile?.display_name, user?.displayName],
    );

    const email = profile?.email || user?.email || "No email available";
    const photoUrl = profile?.photo_url ?? user?.photoURL ?? null;

    useEffect(() => {
        setDraftName(displayName);
    }, [displayName]);

    const handleNameSave = async () => {
        const nextName = draftName.trim();
        if (!nextName) {
            toast.error("Name cannot be empty.");
            return;
        }

        try {
            setIsSaving(true);
            await updateUserProfile({
                displayName: nextName,
                photoUrl,
            });
            toast.success("Name updated.");
            setIsEditingName(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update your name.";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    // Reset cropper state so each new upload starts clean.
    const closeCropper = () => {
        setIsCropOpen(false);
        setSelectedImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            return;
        }

        if (!selectedFile.type.startsWith("image/")) {
            toast.error("Please choose an image file.");
            event.target.value = "";
            return;
        }

        try {
            const dataUrl = await readFileAsDataUrl(selectedFile);
            setSelectedImageSrc(dataUrl);
            setIsCropOpen(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to open selected image.";
            toast.error(message);
        } finally {
            event.target.value = "";
        }
    };

    const handleCropSave = async () => {
        if (!selectedImageSrc || !croppedAreaPixels) {
            toast.error("Please adjust the image before saving.");
            return;
        }

        try {
            setIsUploadingImage(true);
            const croppedDataUrl = await getCroppedAvatarDataUrl(selectedImageSrc, croppedAreaPixels);
            await updateUserProfile({
                displayName,
                photoUrl: croppedDataUrl,
            });
            toast.success("Profile photo updated.");
            closeCropper();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update profile photo.";
            toast.error(message);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handlePasswordSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all password fields.");
            return;
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation do not match.");
            return;
        }

        try {
            setIsChangingPassword(true);
            await changePassword(currentPassword, newPassword);
            toast.success("Password updated.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordForm(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to change password.";
            toast.error(message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <>
            <div className="pt-4 space-y-6">
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative">
                        <UserAvatar
                            photoUrl={photoUrl}
                            name={displayName}
                            email={email}
                            sizeClassName="w-20 h-20"
                            textClassName="text-2xl"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage || isSaving || isChangingPassword}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow disabled:opacity-50"
                            title="Upload profile photo"
                        >
                            <Camera size={14} className="text-primary-foreground" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoSelected}
                        />
                    </div>

                    <div className="w-full bg-card border border-border rounded-xl p-3">
                        <button
                            onClick={() => setIsEditingName((prev) => !prev)}
                            className="w-full flex items-center justify-between tap-highlight-none"
                        >
                            <div className="text-left">
                                <p className="text-xs text-muted-foreground">Display name</p>
                                <p className="font-semibold text-foreground">{displayName}</p>
                            </div>
                            {isEditingName ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                            ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                            )}
                        </button>

                        {isEditingName && (
                            <div className="mt-3 space-y-2">
                                <input
                                    type="text"
                                    value={draftName}
                                    onChange={(event) => setDraftName(event.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleNameSave}
                                        disabled={isSaving}
                                        className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        Save Name
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDraftName(displayName);
                                            setIsEditingName(false);
                                        }}
                                        disabled={isSaving}
                                        className="flex-1 bg-secondary border border-border text-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Account</p>
                    <div className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-card border border-border">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                            <Mail size={15} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <p className="text-xs text-muted-foreground break-all">{email}</p>
                        </div>
                    </div>

                    <div className="w-full bg-card border border-border rounded-xl p-3">
                        <button
                            onClick={() => setShowPasswordForm((prev) => !prev)}
                            className="w-full flex items-center justify-between tap-highlight-none"
                        >
                            <div className="text-left flex items-center gap-2">
                                <KeyRound size={14} className="text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Change password</p>
                                    <p className="text-xs text-muted-foreground">Update your account password</p>
                                </div>
                            </div>
                            {showPasswordForm ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                            ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                            )}
                        </button>

                        {showPasswordForm && (
                            <div className="mt-3 space-y-2">
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    placeholder="Current password"
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    placeholder="New password"
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    onClick={handlePasswordSave}
                                    disabled={isChangingPassword}
                                    className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    Save Password
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BottomSheet
                isOpen={isCropOpen}
                onClose={closeCropper}
                title="Adjust Profile Photo"
            >
                <div className="space-y-4">
                    {/* Circular crop keeps avatars consistent across top bar, drawer, and profile. */}
                    <div className="relative h-72 rounded-xl overflow-hidden bg-secondary">
                        {selectedImageSrc && (
                            <Cropper
                                image={selectedImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                            />
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Zoom</p>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(event) => setZoom(Number(event.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* Keep the footer actions obvious: back out or commit the crop. */}
                    <div className="flex gap-2">
                        <button
                            onClick={closeCropper}
                            disabled={isUploadingImage}
                            className="flex-1 bg-secondary border border-border text-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => void handleCropSave()}
                            disabled={isUploadingImage}
                            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Save Photo
                        </button>
                    </div>
                </div>
            </BottomSheet>
        </>
    );
};

export default Profile;
