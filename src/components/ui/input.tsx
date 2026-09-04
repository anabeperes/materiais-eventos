import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-borda bg-white px-3 text-sm text-texto placeholder:text-texto-suave/70 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/20 disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "h-10", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-texto", className)} {...props} />;
}
