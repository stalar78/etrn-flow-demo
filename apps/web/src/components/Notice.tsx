import type { ReactNode } from "react";

type NoticeProps = {
  children: ReactNode;
  tone?: "error" | "success" | "info";
};

export function Notice({ children, tone = "info" }: NoticeProps) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
