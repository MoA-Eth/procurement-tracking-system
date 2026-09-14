import Image from "next/image";

interface MoALogoProps {
  size?: "sm" | "md" | "lg";
}

const widths = { sm: 132, md: 190, lg: 230 } as const;

export function MoALogo({ size = "md" }: MoALogoProps) {
  const width = widths[size];
  return (
    <Image
      src="/moa-logo.png"
      alt="Ministry of Agriculture"
      width={width}
      height={Math.round((width * 2) / 3)}
      priority={size !== "sm"}
      className="moa-logo h-auto w-auto object-contain"
    />
  );
}
