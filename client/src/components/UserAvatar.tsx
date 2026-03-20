interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  email?: string | null;
  sizeClassName?: string;
  textClassName?: string;
}

const getInitial = (name?: string | null, email?: string | null): string => {
  // Fallback order: name -> email -> app name so avatar always has a stable letter.
  const source = (name && name.trim()) || (email && email.trim()) || "GatorChef";
  return source.charAt(0).toUpperCase();
};

const UserAvatar = ({
  photoUrl,
  name,
  email,
  sizeClassName = "w-8 h-8",
  textClassName = "text-sm",
}: UserAvatarProps) => {
  // If we have a real image, use it everywhere; otherwise show an initial badge.
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name} avatar` : "User avatar"}
        className={`${sizeClassName} rounded-full object-cover border border-border bg-secondary`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold ${textClassName}`}
      aria-label="User avatar"
    >
      {getInitial(name, email)}
    </div>
  );
};

export default UserAvatar;
