import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({ 
  children, 
  className = "", 
  hover = false,
  padding = "md" 
}: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      className={`bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm ${
        hover ? "card-hover" : ""
      } ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
