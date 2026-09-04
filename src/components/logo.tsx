import Image from "next/image";

export function Logo({ tamanho = 28, className }: { tamanho?: number; className?: string }) {
  return <Image src="/logo.svg" alt="Logo" width={tamanho} height={tamanho} priority className={className} />;
}
