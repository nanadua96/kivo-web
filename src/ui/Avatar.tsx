import styles from "./Avatar.module.css";

export type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = {
  name?: string | null;
  size?: AvatarSize;
};

export default function Avatar({ name, size = "md" }: AvatarProps) {
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";

  return (
    <span className={styles.avatar} data-size={size} aria-hidden="true">
      {initials}
    </span>
  );
}
